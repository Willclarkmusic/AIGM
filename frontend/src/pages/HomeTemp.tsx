// Complete AIGM Demo Interface Assembly
import React, { useState, useEffect } from 'react'
import { useResponsiveLayout, useMobileGestures, useKeyboardHandling } from '../hooks/useResponsiveLayout'
import { MobileHeader } from '../components/layout/MobileHeader'
import { ServerSidebar } from '../components/layout/ServerSidebar'
import { AdaptiveSidebar } from '../components/layout/AdaptiveSidebar'
import { EnhancedMessageList } from '../components/realtime/EnhancedMessageList'
import MessageComposer from '../components/editor/MessageComposer'
import { FiX } from 'react-icons/fi'

// Demo Data Types
interface Server {
  id: string
  name: string
  icon: string
  color: string
  unreadCount?: number
  hasAlert?: boolean
}

interface Room {
  id: string
  name: string
  type: 'text' | 'voice'
  unreadCount?: number
  hasAlert?: boolean
  isPrivate?: boolean
}

interface Friend {
  id: string
  name: string
  username: string
  status: 'online' | 'away' | 'busy' | 'offline'
  activity?: string
  avatar?: string
  hasUnread?: boolean
}

interface DirectMessage {
  id: string
  friendId: string
  friendName: string
  lastMessage: string
  timestamp: Date
  unreadCount?: number
  isOnline: boolean
}

// Demo Data
const demoServers: Server[] = [
  {
    id: 'server-1',
    name: 'AI Community',
    icon: '🤖',
    color: '#3B82F6',
    unreadCount: 3
  },
  {
    id: 'server-2', 
    name: 'Gaming Squad',
    icon: '🎮',
    color: '#10B981',
    hasAlert: true
  },
  {
    id: 'server-3',
    name: 'Work Team',
    icon: '💼',
    color: '#8B5CF6'
  }
]

const demoRooms: Record<string, Room[]> = {
  'server-1': [
    { id: 'general', name: 'general', type: 'text', unreadCount: 2 },
    { id: 'ai-discussion', name: 'ai-discussion', type: 'text' },
    { id: 'announcements', name: 'announcements', type: 'text', hasAlert: true },
    { id: 'voice-chat', name: 'Voice Chat', type: 'voice' },
    { id: 'music-lounge', name: 'Music Lounge', type: 'voice' }
  ],
  'server-2': [
    { id: 'gaming-general', name: 'general', type: 'text', hasAlert: true },
    { id: 'valorant', name: 'valorant', type: 'text' },
    { id: 'minecraft', name: 'minecraft', type: 'text' },
    { id: 'game-night', name: 'Game Night', type: 'voice' }
  ],
  'server-3': [
    { id: 'work-general', name: 'general', type: 'text' },
    { id: 'project-alpha', name: 'project-alpha', type: 'text', isPrivate: true },
    { id: 'meetings', name: 'Daily Standup', type: 'voice' }
  ]
}

const demoFriends: Friend[] = [
  {
    id: 'friend-1',
    name: 'Alex Johnson', 
    username: 'alexj',
    status: 'online',
    activity: 'Playing Valorant',
    hasUnread: true
  },
  {
    id: 'friend-2',
    name: 'Sarah Chen',
    username: 'sarahc', 
    status: 'online',
    activity: 'Coding in VS Code'
  },
  {
    id: 'friend-3',
    name: 'Mike Rodriguez',
    username: 'mikecr',
    status: 'away'
  },
  {
    id: 'friend-4',
    name: 'Emily Davis',
    username: 'emilyd',
    status: 'busy',
    activity: 'In a meeting'
  },
  {
    id: 'friend-5',
    name: 'Tom Wilson',
    username: 'tomw',
    status: 'offline'
  }
]

const demoDirectMessages: DirectMessage[] = [
  {
    id: 'dm-1',
    friendId: 'friend-1',
    friendName: 'Alex Johnson',
    lastMessage: 'Hey, want to play some games later?',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago
    unreadCount: 2,
    isOnline: true
  },
  {
    id: 'dm-2', 
    friendId: 'friend-2',
    friendName: 'Sarah Chen',
    lastMessage: 'Thanks for the code review!',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    unreadCount: 0,
    isOnline: true
  },
  {
    id: 'dm-3',
    friendId: 'friend-3', 
    friendName: 'Mike Rodriguez',
    lastMessage: 'Sure thing, talk tomorrow',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    unreadCount: 0,
    isOnline: false
  }
]

