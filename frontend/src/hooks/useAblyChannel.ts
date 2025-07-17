// Ably Channel Hooks for AIGM
import { useEffect, useState, useCallback, useRef } from 'react'
import * as Ably from 'ably'
import { useAbly } from '../contexts/AblyContext'

// Types
export interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: Date
  roomId: string
  attachments?: Array<{
    id: string
    name: string
    size: number
    type: string
    url: string
  }>
  optimistic?: boolean
}

export interface TypingIndicator {
  userId: string
  userName: string
  timestamp: Date
}

export interface UserPresence {
  userId: string
  userName: string
  isOnline: boolean
  lastSeen?: Date
}

// Hook for channel subscriptions with real-time messaging
export const useAblyChannel = (channelName: string) => {
  const { client, isConnected } = useAbly()
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [presenceUsers, setPresenceUsers] = useState<UserPresence[]>([])
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Typing debounce ref
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)

  // Initialize channel
  useEffect(() => {
    if (!client || !isConnected || !channelName) {
      setChannel(null)
      setIsSubscribed(false)
      return
    }

    try {
      console.log(`Initializing channel: ${channelName}`)
      const newChannel = client.channels.get(channelName)
      setChannel(newChannel)
      setError(null)
    } catch (err) {
      console.error('Failed to initialize channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize channel')
    }
  }, [client, isConnected, channelName])

  // Subscribe to channel events
  useEffect(() => {
    if (!channel) return

    const handleMessage = (message: Ably.Message) => {
      try {
        const messageData = message.data as Message
        console.log('Received message:', messageData)
        
        setMessages(prev => {
          // Remove optimistic version if exists
          const withoutOptimistic = prev.filter(m => 
            !(m.optimistic && m.id === messageData.id)
          )
          
          // Add new message if not already exists
          if (!withoutOptimistic.find(m => m.id === messageData.id)) {
            return [...withoutOptimistic, {
              ...messageData,
              timestamp: new Date(messageData.timestamp),
              optimistic: false
            }].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
          }
          
          return withoutOptimistic
        })
      } catch (err) {
        console.error('Error handling message:', err)
      }
    }

    const handleTyping = (message: Ably.Message) => {
      try {
        const typingData = message.data as TypingIndicator
        console.log('Typing indicator:', typingData)
        
        setTypingUsers(prev => {
          const filtered = prev.filter(t => t.userId !== typingData.userId)
          return [...filtered, {
            ...typingData,
            timestamp: new Date()
          }]
        })

        // Remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => 
            prev.filter(t => t.userId !== typingData.userId || 
              Date.now() - new Date(t.timestamp).getTime() < 3000
            )
          )
        }, 3000)
      } catch (err) {
        console.error('Error handling typing indicator:', err)
      }
    }

    const handleStopTyping = (message: Ably.Message) => {
      try {
        const { userId } = message.data
        setTypingUsers(prev => prev.filter(t => t.userId !== userId))
      } catch (err) {
        console.error('Error handling stop typing:', err)
      }
    }

    // Subscribe to events
    channel.subscribe('message', handleMessage)
    channel.subscribe('typing', handleTyping)
    channel.subscribe('stop-typing', handleStopTyping)

    setIsSubscribed(true)
    console.log(`Subscribed to channel: ${channelName}`)

    // Cleanup
    return () => {
      console.log(`Unsubscribing from channel: ${channelName}`)
      channel.unsubscribe('message', handleMessage)
      channel.unsubscribe('typing', handleTyping)
      channel.unsubscribe('stop-typing', handleStopTyping)
      setIsSubscribed(false)
    }
  }, [channel, channelName])

  // Presence management
  useEffect(() => {
    if (!channel) return

    const handlePresenceEnter = (member: Ably.PresenceMessage) => {
      console.log('User entered:', member.data)
      setPresenceUsers(prev => {
        const filtered = prev.filter(u => u.userId !== member.clientId)
        return [...filtered, {
          userId: member.clientId!,
          userName: member.data?.userName || member.clientId!,
          isOnline: true
        }]
      })
    }

    const handlePresenceLeave = (member: Ably.PresenceMessage) => {
      console.log('User left:', member.data)
      setPresenceUsers(prev => 
        prev.map(u => 
          u.userId === member.clientId 
            ? { ...u, isOnline: false, lastSeen: new Date() }
            : u
        )
      )
    }

    const handlePresenceUpdate = (member: Ably.PresenceMessage) => {
      console.log('User updated:', member.data)
      setPresenceUsers(prev => {
        const filtered = prev.filter(u => u.userId !== member.clientId)
        return [...filtered, {
          userId: member.clientId!,
          userName: member.data?.userName || member.clientId!,
          isOnline: true
        }]
      })
    }

    // Subscribe to presence
    channel.presence.subscribe('enter', handlePresenceEnter)
    channel.presence.subscribe('leave', handlePresenceLeave)
    channel.presence.subscribe('update', handlePresenceUpdate)

    // Enter presence
    channel.presence.enter({
      userName: 'Current User', // TODO: Get from auth context
      joinedAt: new Date().toISOString()
    })

    return () => {
      channel.presence.unsubscribe('enter', handlePresenceEnter)
      channel.presence.unsubscribe('leave', handlePresenceLeave)
      channel.presence.unsubscribe('update', handlePresenceUpdate)
      channel.presence.leave()
    }
  }, [channel])

  // Send message with optimistic updates
  const sendMessage = useCallback(async (content: string, attachments?: Message['attachments']) => {
    console.log('📨 useAblyChannel sendMessage called', { 
      content: content.substring(0, 50) + '...', 
      hasChannel: !!channel, 
      channelName,
      clientId: client?.auth.clientId 
    })
    
    if (!channel || !content.trim()) {
      console.log('📨 sendMessage early return: no channel or empty content')
      return
    }

    const optimisticMessage: Message = {
      id: `optimistic-${Date.now()}`,
      content: content.trim(),
      senderId: client?.auth.clientId || 'unknown',
      senderName: 'You', // TODO: Get from auth context
      timestamp: new Date(),
      roomId: channelName,
      attachments,
      optimistic: true
    }

    console.log('📨 Adding optimistic message:', optimisticMessage)
    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])

    try {
      const finalMessage = {
        ...optimisticMessage,
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        optimistic: false
      }
      
      console.log('📨 Publishing message to channel:', finalMessage)
      // Send to server
      await channel.publish('message', finalMessage)

      console.log('📨 Message sent successfully via channel.publish')
    } catch (err) {
      console.error('📨 Failed to send message:', err)
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id))
      
      // Show error to user
      setError(err instanceof Error ? err.message : 'Failed to send message')
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000)
    }
  }, [channel, channelName, client])

  // Typing indicators with debouncing
  const sendTypingIndicator = useCallback(() => {
    if (!channel || !client?.auth.clientId) return

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Send typing indicator if not already typing
    if (!isTypingRef.current) {
      channel.publish('typing', {
        userId: client.auth.clientId,
        userName: 'Current User' // TODO: Get from auth context
      })
      isTypingRef.current = true
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      if (channel && client?.auth.clientId) {
        channel.publish('stop-typing', {
          userId: client.auth.clientId
        })
        isTypingRef.current = false
      }
    }, 1000) // Stop typing after 1 second of inactivity
  }, [channel, client])

  const stopTyping = useCallback(() => {
    if (!channel || !client?.auth.clientId) return

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTypingRef.current) {
      channel.publish('stop-typing', {
        userId: client.auth.clientId
      })
      isTypingRef.current = false
    }
  }, [channel, client])

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  return {
    channel,
    messages,
    typingUsers,
    presenceUsers,
    isSubscribed,
    error,
    sendMessage,
    sendTypingIndicator,
    stopTyping
  }
}