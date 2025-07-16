import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { FiMenu, FiX, FiUsers, FiHome, FiSettings, FiPlus, FiLogOut } from 'react-icons/fi'
import { useThemeStore } from '../../stores/themeStore'
import { useAuth } from '../../contexts/AuthContext'

interface BaseLayoutProps {
  children: React.ReactNode
}

interface Server {
  id: string
  name: string
  icon?: string
}

// Mock data for development
const mockServers: Server[] = [
  { id: '1', name: 'Gaming Squad', icon: '🎮' },
  { id: '2', name: 'Work Team', icon: '💼' },
]

function BaseLayout({ children }: BaseLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const location = useLocation()
  const { theme, toggleTheme } = useThemeStore()
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close sidebar when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [location.pathname, isMobile])

  const isActive = (path: string) => {
    if (path === '/friends') {
      return location.pathname === '/friends'
    }
    return location.pathname.startsWith(path)
  }

  const canCreateServer = mockServers.length < 3

  return (
    <div className="flex h-screen-safe bg-white dark:bg-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="drawer-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`drawer ${sidebarOpen ? 'open' : 'closed'} md:relative md:translate-x-0 md:w-64 md:shadow-none`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              AIGM
            </h1>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="btn-icon"
                aria-label="Close sidebar"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto scrollbar-touch p-4">
            <div className="space-y-2">
              {/* Friends */}
              <a
                href="/friends"
                className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors min-h-touch ${
                  isActive('/friends')
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <FiUsers className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">Friends</span>
              </a>

              {/* Servers Section */}
              <div className="pt-4">
                <h3 className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Servers
                </h3>
                <div className="space-y-1">
                  {mockServers.map((server) => (
                    <a
                      key={server.id}
                      href={`/servers/${server.id}`}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors min-h-touch ${
                        isActive(`/servers/${server.id}`)
                          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        {server.icon ? (
                          <span className="text-lg">{server.icon}</span>
                        ) : (
                          <FiHome className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-medium truncate">{server.name}</span>
                    </a>
                  ))}

                  {/* Create Server Button */}
                  {canCreateServer && (
                    <button
                      className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors min-h-touch w-full text-left text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      onClick={() => {
                        // TODO: Open create server modal
                        console.log('Create server')
                      }}
                    >
                      <div className="w-8 h-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FiPlus className="w-4 h-4" />
                      </div>
                      <span className="font-medium">Create Server</span>
                    </button>
                  )}

                  {/* Server limit indicator */}
                  {!canCreateServer && (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      Server limit reached (3/3)
                    </div>
                  )}
                </div>
              </div>

              {/* Spaces Section (Phase 2 placeholder) */}
              <div className="pt-4">
                <h3 className="px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
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
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                    {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email || '@user'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  // TODO: Open settings
                  console.log('Open settings')
                }}
                className="btn-icon flex-1"
                aria-label="Settings"
              >
                <FiSettings className="w-4 h-4" />
              </button>
              <button
                onClick={toggleTheme}
                className="btn-icon flex-1"
                aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button
                onClick={logout}
                className="btn-icon flex-1 text-red-600 dark:text-red-400"
                aria-label="Logout"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 md:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="btn-icon"
              aria-label="Open sidebar"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              AIGM
            </h1>
            <div className="w-11" /> {/* Spacer for centering */}
          </header>
        )}

        {/* Page Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  )
}

export default BaseLayout