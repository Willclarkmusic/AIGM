import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AuthPage from './pages/AuthPage'
import ServerPage from './pages/ServerPage'
import FriendsPage from './components/friends/FriendsPage'
import SettingsPage from './pages/SettingsPage'
import TestPage from './pages/TestPage'
import EditorTestPage from './pages/EditorTestPage'
import RealtimeTestPage from './pages/RealtimeTestPage'
import HomeTemp from './pages/HomeTemp'
import AppLayout from './components/layout/AppLayout'

function App() {
  // Theme initialization is now handled in main.tsx via initializeUIStore()
  // Theme application to document is handled in uiStore.ts setTheme function

  return (
    <div className="min-h-screen-safe bg-white dark:bg-gray-900">
      <Routes>
        {/* Root route redirects to home-temp for complete demo */}
        <Route path="/" element={<Navigate to="/home-temp" replace />} />
        
        {/* Auth routes */}
        <Route path="/login" element={<AuthPage />} />
        
        {/* Test page for component demo */}
        <Route path="/test" element={<TestPage />} />
        
        {/* Editor test page */}
        <Route path="/editor" element={<EditorTestPage />} />
        
        {/* Real-time test page */}
        <Route path="/realtime" element={<RealtimeTestPage />} />
        
        {/* Complete AIGM Demo Interface */}
        <Route path="/home-temp" element={<HomeTemp />} />
        
        {/* Main app routes with layout */}
        <Route path="/friends" element={
          <AppLayout>
            <FriendsPage />
          </AppLayout>
        } />
        
        {/* Server routes */}
        <Route path="/servers/:serverId" element={<ServerPage />} />
        <Route path="/servers/:serverId/rooms/:roomId" element={<ServerPage />} />
        
        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />
        
        {/* Catch all redirect */}
        <Route path="*" element={<Navigate to="/test" replace />} />
      </Routes>
    </div>
  )
}

export default App