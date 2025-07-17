// Real-time Connection Status Component
import React from 'react'
import { FiWifi, FiWifiOff, FiRefreshCw, FiAlertCircle } from 'react-icons/fi'
import { useAblyConnection } from '../../contexts/AblyContext'

interface ConnectionStatusProps {
  showDetails?: boolean
  className?: string
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { connectionState, isConnected, isConnecting, error, reconnect } = useAblyConnection()

  const getStatusIcon = () => {
    if (isConnected) return <FiWifi className="w-4 h-4 text-green-500" />
    if (isConnecting) return <FiRefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
    if (error) return <FiAlertCircle className="w-4 h-4 text-red-500" />
    return <FiWifiOff className="w-4 h-4 text-gray-500" />
  }

  const getStatusText = () => {
    if (isConnected) return 'Connected'
    if (isConnecting) return 'Connecting...'
    if (error) return 'Connection Error'
    return 'Disconnected'
  }

  const getStatusColor = () => {
    if (isConnected) return 'text-green-600 dark:text-green-400'
    if (isConnecting) return 'text-yellow-600 dark:text-yellow-400'
    if (error) return 'text-red-600 dark:text-red-400'
    return 'text-gray-600 dark:text-gray-400'
  }

  const getBgColor = () => {
    if (isConnected) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (isConnecting) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    if (error) return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800'
  }

  if (!showDetails && isConnected) {
    // Just show a small indicator when connected
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      {/* Compact Status */}
      <div className={`
        flex items-center justify-between p-2 rounded-lg border
        ${getBgColor()}
        ${showDetails ? 'mb-2' : ''}
      `}>
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {!isConnected && !isConnecting && (
          <button
            onClick={reconnect}
            className="p-1 rounded bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors"
            title="Reconnect"
          >
            <FiRefreshCw className="w-3 h-3 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>State:</span>
              <span className="font-mono">{connectionState}</span>
            </div>
          </div>

          {error && (
            <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Network Status */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            <div className="flex justify-between">
              <span>Network:</span>
              <span className={navigator.onLine ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {navigator.onLine ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Minimal connection indicator for mobile
export const ConnectionIndicator: React.FC = () => {
  const { isConnected, isConnecting, error } = useAblyConnection()

  if (isConnected) {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-green-600 dark:text-green-400 font-medium">Live</span>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span className="text-xs text-yellow-600 dark:text-yellow-400">Connecting</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span className="text-xs text-red-600 dark:text-red-400">Offline</span>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-1">
      <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
      <span className="text-xs text-gray-500 dark:text-gray-400">Disconnected</span>
    </div>
  )
}