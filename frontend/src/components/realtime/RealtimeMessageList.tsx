// Real-time Message List Component
import React, { useEffect, useRef, useState } from 'react'
import { FiUser, FiClock } from 'react-icons/fi'
import { format } from 'date-fns'
import { useAblyChannel } from '../../hooks/useAblyChannel'
import MessageRenderer from '../editor/MessageRenderer'
import { ConnectionIndicator } from './ConnectionStatus'

interface RealtimeMessageListProps {
  roomId: string
  className?: string
}

interface TypingIndicatorProps {
  users: Array<{ userId: string; userName: string }>
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ users }) => {
  if (users.length === 0) return null

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`
    } else {
      return `${users[0].userName} and ${users.length - 1} others are typing...`
    }
  }

  return (
    <div className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg mb-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="italic">{getTypingText()}</span>
    </div>
  )
}

export const RealtimeMessageList: React.FC<RealtimeMessageListProps> = ({ 
  roomId, 
  className = '' 
}) => {
  const { 
    messages, 
    typingUsers, 
    presenceUsers, 
    isSubscribed, 
    error 
  } = useAblyChannel(roomId)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isNearBottom, setIsNearBottom] = useState(true)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, shouldAutoScroll, isNearBottom])

  // Check if user is near bottom of messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNear = scrollHeight - scrollTop - clientHeight < 100
    setIsNearBottom(isNear)
    setShouldAutoScroll(isNear)
  }

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return format(timestamp, 'HH:mm')
    } else if (diffInHours < 24) {
      return format(timestamp, 'HH:mm')
    } else {
      return format(timestamp, 'MMM d, HH:mm')
    }
  }

  const groupMessagesByDate = () => {
    const grouped: Array<{ date: string; messages: typeof messages }> = []
    
    messages.forEach(message => {
      const dateStr = format(message.timestamp, 'yyyy-MM-dd')
      const existingGroup = grouped.find(g => g.date === dateStr)
      
      if (existingGroup) {
        existingGroup.messages.push(message)
      } else {
        grouped.push({
          date: dateStr,
          messages: [message]
        })
      }
    })
    
    return grouped
  }

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today'
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday'
    } else {
      return format(date, 'MMMM d, yyyy')
    }
  }

  if (!isSubscribed) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">Connecting to real-time...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with connection status and presence */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Room: {roomId}
          </h3>
          {presenceUsers.length > 0 && (
            <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
              <FiUser className="w-4 h-4" />
              <span>{presenceUsers.filter(u => u.isOnline).length} online</span>
            </div>
          )}
        </div>
        
        <ConnectionIndicator />
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p>No messages yet. Be the first to send a message!</p>
          </div>
        ) : (
          groupMessagesByDate().map(group => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {formatDateHeader(group.date)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((message, index) => {
                  const prevMessage = index > 0 ? group.messages[index - 1] : null
                  const showSender = !prevMessage || prevMessage.senderId !== message.senderId
                  const isCurrentUser = message.senderId === 'current-user' // TODO: Get from auth context
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`
                        max-w-[80%] md:max-w-[70%] rounded-lg p-3 
                        ${isCurrentUser 
                          ? 'bg-primary-600 text-white' 
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        }
                        ${message.optimistic ? 'opacity-70' : ''}
                      `}>
                        {/* Sender name (for non-current users) */}
                        {showSender && !isCurrentUser && (
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                            {message.senderName}
                          </div>
                        )}

                        {/* Message content */}
                        <div className="message-content">
                          <MessageRenderer content={message.content} />
                        </div>

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-2">
                            {message.attachments.map(attachment => (
                              <div
                                key={attachment.id}
                                className="flex items-center space-x-2 p-2 bg-black/10 rounded text-sm"
                              >
                                <span className="font-medium">{attachment.name}</span>
                                <span className="text-xs opacity-75">
                                  ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Timestamp */}
                        <div className={`
                          flex items-center justify-end mt-2 text-xs
                          ${isCurrentUser ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'}
                        `}>
                          <FiClock className="w-3 h-3 mr-1" />
                          {formatMessageTime(message.timestamp)}
                          {message.optimistic && (
                            <span className="ml-1 opacity-50">Sending...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Typing indicators */}
        <TypingIndicator users={typingUsers} />

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && messages.length > 0 && (
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => {
              setShouldAutoScroll(true)
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-full shadow-lg transition-colors"
            title="Scroll to bottom"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}