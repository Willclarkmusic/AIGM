// Ably Real-time Context for AIGM
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import * as Ably from 'ably'

// Types
export interface AblyContextType {
  client: Ably.Realtime | null
  connectionState: Ably.ConnectionState
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  reconnect: () => void
}

export interface AblyProviderProps {
  children: ReactNode
  authUrl?: string
  clientId?: string
}

// Create context
const AblyContext = createContext<AblyContextType | undefined>(undefined)

// Ably Provider Component
export const AblyProvider: React.FC<AblyProviderProps> = ({ 
  children, 
  authUrl = '/api/ably/auth',
  clientId 
}) => {
  const [client, setClient] = useState<Ably.Realtime | null>(null)
  const [connectionState, setConnectionState] = useState<Ably.ConnectionState>('initialized')
  const [error, setError] = useState<string | null>(null)

  const isConnected = connectionState === 'connected'
  const isConnecting = connectionState === 'connecting' || connectionState === 'initialized'

  // Initialize Ably client
  useEffect(() => {
    let ablyClient: Ably.Realtime | null = null

    const initializeAbly = async () => {
      try {
        setError(null)
        setConnectionState('connecting')

        // Create Ably client for demo mode
        // This will simulate real-time functionality locally without requiring Ably credentials
        console.log('🧪 Demo Mode: Simulating Ably connection')
        
        // Create a mock Ably client for demo purposes
        const mockClient = {
          connection: {
            state: 'connected',
            on: (event: string, callback: Function) => {
              if (event === 'connected') {
                setTimeout(() => callback(), 100)
              }
            },
            close: () => console.log('Mock connection closed'),
            connect: () => console.log('Mock connection connecting')
          },
          channels: {
            get: (channelName: string) => ({
              subscribe: (event: string, callback: Function) => {
                console.log(`Mock: Subscribed to ${event} on ${channelName}`)
                // Store callbacks for message delivery - support multiple subscribers
                if (!window._mockChannels) window._mockChannels = {}
                if (!window._mockChannels[channelName]) window._mockChannels[channelName] = {}
                if (!window._mockChannels[channelName][event]) window._mockChannels[channelName][event] = []
                
                // Store as array to support multiple subscribers
                if (Array.isArray(window._mockChannels[channelName][event])) {
                  window._mockChannels[channelName][event].push(callback)
                } else {
                  // Convert single callback to array
                  window._mockChannels[channelName][event] = [window._mockChannels[channelName][event], callback]
                }
              },
              unsubscribe: (event: string, callback: Function) => {
                console.log(`Mock: Unsubscribed from ${event} on ${channelName}`)
              },
              publish: (event: string, data: any) => {
                console.log(`Mock: Publishing ${event} on ${channelName}:`, data)
                // Simulate message to all subscribers across all windows
                setTimeout(() => {
                  // Notify all subscribers for this channel and event
                  const callbacks = window._mockChannels?.[channelName]?.[event]
                  if (callbacks) {
                    console.log(`Mock: Delivering ${event} to subscribers on ${channelName}`)
                    if (Array.isArray(callbacks)) {
                      callbacks.forEach(callback => callback({ data }))
                    } else {
                      callbacks({ data })
                    }
                  }
                  
                  // Also broadcast to localStorage for cross-window communication
                  const broadcastData = {
                    type: 'mock-ably-message',
                    channelName,
                    event,
                    data,
                    timestamp: Date.now()
                  }
                  localStorage.setItem('mock-ably-broadcast', JSON.stringify(broadcastData))
                  // Clear it immediately to trigger storage event
                  localStorage.removeItem('mock-ably-broadcast')
                }, 50)
              },
              presence: {
                enter: (data: any) => console.log(`Mock: Entering presence on ${channelName}:`, data),
                leave: () => console.log(`Mock: Leaving presence on ${channelName}`),
                update: (data: any) => console.log(`Mock: Updating presence on ${channelName}:`, data),
                get: () => Promise.resolve([]),
                subscribe: (event: string, callback: Function) => {
                  console.log(`Mock: Subscribed to presence ${event} on ${channelName}`)
                },
                unsubscribe: (event: string, callback: Function) => {
                  console.log(`Mock: Unsubscribed from presence ${event} on ${channelName}`)
                }
              }
            })
          },
          auth: {
            clientId: clientId || `user-${Date.now()}`
          },
          close: () => console.log('Mock client closed')
        }
        
        ablyClient = mockClient as any

        // Set up connection state listeners
        ablyClient.connection.on('connected', () => {
          console.log('Ably connected')
          setConnectionState('connected')
          setError(null)
        })

        ablyClient.connection.on('connecting', () => {
          console.log('Ably connecting...')
          setConnectionState('connecting')
        })

        ablyClient.connection.on('disconnected', () => {
          console.log('Ably disconnected')
          setConnectionState('disconnected')
        })

        ablyClient.connection.on('suspended', () => {
          console.log('Ably connection suspended')
          setConnectionState('suspended')
        })

        ablyClient.connection.on('failed', (error) => {
          console.error('Ably connection failed:', error)
          setConnectionState('failed')
          setError(error.message || 'Connection failed')
        })

        ablyClient.connection.on('closed', () => {
          console.log('Ably connection closed')
          setConnectionState('closed')
        })

        setClient(ablyClient)

      } catch (err) {
        console.error('Failed to initialize Ably:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize connection')
        setConnectionState('failed')
      }
    }

    initializeAbly()

    // Cleanup
    return () => {
      if (ablyClient) {
        console.log('Closing Ably connection')
        ablyClient.close()
      }
    }
  }, [authUrl, clientId])

  // Reconnect function
  const reconnect = () => {
    if (client) {
      client.connect()
    }
  }

  // Mobile lifecycle handling and cross-window communication
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!client) return

      if (document.hidden) {
        // App went to background - don't disconnect, just suspend
        console.log('App backgrounded, maintaining connection')
      } else {
        // App came to foreground - ensure connection
        console.log('App foregrounded, checking connection')
        if (client.connection.state === 'suspended' || client.connection.state === 'disconnected') {
          client.connect()
        }
      }
    }

    const handleOnline = () => {
      console.log('Network back online')
      if (client && client.connection.state !== 'connected') {
        client.connect()
      }
    }

    const handleOffline = () => {
      console.log('Network went offline')
      setError('Network offline')
    }

    // Handle cross-window mock message broadcasting
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mock-ably-broadcast' && e.newValue) {
        try {
          const broadcastData = JSON.parse(e.newValue)
          if (broadcastData.type === 'mock-ably-message') {
            const { channelName, event, data } = broadcastData
            console.log(`Mock: Received cross-window message for ${event} on ${channelName}`)
            
            // Deliver to local subscribers
            const callbacks = window._mockChannels?.[channelName]?.[event]
            if (callbacks) {
              if (Array.isArray(callbacks)) {
                callbacks.forEach(callback => callback({ data }))
              } else {
                callbacks({ data })
              }
            }
          }
        } catch (err) {
          console.error('Failed to parse cross-window message:', err)
        }
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('storage', handleStorageChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [client])

  const value: AblyContextType = {
    client,
    connectionState,
    isConnected,
    isConnecting,
    error,
    reconnect
  }

  return (
    <AblyContext.Provider value={value}>
      {children}
    </AblyContext.Provider>
  )
}

// Hook to use Ably context
export const useAbly = (): AblyContextType => {
  const context = useContext(AblyContext)
  if (!context) {
    throw new Error('useAbly must be used within an AblyProvider')
  }
  return context
}

// Hook for connection status
export const useAblyConnection = () => {
  const { connectionState, isConnected, isConnecting, error, reconnect } = useAbly()
  
  return {
    connectionState,
    isConnected,
    isConnecting,
    error,
    reconnect
  }
}