export const HomeTemp: React.FC = () => {
  // Layout state
  const {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    sidebarOpen,
    keyboardVisible,
    toggleSidebar,
    closeSidebar,
    setSidebarOpen
  } = useResponsiveLayout()

  // App state
  const [currentView, setCurrentView] = useState<'friends' | 'server'>('friends')
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>('general')
  const [selectedDmId, setSelectedDmId] = useState<string | null>('dm-1')
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null)

  // Keyboard handling
  useKeyboardHandling(isMobile, keyboardVisible)

  // Mobile gesture handling
  useMobileGestures(
    isMobile,
    () => setSidebarOpen(true), // Swipe right to open
    () => setSidebarOpen(false) // Swipe left to close
  )

  // Auto-close sidebar on desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false)
    }
  }, [isDesktop, setSidebarOpen])

  // Close sidebar when clicking outside on mobile
  const handleOverlayClick = () => {
    if (isMobile || isTablet) {
      closeSidebar()
    }
  }

  // Navigation handlers
  const handleViewChange = (view: 'friends' | 'server') => {
    setCurrentView(view)
    if (view === 'friends') {
      setSelectedServerId(null)
      if (!selectedDmId) {
        setSelectedDmId('dm-1')
      }
    } else {
      if (!selectedServerId) {
        setSelectedServerId('server-1')
      }
      if (!selectedRoomId) {
        setSelectedRoomId('general')
      }
    }
    if (isMobile) closeSidebar()
  }

  const handleServerSelect = (serverId: string) => {
    setSelectedServerId(serverId)
    setCurrentView('server')
    const serverRooms = demoRooms[serverId] || []
    if (serverRooms.length > 0) {
      setSelectedRoomId(serverRooms[0].id)
    }
    if (isMobile) closeSidebar()
  }

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId)
    setSelectedDmId(null)
    setSelectedFriendId(null)
    if (isMobile) closeSidebar()
  }

  const handleDmSelect = (dmId: string) => {
    setSelectedDmId(dmId)
    setSelectedRoomId(null)
    setSelectedFriendId(null)
    if (isMobile) closeSidebar()
  }

  const handleFriendSelect = (friendId: string) => {
    setSelectedFriendId(friendId)
    setSelectedRoomId(null)
    setSelectedDmId(null)
    if (isMobile) closeSidebar()
  }

  // Get current content info
  const getCurrentRoomName = () => {
    if (selectedRoomId && selectedServerId) {
      const rooms = demoRooms[selectedServerId] || []
      const room = rooms.find(r => r.id === selectedRoomId)
      return room?.name
    }
    return undefined
  }

  const getCurrentFriendName = () => {
    if (selectedDmId) {
      const dm = demoDirectMessages.find(dm => dm.id === selectedDmId)
      return dm?.friendName
    }
    if (selectedFriendId) {
      const friend = demoFriends.find(f => f.id === selectedFriendId)
      return friend?.name
    }
    return undefined
  }

  const getCurrentChannelId = () => {
    if (selectedRoomId) return selectedRoomId
    if (selectedDmId) return selectedDmId
    return 'general'
  }

  const getOnlineCount = () => {
    if (currentView === 'friends') {
      return demoFriends.filter(f => f.status === 'online').length
    }
    // Mock online count for servers
    return Math.floor(Math.random() * 50) + 10
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          onMenuToggle={toggleSidebar}
          currentView={currentView}
          currentRoomName={getCurrentRoomName()}
          currentFriendName={getCurrentFriendName()}
          onlineCount={getOnlineCount()}
          className="absolute top-0 left-0 right-0 z-50"
        />
      )}

      {/* Server Sidebar (Desktop) */}
      {isDesktop && (
        <ServerSidebar
          currentView={currentView}
          selectedServerId={selectedServerId}
          servers={demoServers}
          onViewChange={handleViewChange}
          onServerSelect={handleServerSelect}
          onCreateServer={() => console.log('Create server')}
          onSettings={() => console.log('Settings')}
        />
      )}

      {/* Adaptive Sidebar (Desktop) or Mobile Drawer */}
      {(isDesktop || sidebarOpen) && (
        <>
          {/* Mobile Overlay */}
          {(isMobile || isTablet) && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={handleOverlayClick}
            />
          )}

          {/* Sidebar Container */}
          <div className={`
            ${isDesktop 
              ? 'relative' 
              : 'fixed left-0 top-0 bottom-0 z-50 will-change-transform'
            }
            ${(isMobile || isTablet) && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
            transition-transform duration-300 ease-in-out
            backdrop-blur-sm bg-white/95 dark:bg-gray-900/95
            ${isDesktop ? 'bg-opacity-100 dark:bg-opacity-100' : ''}
            shadow-xl border-r border-gray-200 dark:border-gray-700
          `}>
            {/* Mobile: Server Selection */}
            {(isMobile || isTablet) && (
              <div className="bg-gray-900 dark:bg-black p-4 flex items-center justify-between">
                <ServerSidebar
                  currentView={currentView}
                  selectedServerId={selectedServerId}
                  servers={demoServers}
                  onViewChange={handleViewChange}
                  onServerSelect={handleServerSelect}
                  onCreateServer={() => console.log('Create server')}
                  onSettings={() => console.log('Settings')}
                  className="flex flex-row space-x-2 w-auto"
                />
                <button
                  onClick={closeSidebar}
                  className="p-2 text-white hover:bg-gray-700 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Adaptive Sidebar */}
            <AdaptiveSidebar
              currentView={currentView}
              selectedServerId={selectedServerId}
              selectedRoomId={selectedRoomId}
              selectedDmId={selectedDmId}
              rooms={selectedServerId ? demoRooms[selectedServerId] || [] : []}
              friends={demoFriends}
              directMessages={demoDirectMessages}
              friendRequests={2}
              onRoomSelect={handleRoomSelect}
              onDmSelect={handleDmSelect}
              onFriendSelect={handleFriendSelect}
              onCreateRoom={() => console.log('Create room')}
              onAddFriend={() => console.log('Add friend')}
              className={isMobile || isTablet ? 'h-full' : ''}
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className={`
        flex-1 flex flex-col min-w-0
        ${isMobile ? 'pt-16' : ''}
        ${keyboardVisible ? 'pb-0' : ''}
      `}>
        {/* Desktop Header */}
        {!isMobile && (
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentView === 'friends' 
                      ? getCurrentFriendName() || 'Friends'
                      : `#${getCurrentRoomName() || 'general'}`
                    }
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {currentView === 'friends' 
                      ? getCurrentFriendName() ? 'Online' : `${getOnlineCount()} friends online`
                      : `${getOnlineCount()} members online`
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages and Composer */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Enhanced Message List */}
          <div className="flex-1 min-h-0">
            <EnhancedMessageList
              roomId={getCurrentChannelId()}
              currentUserId="user-demo"
              className="h-full"
            />
          </div>

          {/* Message Composer */}
          <div className={`
            flex-shrink-0 border-t border-gray-200 dark:border-gray-700
            ${keyboardVisible ? 'pb-safe' : 'pb-4'}
          `}>
            <MessageComposer
              channelName={getCurrentChannelId()}
              placeholder={`Message ${currentView === 'friends' 
                ? getCurrentFriendName() || '#friends'
                : `#${getCurrentRoomName() || 'general'}`
              }`}
              className="p-4"
            />
          </div>
        </div>
      </div>

      {/* Performance monitoring (hidden) */}
      <div className="hidden">
        <div data-testid="screen-size">{screenSize}</div>
        <div data-testid="current-view">{currentView}</div>
        <div data-testid="selected-room">{selectedRoomId}</div>
        <div data-testid="selected-dm">{selectedDmId}</div>
        <div data-testid="sidebar-open">{sidebarOpen.toString()}</div>
      </div>
    </div>
  )
}

export default HomeTemp