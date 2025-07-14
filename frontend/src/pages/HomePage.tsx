import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            AIGM
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            AI Generative Messaging
          </p>
        </div>
        
        <div className="space-y-4">
          <Link
            to="/auth"
            className="w-full btn-primary block text-center"
          >
            Get Started
          </Link>
          
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            Phase 1: Web Application
          </p>
        </div>
      </div>
    </div>
  )
}