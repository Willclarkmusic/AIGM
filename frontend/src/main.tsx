import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { AblyProvider } from './contexts/AblyContext'
import { initializeUIStore } from './stores/uiStore'
import { initializeAuth } from './stores/authStore'
import App from './App'
import './index.css'

// Initialize stores for responsive behavior and auth
initializeUIStore()
initializeAuth()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AblyProvider clientId="user-demo">
          <App />
        </AblyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)