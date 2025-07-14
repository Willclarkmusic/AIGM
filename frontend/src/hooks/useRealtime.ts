import { useEffect, useRef, useState } from 'react'
import { Realtime, Types } from 'ably'
import { RealtimeEventType, RealtimeEvent } from '@shared/types'
import { channelNames } from '@shared/utils'

interface UseRealtimeOptions {
  authUrl?: string
  clientId?: string
}

export function useRealtime(options: UseRealtimeOptions = {}) {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionState, setConnectionState] = useState<string>('disconnected')
  const clientRef = useRef<Realtime | null>(null)

  useEffect(() => {
    // Initialize Ably client
    const client = new Realtime({
      authUrl: options.authUrl || '/api/v1/auth/ably-token',
      clientId: options.clientId,
    })

    clientRef.current = client

    // Connection state listeners
    client.connection.on('connected', () => {
      setIsConnected(true)
      setConnectionState('connected')
    })

    client.connection.on('disconnected', () => {
      setIsConnected(false)
      setConnectionState('disconnected')
    })

    client.connection.on('failed', () => {
      setIsConnected(false)
      setConnectionState('failed')
    })

    return () => {
      client.close()
    }
  }, [options.authUrl, options.clientId])

  const subscribeToRoom = (
    serverId: string,
    roomId: string,
    callback: (event: RealtimeEvent) => void
  ) => {
    if (!clientRef.current) return

    const channelName = channelNames.room(serverId, roomId)
    const channel = clientRef.current.channels.get(channelName)

    const handleMessage = (message: Types.Message) => {
      callback({
        type: message.name as RealtimeEventType,
        data: message.data,
        timestamp: new Date(message.timestamp!).toISOString(),
        user_id: message.clientId,
      })
    }

    // Subscribe to all room events
    Object.values(RealtimeEventType).forEach(eventType => {
      if (eventType.startsWith('message.') || eventType.startsWith('reaction.') || 
          eventType.startsWith('user.') || eventType.startsWith('typing.')) {
        channel.subscribe(eventType, handleMessage)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }

  const subscribeToUser = (
    userId: string,
    callback: (event: RealtimeEvent) => void
  ) => {
    if (!clientRef.current) return

    const channelName = channelNames.user(userId)
    const channel = clientRef.current.channels.get(channelName)

    const handleMessage = (message: Types.Message) => {
      callback({
        type: message.name as RealtimeEventType,
        data: message.data,
        timestamp: new Date(message.timestamp!).toISOString(),
        user_id: message.clientId,
      })
    }

    // Subscribe to user events
    Object.values(RealtimeEventType).forEach(eventType => {
      if (eventType.startsWith('friend.')) {
        channel.subscribe(eventType, handleMessage)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }

  const subscribeToDirectMessage = (
    conversationId: string,
    callback: (event: RealtimeEvent) => void
  ) => {
    if (!clientRef.current) return

    const channelName = channelNames.directMessage(conversationId)
    const channel = clientRef.current.channels.get(channelName)

    const handleMessage = (message: Types.Message) => {
      callback({
        type: message.name as RealtimeEventType,
        data: message.data,
        timestamp: new Date(message.timestamp!).toISOString(),
        user_id: message.clientId,
      })
    }

    // Subscribe to DM events
    Object.values(RealtimeEventType).forEach(eventType => {
      if (eventType.startsWith('message.') || eventType.startsWith('reaction.') || 
          eventType.startsWith('typing.')) {
        channel.subscribe(eventType, handleMessage)
      }
    })

    return () => {
      channel.unsubscribe()
    }
  }

  const publishTyping = (serverId: string, roomId: string, isTyping: boolean) => {
    if (!clientRef.current) return

    const channelName = channelNames.room(serverId, roomId)
    const channel = clientRef.current.channels.get(channelName)

    const eventType = isTyping ? RealtimeEventType.TYPING_START : RealtimeEventType.TYPING_STOP
    channel.publish(eventType, {
      room_id: roomId,
      timestamp: new Date().toISOString(),
    })
  }

  return {
    isConnected,
    connectionState,
    subscribeToRoom,
    subscribeToUser,
    subscribeToDirectMessage,
    publishTyping,
  }
}