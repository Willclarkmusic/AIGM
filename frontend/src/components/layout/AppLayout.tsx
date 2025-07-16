import { useState, useEffect } from 'react'
import { FiMenu } from 'react-icons/fi'
import { useUIStore, useResponsive } from '../../stores/uiStore'
import Sidebar from '../navigation/Sidebar'

interface AppLayoutProps {
  children: React.ReactNode
}

function AppLayout({ children }: AppLayoutProps) {
  const { isMobile, isTablet } = useResponsive()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Auto-close sidebar when switching to mobile
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false)
    }
  }, [isMobile])

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <div className="flex h-screen-safe bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen || !isMobile} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        {isMobile && (
          <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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

export default AppLayout