import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface AuthContextType {
  user: any
  isAuthenticated: boolean
  isLoading: boolean
  isEmailVerified: boolean
  login: () => void
  logout: () => void
  resendVerification: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

function AuthContent({ children }: AuthProviderProps) {
  // Use our Zustand auth store instead of Auth0 directly
  const {
    user,
    isAuthenticated,
    isLoading,
    isEmailVerified,
    login: storeLogin,
    logout: storeLogout,
    resendVerification: storeResendVerification,
  } = useAuthStore()
  
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to main app if email is verified
      if (isEmailVerified) {
        const currentPath = window.location.pathname
        if (currentPath === '/login' || currentPath === '/') {
          navigate('/friends')
        }
      }
    }
  }, [isAuthenticated, user, isEmailVerified, navigate])

  const login = async () => {
    try {
      await storeLogin()
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const logout = async () => {
    try {
      await storeLogout()
      navigate('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const resendVerification = async () => {
    try {
      await storeResendVerification()
    } catch (error) {
      console.error('Error resending verification email:', error)
      throw error
    }
  }

  // Show loading screen while Auth0 is initializing
  if (isLoading) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated (except on login page)
  if (!isAuthenticated && window.location.pathname !== '/login') {
    navigate('/login')
    return null
  }

  // Show email verification screen if authenticated but email not verified
  if (isAuthenticated && !isEmailVerified) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Verify Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've sent a verification email to <strong>{user?.email}</strong>. 
            Please check your inbox and click the verification link to continue.
          </p>
          <div className="space-y-3">
            <button
              onClick={resendVerification}
              className="btn-primary w-full"
            >
              Resend Verification Email
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary w-full"
            >
              I've Verified My Email
            </button>
            <button
              onClick={logout}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Use Different Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    isEmailVerified,
    login,
    logout,
    resendVerification,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function AuthProvider({ children }: AuthProviderProps) {
  // For now, just use the Zustand store directly
  // TODO: Add back Auth0Provider when dependencies are properly installed
  
  return <AuthContent>{children}</AuthContent>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}