import { useState, useRef, useEffect } from 'react'
import { FiX, FiLink, FiExternalLink } from 'react-icons/fi'

interface LinkDialogProps {
  onLinkAdd: (url: string, text?: string) => void
  onLinkRemove?: () => void
  onClose: () => void
  currentUrl?: string
  currentText?: string
  className?: string
}

const LinkDialog = ({ 
  onLinkAdd, 
  onLinkRemove,
  onClose, 
  currentUrl = '',
  currentText = '',
  className = '' 
}: LinkDialogProps) => {
  const [url, setUrl] = useState(currentUrl)
  const [text, setText] = useState(currentText)
  const [isValidUrl, setIsValidUrl] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)

  // Validate URL
  useEffect(() => {
    const validateUrl = (urlString: string) => {
      try {
        // Add protocol if missing
        const urlWithProtocol = urlString.startsWith('http://') || urlString.startsWith('https://') 
          ? urlString 
          : `https://${urlString}`
        
        const urlObj = new URL(urlWithProtocol)
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
      } catch {
        return false
      }
    }

    setIsValidUrl(url.length > 0 && validateUrl(url))
  }, [url])

  // Focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus()
  }, [])

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'Enter' && isValidUrl) {
        handleSubmit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, isValidUrl, url, text])

  const handleSubmit = () => {
    if (!isValidUrl) return

    // Add protocol if missing
    const finalUrl = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`

    onLinkAdd(finalUrl, text || undefined)
    onClose()
  }

  const handleRemoveLink = () => {
    onLinkRemove?.()
    onClose()
  }

  const formatPreviewUrl = (urlString: string) => {
    try {
      const urlWithProtocol = urlString.startsWith('http://') || urlString.startsWith('https://') 
        ? urlString 
        : `https://${urlString}`
      const urlObj = new URL(urlWithProtocol)
      return urlObj.hostname + urlObj.pathname
    } catch {
      return urlString
    }
  }

  return (
    <div
      ref={dialogRef}
      className={`link-dialog-container bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[320px] max-w-[400px] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <FiLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {currentUrl ? 'Edit Link' : 'Add Link'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="btn-icon p-1"
          aria-label="Close link dialog"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* URL Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          URL
        </label>
        <input
          ref={urlInputRef}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com or example.com"
          className={`
            w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            ${isValidUrl 
              ? 'border-green-300 dark:border-green-600' 
              : url.length > 0 
                ? 'border-red-300 dark:border-red-600' 
                : 'border-gray-300 dark:border-gray-600'
            }
          `}
        />
        {url.length > 0 && (
          <div className="mt-1 text-xs">
            {isValidUrl ? (
              <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                <FiExternalLink className="w-3 h-3" />
                <span>{formatPreviewUrl(url)}</span>
              </div>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                Please enter a valid URL
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text Input */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Display Text (optional)
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Link text"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Leave empty to use the URL as display text
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {currentUrl && onLinkRemove && (
            <button
              onClick={handleRemoveLink}
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
            >
              Remove Link
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValidUrl}
            className={`
              px-4 py-2 text-sm rounded-md transition-colors
              ${isValidUrl
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {currentUrl ? 'Update' : 'Add'} Link
          </button>
        </div>
      </div>
    </div>
  )
}

export default LinkDialog