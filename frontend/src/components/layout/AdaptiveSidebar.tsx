// Adaptive Sidebar Component for AIGM (Rooms/Friends)
import React, { useState } from 'react'
import { 
  FiHash, FiVolume2, FiUsers, FiMessageCircle, FiSearch, 
  FiPlus, FiChevronDown, FiChevronRight, FiSettings,
  FiUserPlus, FiInbox, FiMic, FiHeadphones
} from 'react-icons/fi'

// Types
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

interface AdaptiveSidebarProps {
  currentView: 'friends' | 'server'
  selectedServerId: string | null
  selectedRoomId: string | null
  selectedDmId: string | null
  rooms: Room[]
  friends: Friend[]
  directMessages: DirectMessage[]
  friendRequests: number
  onRoomSelect: (roomId: string) => void
  onDmSelect: (dmId: string) => void
  onFriendSelect: (friendId: string) => void
  onCreateRoom: () => void
  onAddFriend: () => void
  className?: string
}

export const AdaptiveSidebar: React.FC<AdaptiveSidebarProps> = ({
  currentView,
  selectedServerId,
  selectedRoomId,
  selectedDmId,
  rooms,
  friends,
  directMessages,
  friendRequests,
  onRoomSelect,
  onDmSelect,
  onFriendSelect,
  onCreateRoom,
  onAddFriend,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const getStatusColor = (status: Friend['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'busy': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    return `${diffDays}d`
  }

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (currentView === 'friends') {
    return (
      <aside className={`
        w-60 bg-gray-50 dark:bg-gray-800 
        flex flex-col h-full
        border-r border-gray-200 dark:border-gray-700
        ${className}
      `}>
        {/* Friends Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Friends</h2>
            <button
              onClick={onAddFriend}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Add Friend"
            >
              <FiUserPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Friends Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Quick Actions */}
          <div className="p-2 space-y-1">
            <button
              className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                ${!selectedDmId && !selectedRoomId ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
              `}
            >
              <FiUsers className="w-4 h-4" />
              <span className="text-sm font-medium">All Friends</span>
            </button>
            
            {friendRequests > 0 && (
              <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300">
                <div className="flex items-center space-x-3">
                  <FiInbox className="w-4 h-4" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {friendRequests}
                </span>
              </button>
            )}
          </div>

          {/* Direct Messages */}
          {directMessages.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => toggleSection('dms')}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Direct Messages
                </span>
                {collapsedSections.has('dms') ? (
                  <FiChevronRight className="w-3 h-3 text-gray-400" />
                ) : (
                  <FiChevronDown className="w-3 h-3 text-gray-400" />
                )}
              </button>
              
              {!collapsedSections.has('dms') && (
                <div className="px-2 space-y-1">
                  {directMessages.map(dm => (
                    <button
                      key={dm.id}
                      onClick={() => onDmSelect(dm.id)}
                      className={`
                        w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                        hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                        ${selectedDmId === dm.id ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
                      `}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {dm.friendName.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${dm.isOnline ? 'bg-green-500' : 'bg-gray-500'} rounded-full border-2 border-white dark:border-gray-800`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{dm.friendName}</span>
                          <span className="text-xs text-gray-500">{formatTimestamp(dm.timestamp)}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{dm.lastMessage}</p>
                      </div>
                      {dm.unreadCount && dm.unreadCount > 0 && (
                        <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {dm.unreadCount}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Online Friends */}
          <div className="mt-4">
            <button
              onClick={() => toggleSection('online')}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Online — {filteredFriends.filter(f => f.status === 'online').length}
              </span>
              {collapsedSections.has('online') ? (
                <FiChevronRight className="w-3 h-3 text-gray-400" />
              ) : (
                <FiChevronDown className="w-3 h-3 text-gray-400" />
              )}
            </button>
            
            {!collapsedSections.has('online') && (
              <div className="px-2 space-y-1">
                {filteredFriends
                  .filter(friend => friend.status === 'online')
                  .map(friend => (
                    <button
                      key={friend.id}
                      onClick={() => onFriendSelect(friend.id)}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <div className="relative">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {friend.name.charAt(0)}
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(friend.status)} rounded-full border-2 border-white dark:border-gray-800`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{friend.name}</span>
                          {friend.hasUnread && (
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                        {friend.activity && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.activity}</p>
                        )}
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    )
  }

  // Server View
  return (
    <aside className={`
      w-60 bg-gray-50 dark:bg-gray-800 
      flex flex-col h-full
      border-r border-gray-200 dark:border-gray-700
      ${className}
    `}>
      {/* Server Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            Server Name
          </h2>
          <button
            onClick={onCreateRoom}
            className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Create Channel"
          >
            <FiPlus className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Server Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Text Channels */}
        <div className="mt-2">
          <button
            onClick={() => toggleSection('text')}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Text Channels
            </span>
            {collapsedSections.has('text') ? (
              <FiChevronRight className="w-3 h-3 text-gray-400" />
            ) : (
              <FiChevronDown className="w-3 h-3 text-gray-400" />
            )}
          </button>
          
          {!collapsedSections.has('text') && (
            <div className="px-2 space-y-1">
              {filteredRooms
                .filter(room => room.type === 'text')
                .map(room => (
                  <button
                    key={room.id}
                    onClick={() => onRoomSelect(room.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                      hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                      ${selectedRoomId === room.id ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    <FiHash className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium truncate">{room.name}</span>
                    {room.unreadCount && room.unreadCount > 0 && (
                      <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {room.unreadCount > 99 ? '99+' : room.unreadCount}
                      </div>
                    )}
                    {room.hasAlert && !room.unreadCount && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Voice Channels */}
        <div className="mt-4">
          <button
            onClick={() => toggleSection('voice')}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Voice Channels
            </span>
            {collapsedSections.has('voice') ? (
              <FiChevronRight className="w-3 h-3 text-gray-400" />
            ) : (
              <FiChevronDown className="w-3 h-3 text-gray-400" />
            )}
          </button>
          
          {!collapsedSections.has('voice') && (
            <div className="px-2 space-y-1">
              {filteredRooms
                .filter(room => room.type === 'voice')
                .map(room => (
                  <button
                    key={room.id}
                    onClick={() => onRoomSelect(room.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2 rounded-lg
                      hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors
                      ${selectedRoomId === room.id ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}
                    `}
                  >
                    <FiVolume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium truncate">{room.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* User Voice Controls (if in voice channel) */}
        {selectedRoomId && rooms.find(r => r.id === selectedRoomId)?.type === 'voice' && (
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <FiMic className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <FiHeadphones className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <FiSettings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}