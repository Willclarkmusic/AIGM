// Real-time Test Page for AIGM
import React, { useState } from 'react'
import { FiUsers, FiSettings, FiWifi } from 'react-icons/fi'
import { EnhancedMessageList } from '../components/realtime/EnhancedMessageList'
import { ConnectionStatus } from '../components/realtime/ConnectionStatus'
import MessageComposer from '../components/editor/MessageComposer'
import { useAblyPresence } from '../hooks/useAblyPresence'
import { useAblyChannel } from '../hooks/useAblyChannel'
import { MentionUser } from '../lib/tiptap'

const RealtimeTestPage: React.FC = () => {
  const [selectedRoom, setSelectedRoom] = useState('general')
  const [showConnectionDetails, setShowConnectionDetails] = useState(false)
  
  // Friend presence for demo
  const { friendsStatus, currentUserStatus, updateStatus } = useAblyPresence()
  
  // Get room-specific presence data
  const { presenceUsers } = useAblyChannel(selectedRoom)

  // Demo rooms
  const rooms = [
    { id: 'general', name: 'General', description: 'Main discussion' },
    { id: 'random', name: 'Random', description: 'Off-topic chat' },
    { id: 'tech', name: 'Tech Talk', description: 'Technology discussions' },
    { id: 'gaming', name: 'Gaming', description: 'Gaming discussions' }
  ]

  // Mock mention users
  const mockMentionUsers: MentionUser[] = [
    { id: '1', name: 'Alice Smith', username: 'alice', isOnline: true },
    { id: '2', name: 'Bob Johnson', username: 'bob', isOnline: false },
    { id: '3', name: 'Carol Williams', username: 'carol', isOnline: true },
    { id: '4', name: 'David Brown', username: 'david', isOnline: true },
  ]

  const handleMentionQuery = async (query: string): Promise<MentionUser[]> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return mockMentionUsers.filter(user =>
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase())
    )
  }

  const handleSendMessage = async (content: string, attachments: any[]) => {
    // This is handled by the real-time system now
    console.log('Message sent via real-time:', { content, attachments })
  }

  const handleStatusChange = (status: 'online' | 'away' | 'busy' | 'offline') => {
    updateStatus(status)
  }

  const getOnlineCount = () => {
    // Use room-specific presence data instead of global friends
    return presenceUsers.filter(user => user.isOnline).length
  }

  // Demo: Simulate messages from other users (for testing in single window)
  const simulateDemoMessage = () => {
    const demoMessages = [
      "Hey everyone! 👋",
      "How's the **real-time** testing going?",
      "This is a demo message with *italics* and `code`!",
      "• Bullet point 1\n• Bullet point 2\n• Bullet point 3",
      "Check out this [link](https://example.com)!",
      "🚀 Real-time is working great!"
    ]
    
    const randomMessage = demoMessages[Math.floor(Math.random() * demoMessages.length)]
    const demoUser = `DemoUser${Math.floor(Math.random() * 3) + 1}`
    
    // Simulate message via mock channels
    const callbacks = window._mockChannels?.[selectedRoom]?.['message']
    if (callbacks) {
      const messageData = {
        id: `demo-${Date.now()}`,
        content: randomMessage,
        senderId: `demo-${demoUser}`,
        senderName: demoUser,
        timestamp: new Date(),
        roomId: selectedRoom,
        optimistic: false
      }
      
      if (Array.isArray(callbacks)) {
        callbacks.forEach(callback => callback({ data: messageData }))
      } else {
        callbacks({ data: messageData })
      }
    }
  }

  return (
    <div className="h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Modern Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">💬</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                AIGM Real-time Chat
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-2">
                <span>Multi-window testing environment</span>
                <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                <span className="flex items-center space-x-1">
                  <FiUsers className="w-3 h-3" />
                  <span>{getOnlineCount()} online in #{selectedRoom}</span>
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Demo Message Button */}
            <button
              onClick={simulateDemoMessage}
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center space-x-2"
              title="Simulate demo message"
            >
              <span>📨</span>
              <span>Demo Message</span>
            </button>
            
            {/* Connection Status Toggle */}
            <button
              onClick={() => setShowConnectionDetails(!showConnectionDetails)}
              className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Connection Details"
            >
              <FiWifi className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Connection Details */}
        {showConnectionDetails && (
          <div className="mt-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600">
            <ConnectionStatus showDetails={true} />
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Modern Sidebar */}
        <div className="w-72 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col shadow-lg">
          {/* User Status Card */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Your Status</span>
                <div className={`w-3 h-3 rounded-full ring-2 ring-white shadow-sm ${
                  currentUserStatus === 'online' ? 'bg-green-500' :
                  currentUserStatus === 'away' ? 'bg-yellow-500' :
                  currentUserStatus === 'busy' ? 'bg-red-500' : 'bg-gray-500'
                }`}></div>
              </div>
              
              <select
                value={currentUserStatus}
                onChange={(e) => handleStatusChange(e.target.value as any)}
                className="w-full px-4 py-3 text-sm border-0 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-gray-200 dark:ring-gray-600 focus:ring-2 focus:ring-primary-500 transition-all"
              >
                <option value="online">🟢 Online</option>
                <option value="away">🟡 Away</option>
                <option value="busy">🔴 Busy</option>
                <option value="offline">⚫ Offline</option>
              </select>
            </div>
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Channels
                </h3>
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-500">{rooms.length}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {rooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`
                      w-full text-left p-4 rounded-xl transition-all duration-200 group
                      ${selectedRoom === room.id
                        ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg transform scale-105'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:transform hover:scale-102'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold
                        ${selectedRoom === room.id 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 group-hover:bg-primary-100 group-hover:text-primary-600'
                        }`}>
                        #
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{room.name}</div>
                        <div className={`text-xs mt-1 truncate ${
                          selectedRoom === room.id 
                            ? 'text-white/80' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {room.description}
                        </div>
                      </div>
                      {selectedRoom === room.id && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Online Users in Current Room */}
          {presenceUsers.length > 0 && (
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 p-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
                <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <span>Active in #{selectedRoom}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </h3>
                
                <div className="space-y-2">
                  {presenceUsers
                    .filter(user => user.isOnline)
                    .slice(0, 8)
                    .map(user => (
                      <div key={user.userId} className="flex items-center space-x-3">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {user.userName.charAt(0)}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate font-medium">
                          {user.userName}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white/50 dark:bg-gray-900/50">
          {/* Messages */}
          <div className="flex-1 min-h-0">
            <EnhancedMessageList roomId={selectedRoom} currentUserId="user-demo" />
          </div>

          {/* Message Composer */}
          <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <MessageComposer
              placeholder={`Message #${rooms.find(r => r.id === selectedRoom)?.name || selectedRoom} (Enter to send, Shift+Enter for new line)`}
              onSend={handleSendMessage}
              onMentionQuery={handleMentionQuery}
              roomId={selectedRoom}
              maxCharacters={2000}
              enableVoiceMessage={true}
            />
          </div>
        </div>
      </div>

      {/* Modern Instructions Footer */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-t border-blue-200/50 dark:border-blue-800/50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🧪</span>
            </div>
            <h4 className="text-sm font-bold bg-gradient-to-r from-blue-800 to-purple-800 dark:from-blue-200 dark:to-purple-200 bg-clip-text text-transparent">
              Real-time Testing Environment
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-blue-700 dark:text-blue-300">
            <div className="flex items-start space-x-2">
              <span className="text-blue-500">🪟</span>
              <div>
                <strong>Multiple Windows:</strong> Open this page in multiple browser windows to test real-time messaging
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-purple-500">⌨️</span>
              <div>
                <strong>Typing Indicators:</strong> Start typing to see live typing indicators appear in other windows
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-green-500">🟢</span>
              <div>
                <strong>Presence:</strong> Change your status to see real-time presence updates
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-indigo-500">#️⃣</span>
              <div>
                <strong>Room Switching:</strong> Switch between channels to test different subscriptions
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-pink-500">✨</span>
              <div>
                <strong>Rich Text:</strong> Use formatting toolbar for bold, italic, colors, links, and more
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-yellow-500">📨</span>
              <div>
                <strong>Demo Messages:</strong> Click "Demo Message" to simulate messages from other users
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RealtimeTestPage