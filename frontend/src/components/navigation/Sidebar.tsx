import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  FiMenu, 
  FiX, 
  FiUsers, 
  FiHome, 
  FiSettings, 
  FiPlus, 
  FiLogOut,
  FiSun,
  FiMoon,
  FiMoreVertical
} from 'react-icons/fi'
import { useUIStore, useResponsive } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { useServerStore } from '../../stores/serverStore'
import { useThemeStore } from '../../stores/themeStore'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

interface Server {
  id: string
  name: string
  icon?: string
  memberCount: number
}

// Mock servers for development
const mockServers: Server[] = [
  { id: '1', name: 'Gaming Squad', icon: '🎮', memberCount: 12 },
  { id: '2', name: 'Work Team', icon: '💼', memberCount: 8 },
]

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isMobile, isTablet } = useResponsive()
  const { user, logout } = useAuthStore()
  const { canCreateServer, maxServers } = useServerStore()
  const { theme, toggleTheme } = useThemeStore()
  
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showCreateServerModal, setShowCreateServerModal] = useState(false)

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      onClose()
    }
  }, [location.pathname, isMobile, onClose])

  const isActive = (path: string) => {
    if (path === '/friends') {
      return location.pathname === '/friends'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) {
      onClose()
    }
  }

  const handleCreateServer = () => {
    if (canCreateServer) {
      setShowCreateServerModal(true)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out
          bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700
          ${isMobile ? 'w-3/4 max-w-sm' : 'w-64'}
          ${isOpen || !isMobile ? 'translate-x-0' : '-translate-x-full'}
          ${!isMobile ? 'relative z-auto' : ''}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 min-h-[64px]">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AIGM
            </h1>
            {isMobile && (
              <button
                onClick={onClose}
                className="btn-icon"
                aria-label="Close sidebar"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-touch p-4">
            <div className="space-y-6">
              {/* Friends Section */}
              <div>
                <button
                  onClick={() => handleNavigation('/friends')}
                  className={`
                    flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors 
                    min-h-touch w-full text-left
                    ${isActive('/friends')
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <FiUsers className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Friends</span>
                </button>
              </div>

              {/* Servers Section */}
              <div>
                <h3 className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Servers ({mockServers.length}/{maxServers})
                </h3>
                <div className="space-y-1">
                  {mockServers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleNavigation(`/servers/${server.id}`)}
                      className={`
                        flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors 
                        min-h-touch w-full text-left
                        ${isActive(`/servers/${server.id}`)
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }
                      `}
                    >
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {server.icon ? (
                          <span className="text-lg">{server.icon}</span>
                        ) : (
                          <FiHome className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block">{server.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {server.memberCount} members
                        </span>
                      </div>
                    </button>
                  ))}

                  {/* Create Server Button */}
                  <button
                    onClick={handleCreateServer}
                    disabled={!canCreateServer}
                    className={`
                      flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors 
                      min-h-touch w-full text-left
                      ${canCreateServer
                        ? 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                        : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }
                    `}
                  >
                    <div className={`
                      w-8 h-8 border-2 border-dashed rounded-lg flex items-center justify-center flex-shrink-0
                      ${canCreateServer 
                        ? 'border-gray-300 dark:border-gray-600' 
                        : 'border-gray-200 dark:border-gray-700'
                      }
                    `}>
                      <FiPlus className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">
                        {canCreateServer ? 'Create Server' : 'Server Limit Reached'}
                      </span>
                      {!canCreateServer && (
                        <span className="text-xs block">
                          Maximum {maxServers} servers allowed
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Spaces Section (Phase 2 placeholder) */}
              <div>
                <h3 className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Spaces <span className="text-orange-500">(Coming Soon)</span>
                </h3>
                <div className="space-y-1 opacity-50">
                  <div className="flex items-center space-x-3 px-3 py-3 rounded-lg cursor-not-allowed">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🎵</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Music Jam</span>
                  </div>
                  <div className="flex items-center space-x-3 px-3 py-3 rounded-lg cursor-not-allowed">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🎮</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Voice Room 1</span>
                  </div>
                  <div className="flex items-center space-x-3 px-3 py-3 rounded-lg cursor-not-allowed">
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <span className="text-lg">🌐</span>
                    </div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">3D Space</span>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* User Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors min-h-touch"
              >
                <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email || '@user'}
                  </p>
                </div>
                <FiMoreVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2">
                  <button
                    onClick={() => {
                      // TODO: Open settings
                      setShowUserMenu(false)
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left min-h-touch"
                  >
                    <FiSettings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme()
                      setShowUserMenu(false)
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left min-h-touch"
                  >
                    {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                  <button
                    onClick={() => {
                      handleLogout()
                      setShowUserMenu(false)
                    }}
                    className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left min-h-touch"
                  >
                    <FiLogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Create Server Modal Placeholder */}
      {showCreateServerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Create Server
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Server creation functionality coming soon!
            </p>
            <button
              onClick={() => setShowCreateServerModal(false)}
              className="btn-primary w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar