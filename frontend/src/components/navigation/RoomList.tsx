import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  FiHash, 
  FiVolume2, 
  FiLock, 
  FiChevronDown, 
  FiChevronRight, 
  FiPlus,
  FiSettings,
  FiMoreHorizontal,
  FiEdit3,
  FiTrash2
} from 'react-icons/fi'
import { useResponsive } from '../../stores/uiStore'

interface Room {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement'
  isPrivate: boolean
  unreadCount?: number
  category?: string
  position: number
}

interface RoomCategory {
  id: string
  name: string
  collapsed: boolean
  rooms: Room[]
}

interface RoomListProps {
  serverId: string
  currentRoomId?: string
  onRoomSelect?: (roomId: string) => void
  onClose?: () => void
}

// Mock data for development
const mockCategories: RoomCategory[] = [
  {
    id: 'general',
    name: 'General',
    collapsed: false,
    rooms: [
      { id: '1', name: 'general', type: 'text', isPrivate: false, unreadCount: 3, position: 0 },
      { id: '2', name: 'random', type: 'text', isPrivate: false, position: 1 },
      { id: '3', name: 'announcements', type: 'announcement', isPrivate: false, unreadCount: 1, position: 2 },
    ]
  },
  {
    id: 'voice',
    name: 'Voice Channels',
    collapsed: false,
    rooms: [
      { id: '4', name: 'General Voice', type: 'voice', isPrivate: false, position: 0 },
      { id: '5', name: 'Gaming', type: 'voice', isPrivate: false, position: 1 },
    ]
  },
  {
    id: 'private',
    name: 'Private',
    collapsed: false,
    rooms: [
      { id: '6', name: 'staff-only', type: 'text', isPrivate: true, position: 0 },
      { id: '7', name: 'admin-chat', type: 'text', isPrivate: true, position: 1 },
    ]
  }
]

const mockDirectRooms: Room[] = [
  { id: 'dm1', name: 'Alice Johnson', type: 'text', isPrivate: true, unreadCount: 2, position: 0 },
  { id: 'dm2', name: 'Bob Smith', type: 'text', isPrivate: true, position: 1 },
  { id: 'dm3', name: 'Charlie, David', type: 'text', isPrivate: true, position: 2 },
]

function RoomList({ serverId, currentRoomId, onRoomSelect, onClose }: RoomListProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile } = useResponsive()
  
  const [categories, setCategories] = useState(mockCategories)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [dmCollapsed, setDmCollapsed] = useState(false)

  const isRoomActive = (roomId: string) => {
    return currentRoomId === roomId || location.pathname.includes(`/rooms/${roomId}`)
  }

  const handleRoomClick = (roomId: string) => {
    if (onRoomSelect) {
      onRoomSelect(roomId)
    } else {
      navigate(`/servers/${serverId}/rooms/${roomId}`)
    }
    
    if (isMobile && onClose) {
      onClose()
    }
  }

  const toggleCategory = (categoryId: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, collapsed: !cat.collapsed }
        : cat
    ))
  }

  const getRoomIcon = (room: Room) => {
    switch (room.type) {
      case 'voice':
        return <FiVolume2 className="w-4 h-4" />
      case 'announcement':
        return <FiSettings className="w-4 h-4" />
      default:
        return <FiHash className="w-4 h-4" />
    }
  }

  const handleCreateRoom = () => {
    setShowCreateRoom(true)
  }

  const handleEditRoom = (roomId: string) => {
    console.log('Edit room:', roomId)
    setSelectedRoom(null)
  }

  const handleDeleteRoom = (roomId: string) => {
    console.log('Delete room:', roomId)
    setSelectedRoom(null)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            Gaming Squad
          </h2>
          <button
            onClick={handleCreateRoom}
            className="btn-icon text-gray-500 dark:text-gray-400"
            aria-label="Create room"
          >
            <FiPlus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Room Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-touch">
        <div className="p-2 space-y-1">
          {categories.map((category) => (
            <div key={category.id}>
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-h-touch"
              >
                <span>{category.name}</span>
                {category.collapsed ? (
                  <FiChevronRight className="w-4 h-4" />
                ) : (
                  <FiChevronDown className="w-4 h-4" />
                )}
              </button>

              {/* Category Rooms */}
              {!category.collapsed && (
                <div className="space-y-1 ml-2">
                  {category.rooms.map((room) => (
                    <div key={room.id} className="group relative">
                      <button
                        onClick={() => handleRoomClick(room.id)}
                        className={`
                          flex items-center justify-between w-full px-2 py-2 rounded-lg transition-colors min-h-touch
                          ${isRoomActive(room.id)
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                          }
                        `}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          {getRoomIcon(room)}
                          {room.isPrivate && <FiLock className="w-3 h-3" />}
                          <span className="text-sm font-medium truncate">{room.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {room.unreadCount && room.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                              {room.unreadCount > 99 ? '99+' : room.unreadCount}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRoom(selectedRoom === room.id ? null : room.id)
                            }}
                            className="btn-icon p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Room options"
                          >
                            <FiMoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </button>

                      {/* Room Options Menu */}
                      {selectedRoom === room.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-10 min-w-[140px]">
                          <button
                            onClick={() => handleEditRoom(room.id)}
                            className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                          >
                            <FiEdit3 className="w-4 h-4" />
                            <span>Edit Room</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
                          >
                            <FiTrash2 className="w-4 h-4" />
                            <span>Delete Room</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Direct Messages Section */}
          <div className="mt-6">
            <button
              onClick={() => setDmCollapsed(!dmCollapsed)}
              className="flex items-center justify-between w-full px-2 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide hover:text-gray-700 dark:hover:text-gray-300 transition-colors min-h-touch"
            >
              <span>Direct Messages</span>
              {dmCollapsed ? (
                <FiChevronRight className="w-4 h-4" />
              ) : (
                <FiChevronDown className="w-4 h-4" />
              )}
            </button>

            {!dmCollapsed && (
              <div className="space-y-1 ml-2">
                {mockDirectRooms.map((room) => (
                  <div key={room.id} className="group relative">
                    <button
                      onClick={() => handleRoomClick(room.id)}
                      className={`
                        flex items-center justify-between w-full px-2 py-2 rounded-lg transition-colors min-h-touch
                        ${isRoomActive(room.id)
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {room.name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium truncate">{room.name}</span>
                      </div>
                      
                      {room.unreadCount && room.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {room.unreadCount > 99 ? '99+' : room.unreadCount}
                        </span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Room Modal */}
      {showCreateRoom && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowCreateRoom(false)} />
          <div className="fixed inset-x-4 top-20 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 md:inset-x-auto md:w-96 md:left-1/2 md:transform md:-translate-x-1/2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create Room
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Room creation functionality coming soon!
            </p>
            <button
              onClick={() => setShowCreateRoom(false)}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </>
      )}

      {/* Click outside to close menus */}
      {selectedRoom && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setSelectedRoom(null)}
        />
      )}
    </div>
  )
}

export default RoomList