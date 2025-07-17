import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import FriendsPage from '../components/friends/FriendsPage'
import RoomList from '../components/navigation/RoomList'
import MessageList from '../components/chat/MessageList'
import { useToast } from '../components/ui/Toast'
import { useResponsive } from '../stores/uiStore'
import { FiEdit3, FiExternalLink } from 'react-icons/fi'

function TestPage() {
  const { isMobile, isTablet, isDesktop } = useResponsive()
  const { success, error, warning, info, ToastContainer } = useToast()
  const [currentView, setCurrentView] = useState<'friends' | 'server' | 'chat'>('friends')
  const [selectedRoom, setSelectedRoom] = useState<string>('1')

  const handleToastTest = () => {
    success('Success!', 'This is a success message')
    setTimeout(() => {
      error('Error occurred', 'This is an error message with a longer description to test wrapping')
    }, 1000)
    setTimeout(() => {
      warning('Warning', 'This is a warning message')
    }, 2000)
    setTimeout(() => {
      info('Information', 'This is an info message', {
        action: {
          label: 'View Details',
          onClick: () => alert('Action clicked!')
        }
      })
    }, 3000)
  }

  const renderContent = () => {
    switch (currentView) {
      case 'friends':
        return <FriendsPage />
      
      case 'server':
        return (
          <div className="flex h-full">
            {/* Room List Sidebar */}
            <div className={`
              ${isMobile ? 'hidden' : 'w-64 border-r border-gray-200 dark:border-gray-700'}
            `}>
              <RoomList 
                serverId="1" 
                currentRoomId={selectedRoom}
                onRoomSelect={setSelectedRoom}
              />
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">#</span>
                    <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                      general
                    </h1>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} View
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Messages */}
              <MessageList
                messages={[]}
                currentUserId="user1"
                onMessageEdit={(id, content) => console.log('Edit:', id, content)}
                onMessageDelete={(id) => console.log('Delete:', id)}
                onMessageReact={(id, emoji) => console.log('React:', id, emoji)}
                onMessageReply={(id) => console.log('Reply to:', id)}
              />
            </div>
          </div>
        )
      
      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Message List Demo
              </h1>
            </div>
            <MessageList
              messages={[]}
              currentUserId="user1"
              onMessageEdit={(id, content) => console.log('Edit:', id, content)}
              onMessageDelete={(id) => console.log('Delete:', id)}
              onMessageReact={(id, emoji) => console.log('React:', id, emoji)}
              onMessageReply={(id) => console.log('Reply to:', id)}
            />
          </div>
        )
      
      default:
        return <FriendsPage />
    }
  }

  return (
    <AppLayout>
      {/* Test Navigation */}
      <div className="flex flex-col h-full">
        {/* Test Controls */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              AIGM Component Test
            </h2>
            
            {/* View Selector */}
            <div className="flex space-x-2 overflow-x-auto">
              <button
                onClick={() => setCurrentView('friends')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentView === 'friends'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Friends Page
              </button>
              <button
                onClick={() => setCurrentView('server')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentView === 'server'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Server View
              </button>
              <button
                onClick={() => setCurrentView('chat')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentView === 'chat'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                }`}
              >
                Message List
              </button>
            </div>

            {/* Test Buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleToastTest}
                className="btn-secondary"
              >
                Test Toasts
              </button>
              <button
                onClick={() => info('Device Info', `${isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} - Touch: ${navigator.maxTouchPoints > 0}`)}
                className="btn-secondary"
              >
                Device Info
              </button>
              <button
                onClick={() => success('Test Complete', 'All components are working correctly!')}
                className="btn-primary"
              >
                Test Success
              </button>
              <Link
                to="/editor"
                className="btn-secondary flex items-center space-x-2"
              >
                <FiEdit3 className="w-4 h-4" />
                <span>TipTap Editor</span>
                <FiExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {/* Mobile Test Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>Current:</strong> {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'} View</p>
              <p><strong>Screen:</strong> {window.innerWidth}x{window.innerHeight}px</p>
              <p><strong>Touch:</strong> {navigator.maxTouchPoints > 0 ? 'Supported' : 'Not supported'}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer />
    </AppLayout>
  )
}

export default TestPage