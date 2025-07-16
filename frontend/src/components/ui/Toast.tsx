import { useState, useEffect } from 'react'
import { 
  FiCheckCircle, 
  FiAlertCircle, 
  FiInfo, 
  FiX, 
  FiAlertTriangle 
} from 'react-icons/fi'
import { useResponsive } from '../../stores/uiStore'

export interface ToastData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
  persistent?: boolean
}

interface ToastProps {
  toast: ToastData
  onRemove: (id: string) => void
}

interface ToastContainerProps {
  toasts: ToastData[]
  onRemove: (id: string) => void
}

// Individual Toast Component
function Toast({ toast, onRemove }: ToastProps) {
  const { isMobile } = useResponsive()
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto-dismiss after duration
    if (!toast.persistent && toast.duration !== 0) {
      const duration = toast.duration || 5000
      const timer = setTimeout(() => {
        handleRemove()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [toast.duration, toast.persistent])

  const handleRemove = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onRemove(toast.id)
    }, 300) // Match exit animation duration
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'error':
        return <FiAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'warning':
        return <FiAlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      case 'info':
        return <FiInfo className="w-5 h-5 text-blue-600 dark:text-blue-400" />
      default:
        return <FiInfo className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getBackgroundColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
    }
  }

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving 
          ? 'translate-x-0 opacity-100' 
          : isMobile 
            ? 'translate-x-full opacity-0' 
            : 'translate-x-full opacity-0'
        }
        ${isMobile ? 'w-full' : 'w-80'}
      `}
    >
      <div className={`
        border rounded-lg shadow-lg p-4 ${getBackgroundColor()}
        ${isMobile ? 'mx-4' : ''}
      `}>
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {toast.title}
            </h4>
            {toast.message && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                {toast.message}
              </p>
            )}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 btn-icon p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close notification"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Bar (for timed toasts) */}
        {!toast.persistent && toast.duration !== 0 && (
          <div className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current opacity-30 transition-all ease-linear"
              style={{
                animation: `toast-progress ${toast.duration || 5000}ms linear`,
                width: '100%'
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const { isMobile, safePadding } = useResponsive()

  if (toasts.length === 0) return null

  return (
    <>
      {/* Toast Styles */}
      <style>{`
        @keyframes toast-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Container */}
      <div
        className={`
          fixed z-50 pointer-events-none
          ${isMobile 
            ? 'top-0 left-0 right-0' 
            : 'top-4 right-4'
          }
        `}
        style={{
          paddingTop: isMobile ? safePadding.top + 16 : 0
        }}
      >
        <div className={`
          flex flex-col space-y-3 pointer-events-auto
          ${isMobile ? 'items-stretch' : 'items-end'}
        `}>
          {toasts.map((toast) => (
            <Toast 
              key={toast.id} 
              toast={toast} 
              onRemove={onRemove} 
            />
          ))}
        </div>
      </div>
    </>
  )
}

// Toast Hook for easy usage
export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const addToast = (toastData: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: ToastData = {
      id,
      duration: 5000,
      ...toastData
    }

    setToasts(prev => [...prev, toast])
    return id
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const removeAllToasts = () => {
    setToasts([])
  }

  // Convenience methods
  const success = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'success', title, message, ...options })
  }

  const error = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'error', title, message, ...options })
  }

  const warning = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'warning', title, message, ...options })
  }

  const info = (title: string, message?: string, options?: Partial<ToastData>) => {
    return addToast({ type: 'info', title, message, ...options })
  }

  return {
    toasts,
    addToast,
    removeToast,
    removeAllToasts,
    success,
    error,
    warning,
    info,
    ToastContainer: () => <ToastContainer toasts={toasts} onRemove={removeToast} />
  }
}

export default Toast