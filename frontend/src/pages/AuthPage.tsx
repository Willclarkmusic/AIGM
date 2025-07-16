import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

function AuthPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/friends')
    }
  }, [isAuthenticated, navigate])

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

  return (
    <div className="min-h-screen-safe flex items-center justify-center bg-white dark:bg-gray-900 p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">A</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AIGM
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            AI Generative Messaging
          </p>
        </div>
        
        {/* Login Card */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Welcome to AIGM
          </h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Connect with friends globally</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Join up to 3 servers</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Share files and media</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
              <span className="text-orange-500">🔮</span>
              <span className="text-sm">AI-powered messaging (coming soon)</span>
            </div>
          </div>
          
          <button
            onClick={login}
            className="btn-primary w-full text-lg"
          >
            Sign In / Sign Up
          </button>
          
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>

        {/* Mobile-specific footer */}
        <div className="text-center pt-4 md:hidden">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Best experienced on mobile and desktop
          </p>
        </div>
      </div>
    </div>
  )
}

export default AuthPage