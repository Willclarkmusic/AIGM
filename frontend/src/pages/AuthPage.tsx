export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to AIGM
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sign in to your account
          </p>
        </div>
        
        <div className="space-y-4">
          <button className="w-full btn-primary">
            Sign in with Auth0
          </button>
          
          <p className="text-sm text-center text-gray-500 dark:text-gray-400">
            Auth0 integration pending
          </p>
        </div>
      </div>
    </div>
  )
}