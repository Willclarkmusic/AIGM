// Server Sidebar Component for AIGM
import React from 'react'
import { FiUsers, FiPlus, FiSettings, FiHome, FiBriefcase, FiStar } from 'react-icons/fi'

interface Server {
  id: string
  name: string
  icon: string
  color: string
  unreadCount?: number
  hasAlert?: boolean
}

interface ServerSidebarProps {
  currentView: 'friends' | 'server'
  selectedServerId: string | null
  servers: Server[]
  onViewChange: (view: 'friends' | 'server') => void
  onServerSelect: (serverId: string) => void
  onCreateServer: () => void
  onSettings: () => void
  className?: string
}

const MAX_SERVERS = 3

export const ServerSidebar: React.FC<ServerSidebarProps> = ({
  currentView,
  selectedServerId,
  servers,
  onViewChange,
  onServerSelect,
  onCreateServer,
  onSettings,
  className = ''
}) => {
  const canCreateServer = servers.length < MAX_SERVERS

  const getServerIcon = (server: Server) => {
    // Use emoji if provided, otherwise use default icons
    if (server.icon && server.icon.length === 1) {
      return <span className="text-xl">{server.icon}</span>
    }
    
    // Default icons based on server type
    const iconMap: { [key: string]: React.ReactNode } = {
      'home': <FiHome className="w-5 h-5" />,
      'work': <FiBriefcase className="w-5 h-5" />,
      'gaming': <FiStar className="w-5 h-5" />
    }
    
    return iconMap[server.icon] || <FiHome className="w-5 h-5" />
  }

  return (
    <nav className={`
      w-18 bg-gray-900 dark:bg-black
      flex flex-col items-center py-3
      border-r border-gray-800 dark:border-gray-900
      ${className}
    `}>
      {/* Friends Icon */}
      <div className="mb-2">
        <button
          onClick={() => onViewChange('friends')}
          className={`
            w-12 h-12 rounded-2xl flex items-center justify-center
            transition-all duration-200 group relative
            ${currentView === 'friends'
              ? 'bg-primary-600 rounded-xl shadow-lg'
              : 'bg-gray-700 hover:bg-primary-600 hover:rounded-xl'
            }
          `}
          title="Friends"
        >
          <FiUsers className={`
            w-6 h-6 transition-colors
            ${currentView === 'friends' ? 'text-white' : 'text-gray-300 group-hover:text-white'}
          `} />
          
          {/* Active indicator */}
          {currentView === 'friends' && (
            <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
          )}
        </button>
      </div>

      {/* Separator */}
      <div className="w-8 h-0.5 bg-gray-700 dark:bg-gray-800 rounded-full mb-2" />

      {/* Server Icons */}
      <div className="flex flex-col space-y-2 mb-2">
        {servers.map((server) => (
          <div key={server.id} className="relative">
            <button
              onClick={() => {
                onViewChange('server')
                onServerSelect(server.id)
              }}
              className={`
                w-12 h-12 rounded-2xl flex items-center justify-center
                transition-all duration-200 group relative overflow-hidden
                ${selectedServerId === server.id && currentView === 'server'
                  ? 'rounded-xl shadow-lg'
                  : 'hover:rounded-xl'
                }
              `}
              style={{
                backgroundColor: selectedServerId === server.id && currentView === 'server' 
                  ? server.color 
                  : '#374151'
              }}
              title={server.name}
            >
              <div className={`
                transition-colors
                ${selectedServerId === server.id && currentView === 'server'
                  ? 'text-white'
                  : 'text-gray-300 group-hover:text-white'
                }
              `}>
                {getServerIcon(server)}
              </div>
              
              {/* Unread indicator */}
              {server.unreadCount && server.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {server.unreadCount > 99 ? '99+' : server.unreadCount}
                </div>
              )}
              
              {/* Alert indicator */}
              {server.hasAlert && !server.unreadCount && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
              )}
              
              {/* Active indicator */}
              {selectedServerId === server.id && currentView === 'server' && (
                <div className="absolute -left-3 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Create Server Button */}
      <div className="mb-auto">
        <button
          onClick={onCreateServer}
          disabled={!canCreateServer}
          className={`
            w-12 h-12 rounded-2xl flex items-center justify-center
            transition-all duration-200 group
            ${canCreateServer
              ? 'bg-gray-700 hover:bg-green-600 hover:rounded-xl'
              : 'bg-gray-800 cursor-not-allowed opacity-50'
            }
          `}
          title={canCreateServer ? 'Create Server' : `Maximum ${MAX_SERVERS} servers`}
        >
          <FiPlus className={`
            w-5 h-5 transition-colors
            ${canCreateServer
              ? 'text-green-400 group-hover:text-white'
              : 'text-gray-600'
            }
          `} />
        </button>
      </div>

      {/* Settings */}
      <div className="mt-auto">
        <button
          onClick={onSettings}
          className="
            w-12 h-12 rounded-2xl flex items-center justify-center
            bg-gray-700 hover:bg-gray-600 hover:rounded-xl
            transition-all duration-200 group
          "
          title="User Settings"
        >
          <FiSettings className="w-5 h-5 text-gray-300 group-hover:text-white transition-colors" />
        </button>
      </div>
    </nav>
  )
}