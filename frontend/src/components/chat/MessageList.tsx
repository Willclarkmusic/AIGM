import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  FiMoreHorizontal, 
  FiEdit3, 
  FiTrash2, 
  FiCornerUpLeft, 
  FiSmile,
  FiChevronDown,
  FiChevronUp,
  FiFile,
  FiImage,
  FiExternalLink
} from 'react-icons/fi'
import { useResponsive } from '../../stores/uiStore'
// import { formatDistanceToNow } from 'date-fns' // Removed for now to avoid dependency issues

interface User {
  id: string
  name: string
  username: string
  avatar?: string
  isOnline: boolean
}

interface MessageReaction {
  emoji: string
  count: number
  users: User[]
  hasReacted: boolean
}

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

interface Message {
  id: string
  content: string
  author: User
  createdAt: Date
  updatedAt?: Date
  isEdited: boolean
  parentId?: string
  reactions: MessageReaction[]
  attachments: MessageAttachment[]
  replyCount?: number
  isGrouped?: boolean // If this message is grouped with the previous one
}

interface MessageListProps {
  messages: Message[]
  currentUserId: string
  onMessageEdit?: (messageId: string, content: string) => void
  onMessageDelete?: (messageId: string) => void
  onMessageReact?: (messageId: string, emoji: string) => void
  onMessageReply?: (messageId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
}

// Mock data for development
const mockMessages: Message[] = [
  {
    id: '1',
    content: 'Hey everyone! Welcome to the server 🎉',
    author: {
      id: 'user1',
      name: 'Alice Johnson',
      username: 'alice_j',
      isOnline: true
    },
    createdAt: new Date('2024-01-11T10:00:00'),
    isEdited: false,
    reactions: [
      { emoji: '👋', count: 3, users: [], hasReacted: false },
      { emoji: '🎉', count: 1, users: [], hasReacted: true }
    ],
    attachments: []
  },
  {
    id: '2',
    content: 'Thanks Alice! Great to be here',
    author: {
      id: 'user2',
      name: 'Bob Smith',
      username: 'bob_smith',
      isOnline: true
    },
    createdAt: new Date('2024-01-11T10:05:00'),
    isEdited: false,
    reactions: [],
    attachments: []
  },
  {
    id: '3',
    content: 'Does anyone want to hop on a voice channel later?',
    author: {
      id: 'user2',
      name: 'Bob Smith',
      username: 'bob_smith',
      isOnline: true
    },
    createdAt: new Date('2024-01-11T10:06:00'),
    isEdited: false,
    reactions: [],
    attachments: [],
    isGrouped: true
  },
  {
    id: '4',
    content: 'I\'m down! What time were you thinking?',
    author: {
      id: 'user3',
      name: 'Charlie Brown',
      username: 'charlie_b',
      isOnline: false
    },
    createdAt: new Date('2024-01-11T10:10:00'),
    isEdited: false,
    reactions: [],
    attachments: [],
    parentId: '3',
    replyCount: 2
  },
  {
    id: '5',
    content: 'Check out this cool screenshot I took!',
    author: {
      id: 'user1',
      name: 'Alice Johnson',
      username: 'alice_j',
      isOnline: true
    },
    createdAt: new Date('2024-01-11T10:15:00'),
    isEdited: false,
    reactions: [
      { emoji: '🔥', count: 2, users: [], hasReacted: false }
    ],
    attachments: [
      {
        id: 'att1',
        fileName: 'screenshot.png',
        fileSize: 1024000,
        mimeType: 'image/png',
        url: 'https://picsum.photos/800/600',
        thumbnailUrl: 'https://picsum.photos/400/300',
        width: 800,
        height: 600
      }
    ]
  },
  {
    id: '6',
    content: 'Here\'s the document we discussed earlier',
    author: {
      id: 'user4',
      name: 'David Wilson',
      username: 'david_w',
      isOnline: false
    },
    createdAt: new Date('2024-01-11T10:20:00'),
    isEdited: true,
    updatedAt: new Date('2024-01-11T10:21:00'),
    reactions: [],
    attachments: [
      {
        id: 'att2',
        fileName: 'project-plan.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
        url: '/files/project-plan.pdf'
      }
    ]
  }
]

function MessageList({
  messages = mockMessages,
  currentUserId = 'user1',
  onMessageEdit,
  onMessageDelete,
  onMessageReact,
  onMessageReply,
  onLoadMore,
  hasMore = false,
  loading = false
}: MessageListProps) {
  const { isMobile } = useResponsive()
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Group messages by author and time
  const groupedMessages = useMemo(() => {
    const grouped: Message[] = []
    
    messages.forEach((message, index) => {
      const prevMessage = messages[index - 1]
      const shouldGroup = prevMessage && 
        prevMessage.author.id === message.author.id &&
        !message.parentId &&
        !prevMessage.parentId &&
        new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000 // 5 minutes
      
      grouped.push({
        ...message,
        isGrouped: shouldGroup
      })
    })
    
    return grouped
  }, [messages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleReactionClick = (messageId: string, emoji: string) => {
    onMessageReact?.(messageId, emoji)
  }

  const handleReplyToggle = (messageId: string) => {
    const newExpanded = new Set(expandedReplies)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedReplies(newExpanded)
  }

  const renderAttachment = (attachment: MessageAttachment) => {
    const isImage = attachment.mimeType.startsWith('image/')
    
    if (isImage) {
      return (
        <div key={attachment.id} className="mt-2">
          <img
            src={attachment.thumbnailUrl || attachment.url}
            alt={attachment.fileName}
            className="max-w-full max-h-80 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(attachment.url, '_blank')}
          />
        </div>
      )
    }

    return (
      <div key={attachment.id} className="mt-2">
        <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-sm">
          <div className="flex-shrink-0">
            {attachment.mimeType.includes('pdf') ? (
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded flex items-center justify-center">
                <FiFile className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                <FiFile className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {attachment.fileName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
          <button
            onClick={() => window.open(attachment.url, '_blank')}
            className="btn-icon p-1"
            aria-label="Open file"
          >
            <FiExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const renderMessage = (message: Message) => {
    const isOwn = message.author.id === currentUserId
    const isReply = !!message.parentId
    const hasReplies = (message.replyCount || 0) > 0

    return (
      <div
        key={message.id}
        className={`group relative ${isReply ? 'ml-6 pl-4 border-l-2 border-gray-200 dark:border-gray-700' : ''}`}
      >
        <div className={`flex space-x-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${message.isGrouped ? 'pt-1' : 'pt-4'}`}>
          {/* Avatar */}
          {!message.isGrouped && (
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                  {message.author.name.charAt(0)}
                </span>
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className={`flex-1 min-w-0 ${message.isGrouped ? 'ml-[52px]' : ''}`}>
            {/* Header */}
            {!message.isGrouped && (
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {message.author.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatTime(message.createdAt)}
                </span>
                {message.isEdited && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    (edited)
                  </span>
                )}
              </div>
            )}

            {/* Content */}
            <div className="text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
              {message.content}
            </div>

            {/* Attachments */}
            {message.attachments.map(renderAttachment)}

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => handleReactionClick(message.id, reaction.emoji)}
                    className={`
                      flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors
                      ${reaction.hasReacted
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 border border-primary-200 dark:border-primary-800'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <span>{reaction.emoji}</span>
                    <span>{reaction.count}</span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    // Show emoji picker
                    console.log('Show emoji picker for', message.id)
                  }}
                  className="btn-icon p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Add reaction"
                >
                  <FiSmile className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Reply Toggle */}
            {hasReplies && (
              <button
                onClick={() => handleReplyToggle(message.id)}
                className="flex items-center space-x-2 mt-2 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                {expandedReplies.has(message.id) ? (
                  <FiChevronUp className="w-4 h-4" />
                ) : (
                  <FiChevronDown className="w-4 h-4" />
                )}
                <span>{message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}</span>
              </button>
            )}
          </div>

          {/* Message Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMessageReply?.(message.id)}
              className="btn-icon p-1"
              aria-label="Reply"
            >
              <FiCornerUpLeft className="w-4 h-4" />
            </button>
            {isOwn && (
              <>
                <button
                  onClick={() => onMessageEdit?.(message.id, message.content)}
                  className="btn-icon p-1"
                  aria-label="Edit"
                >
                  <FiEdit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMessageDelete?.(message.id)}
                  className="btn-icon p-1 text-red-600 dark:text-red-400"
                  aria-label="Delete"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={() => setSelectedMessage(selectedMessage === message.id ? null : message.id)}
              className="btn-icon p-1"
              aria-label="More options"
            >
              <FiMoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Options Menu */}
        {selectedMessage === message.id && (
          <div className="absolute right-4 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content)
                setSelectedMessage(null)
              }}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            >
              <span>Copy Text</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.id)
                setSelectedMessage(null)
              }}
              className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left"
            >
              <span>Copy ID</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center p-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Loading...' : 'Load More Messages'}
          </button>
        </div>
      )}

      {/* Messages Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-touch"
      >
        <div className="pb-4">
          {groupedMessages.map(renderMessage)}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* Click outside to close menus */}
      {selectedMessage && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setSelectedMessage(null)}
        />
      )}
    </div>
  )
}

export default MessageList