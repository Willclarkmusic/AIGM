import { memo } from 'react'
import { FiExternalLink, FiFile, FiImage, FiDownload } from 'react-icons/fi'

interface MessageAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
}

interface MessageRendererProps {
  content: string
  attachments?: MessageAttachment[]
  className?: string
  compact?: boolean
  onLinkClick?: (url: string) => void
  onAttachmentClick?: (attachment: MessageAttachment) => void
}

const MessageRenderer = memo(({
  content,
  attachments = [],
  className = '',
  compact = false,
  onLinkClick,
  onAttachmentClick
}: MessageRendererProps) => {
  
  // Process content to handle mentions, links, etc.
  const processedContent = content
    // Handle mentions - they should already have proper classes from TipTap
    .replace(
      /@(\w+)/g,
      '<span class="mention bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-1 py-0.5 rounded font-medium">@$1</span>'
    )

  // Format file size
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Handle link clicks
  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    
    if (target.tagName === 'A') {
      e.preventDefault()
      const href = target.getAttribute('href')
      if (href) {
        if (onLinkClick) {
          onLinkClick(href)
        } else {
          window.open(href, '_blank', 'noopener,noreferrer')
        }
      }
    }
  }

  // Render image attachment
  const renderImageAttachment = (attachment: MessageAttachment) => (
    <div
      key={attachment.id}
      className="mt-2 group cursor-pointer"
      onClick={() => onAttachmentClick?.(attachment)}
    >
      <div className="relative inline-block max-w-full">
        <img
          src={attachment.thumbnailUrl || attachment.url}
          alt={attachment.fileName}
          className={`
            max-w-full h-auto rounded-lg transition-all duration-200
            ${compact ? 'max-h-32' : 'max-h-80'}
            group-hover:opacity-90 group-hover:scale-[1.02]
          `}
          loading="lazy"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <FiExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
          </div>
        </div>
      </div>
      
      {!compact && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {attachment.fileName} • {formatFileSize(attachment.fileSize)}
        </div>
      )}
    </div>
  )

  // Render file attachment
  const renderFileAttachment = (attachment: MessageAttachment) => (
    <div
      key={attachment.id}
      className="mt-2 group"
    >
      <div 
        className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer max-w-sm"
        onClick={() => onAttachmentClick?.(attachment)}
      >
        {/* File Icon */}
        <div className="flex-shrink-0">
          {attachment.mimeType.includes('pdf') ? (
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <FiFile className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          ) : attachment.mimeType.includes('image') ? (
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <FiImage className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          ) : (
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <FiFile className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          )}
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {attachment.fileName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>

        {/* Download Icon */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FiDownload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
      </div>
    </div>
  )

  return (
    <div className={`message-renderer ${className}`}>
      {/* Message Content */}
      {content && (
        <div
          className={`
            prose prose-sm dark:prose-invert max-w-none
            prose-p:my-1 prose-p:leading-relaxed
            prose-strong:font-semibold prose-strong:text-gray-900 dark:prose-strong:text-white
            prose-em:italic prose-em:text-gray-800 dark:prose-em:text-gray-200
            prose-code:bg-gray-100 dark:prose-code:bg-gray-800 
            prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-sm prose-code:font-mono
            prose-code:before:content-none prose-code:after:content-none
            prose-a:text-primary-600 dark:prose-a:text-primary-400 
            prose-a:no-underline hover:prose-a:underline
            prose-ul:my-2 prose-ul:ml-4 prose-ul:list-disc
            prose-ol:my-2 prose-ol:ml-4 prose-ol:list-decimal
            prose-li:my-1
            prose-h1:text-xl prose-h1:font-bold prose-h1:my-3 prose-h1:text-gray-900 dark:prose-h1:text-white
            prose-h2:text-lg prose-h2:font-semibold prose-h2:my-2 prose-h2:text-gray-800 dark:prose-h2:text-gray-100
            prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600
            prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
            ${compact ? 'text-sm prose-h1:text-lg prose-h2:text-base' : ''}
          `}
          dangerouslySetInnerHTML={{ __html: processedContent }}
          onClick={handleLinkClick}
        />
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="attachments">
          {attachments.map((attachment) => {
            const isImage = attachment.mimeType.startsWith('image/')
            
            return isImage 
              ? renderImageAttachment(attachment)
              : renderFileAttachment(attachment)
          })}
        </div>
      )}
    </div>
  )
})

MessageRenderer.displayName = 'MessageRenderer'

export default MessageRenderer

// Utility function to extract plain text from HTML content
export const extractTextContent = (html: string): string => {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || div.innerText || ''
}

// Utility function to generate message preview
export const generateMessagePreview = (content: string, maxLength: number = 100): string => {
  const text = extractTextContent(content)
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

// Utility function to check if message contains mentions
export const containsMentions = (content: string): boolean => {
  return content.includes('class="mention"') || /@\w+/.test(content)
}

// Utility function to extract mentioned usernames
export const extractMentions = (content: string): string[] => {
  const matches = content.match(/@(\w+)/g)
  return matches ? matches.map(match => match.substring(1)) : []
}