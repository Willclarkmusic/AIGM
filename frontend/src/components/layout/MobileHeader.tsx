// Mobile Header Component for AIGM
import React from 'react'
import { FiMenu, FiHash, FiUsers, FiPhone, FiVideo, FiMoreVertical } from 'react-icons/fi'
import { ConnectionIndicator } from '../realtime/ConnectionStatus'

interface MobileHeaderProps {
  onMenuToggle: () => void
  currentView: 'friends' | 'server'
  currentRoomName?: string
  currentFriendName?: string
  onlineCount?: number
  className?: string
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuToggle,
  currentView,
  currentRoomName,
  currentFriendName,
  onlineCount = 0,
  className = ''
}) => {
  const getHeaderTitle = () => {
    if (currentView === 'friends' && currentFriendName) {
      return currentFriendName
    }
    if (currentView === 'server' && currentRoomName) {
      return `#${currentRoomName}`
    }
    return currentView === 'friends' ? 'Friends' : 'AIGM'
  }

  const getSubtitle = () => {
    if (currentView === 'friends' && currentFriendName) {
      return 'Online'
    }
    if (currentView === 'server' && onlineCount > 0) {
      return `${onlineCount} members online`
    }
    return null
  }

  const getIcon = () => {
    if (currentView === 'friends') {
      return <FiUsers className="w-5 h-5 text-green-500" />
    }
    return <FiHash className="w-5 h-5 text-gray-400" />
  }

  return (
    <header className={`
      bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg
      border-b border-gray-200/50 dark:border-gray-700/50
      px-4 py-3 flex items-center justify-between
      sticky top-0 z-40 shadow-sm
      ${className}
    `}>
      {/* Left: Menu button */}
      <button
        onClick={onMenuToggle}
        className="
          p-2 -ml-2 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-700
          active:bg-gray-200 dark:active:bg-gray-600
          transition-colors duration-150
          touch-manipulation
          min-w-[44px] min-h-[44px]
          flex items-center justify-center
        "
        aria-label="Open menu"
      >
        <FiMenu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Center: Room/Friend info */}
      <div className="flex-1 flex items-center justify-center mx-4 min-w-0">
        <div className="flex items-center space-x-3 min-w-0">
          {getIcon()}
          <div className="min-w-0 text-center">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {getHeaderTitle()}
            </h1>
            {getSubtitle() && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {getSubtitle()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex items-center space-x-1">
        {/* Voice/Video calls for DMs */}
        {currentView === 'friends' && currentFriendName && (
          <>
            <button className="
              p-2 rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              transition-colors duration-150
              min-w-[44px] min-h-[44px]
              flex items-center justify-center
            ">
              <FiPhone className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button className="
              p-2 rounded-lg
              hover:bg-gray-100 dark:hover:bg-gray-700
              active:bg-gray-200 dark:active:bg-gray-600
              transition-colors duration-150
              min-w-[44px] min-h-[44px]
              flex items-center justify-center
            ">
              <FiVideo className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </>
        )}

        {/* Connection indicator */}
        <div className="px-2">
          <ConnectionIndicator />
        </div>

        {/* More options */}
        <button className="
          p-2 rounded-lg
          hover:bg-gray-100 dark:hover:bg-gray-700
          active:bg-gray-200 dark:active:bg-gray-600
          transition-colors duration-150
          min-w-[44px] min-h-[44px]
          flex items-center justify-center
        ">
          <FiMoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        </button>
      </div>
    </header>
  )
}