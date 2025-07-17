// Ably Presence Hooks for Friend Status
import { useEffect, useState, useCallback } from 'react'
import * as Ably from 'ably'
import { useAbly } from '../contexts/AblyContext'

// Types
export interface FriendStatus {
  userId: string
  userName: string
  isOnline: boolean
  lastSeen?: Date
  status?: 'online' | 'away' | 'busy' | 'offline'
  customStatus?: string
}

export interface GlobalPresence {
  [userId: string]: FriendStatus
}

// Hook for global friend presence tracking
export const useAblyPresence = (friendIds: string[] = []) => {
  const { client, isConnected } = useAbly()
  const [presenceChannel, setPresenceChannel] = useState<Ably.RealtimeChannel | null>(null)
  const [friendsStatus, setFriendsStatus] = useState<GlobalPresence>({})
  const [currentUserStatus, setCurrentUserStatus] = useState<FriendStatus['status']>('online')
  const [isPresenceActive, setIsPresenceActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize global presence channel
  useEffect(() => {
    if (!client || !isConnected) {
      setPresenceChannel(null)
      setIsPresenceActive(false)
      return
    }

    try {
      console.log('Initializing global presence channel')
      const channel = client.channels.get('global-presence')
      setPresenceChannel(channel)
      setError(null)
    } catch (err) {
      console.error('Failed to initialize presence channel:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize presence')
    }
  }, [client, isConnected])

  // Subscribe to presence events
  useEffect(() => {
    if (!presenceChannel) return

    const handlePresenceEnter = (member: Ably.PresenceMessage) => {
      if (!member.clientId) return

      console.log('Friend came online:', member.data)
      setFriendsStatus(prev => ({
        ...prev,
        [member.clientId!]: {
          userId: member.clientId!,
          userName: member.data?.userName || member.clientId!,
          isOnline: true,
          status: member.data?.status || 'online',
          customStatus: member.data?.customStatus
        }
      }))
    }

    const handlePresenceLeave = (member: Ably.PresenceMessage) => {
      if (!member.clientId) return

      console.log('Friend went offline:', member.data)
      setFriendsStatus(prev => ({
        ...prev,
        [member.clientId!]: {
          ...prev[member.clientId!],
          isOnline: false,
          status: 'offline',
          lastSeen: new Date()
        }
      }))
    }

    const handlePresenceUpdate = (member: Ably.PresenceMessage) => {
      if (!member.clientId) return

      console.log('Friend status updated:', member.data)
      setFriendsStatus(prev => ({
        ...prev,
        [member.clientId!]: {
          userId: member.clientId!,
          userName: member.data?.userName || member.clientId!,
          isOnline: true,
          status: member.data?.status || 'online',
          customStatus: member.data?.customStatus
        }
      }))
    }

    // Subscribe to presence events
    presenceChannel.presence.subscribe('enter', handlePresenceEnter)
    presenceChannel.presence.subscribe('leave', handlePresenceLeave)
    presenceChannel.presence.subscribe('update', handlePresenceUpdate)

    // Enter presence for current user
    const enterPresence = async () => {
      try {
        await presenceChannel.presence.enter({
          userName: 'Current User', // TODO: Get from auth context
          status: currentUserStatus,
          joinedAt: new Date().toISOString()
        })
        setIsPresenceActive(true)
        console.log('Entered global presence')
      } catch (err) {
        console.error('Failed to enter presence:', err)
        setError(err instanceof Error ? err.message : 'Failed to enter presence')
      }
    }

    enterPresence()

    // Get current presence members
    const getCurrentPresence = async () => {
      try {
        const members = await presenceChannel.presence.get()
        const currentPresence: GlobalPresence = {}
        
        members.forEach(member => {
          if (member.clientId) {
            currentPresence[member.clientId] = {
              userId: member.clientId,
              userName: member.data?.userName || member.clientId,
              isOnline: true,
              status: member.data?.status || 'online',
              customStatus: member.data?.customStatus
            }
          }
        })
        
        setFriendsStatus(currentPresence)
        console.log('Current presence members:', currentPresence)
      } catch (err) {
        console.error('Failed to get current presence:', err)
      }
    }

    getCurrentPresence()

    return () => {
      console.log('Unsubscribing from presence')
      presenceChannel.presence.unsubscribe('enter', handlePresenceEnter)
      presenceChannel.presence.unsubscribe('leave', handlePresenceLeave)
      presenceChannel.presence.unsubscribe('update', handlePresenceUpdate)
      presenceChannel.presence.leave()
      setIsPresenceActive(false)
    }
  }, [presenceChannel, currentUserStatus])

  // Update user status
  const updateStatus = useCallback(async (
    status: FriendStatus['status'], 
    customStatus?: string
  ) => {
    if (!presenceChannel || !isPresenceActive) return

    try {
      setCurrentUserStatus(status)
      
      await presenceChannel.presence.update({
        userName: 'Current User', // TODO: Get from auth context
        status,
        customStatus,
        updatedAt: new Date().toISOString()
      })

      console.log('Status updated:', status, customStatus)
    } catch (err) {
      console.error('Failed to update status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }, [presenceChannel, isPresenceActive])

  // Get filtered friends status
  const getFriendsStatus = useCallback(() => {
    if (friendIds.length === 0) return friendsStatus

    const filteredStatus: GlobalPresence = {}
    friendIds.forEach(friendId => {
      if (friendsStatus[friendId]) {
        filteredStatus[friendId] = friendsStatus[friendId]
      }
    })
    return filteredStatus
  }, [friendsStatus, friendIds])

  // Handle app visibility for mobile optimization
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!presenceChannel || !isPresenceActive) return

      if (document.hidden) {
        // App went to background
        updateStatus('away')
      } else {
        // App came to foreground
        updateStatus('online')
      }
    }

    const handleFocus = () => {
      if (presenceChannel && isPresenceActive) {
        updateStatus('online')
      }
    }

    const handleBlur = () => {
      if (presenceChannel && isPresenceActive) {
        updateStatus('away')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [presenceChannel, isPresenceActive, updateStatus])

  return {
    friendsStatus: getFriendsStatus(),
    currentUserStatus,
    isPresenceActive,
    error,
    updateStatus
  }
}

// Hook for individual friend status
export const useFriendStatus = (friendId: string) => {
  const { friendsStatus } = useAblyPresence([friendId])
  
  return {
    friend: friendsStatus[friendId] || null,
    isOnline: friendsStatus[friendId]?.isOnline || false,
    status: friendsStatus[friendId]?.status || 'offline',
    lastSeen: friendsStatus[friendId]?.lastSeen
  }
}