// Enhanced Real-time Message List Component
import React, { useEffect, useRef, useState, useCallback } from 'react'
import { FiUser, FiClock, FiMoreVertical, FiChevronUp } from 'react-icons/fi'
import { format, isToday, isYesterday, differenceInHours } from 'date-fns'
import { useAblyChannel } from '../../hooks/useAblyChannel'
import MessageRenderer from '../editor/MessageRenderer'
import { ConnectionIndicator } from './ConnectionStatus'

interface EnhancedMessageListProps {
  roomId: string
  className?: string
  currentUserId?: string
}

interface TypingIndicatorProps {
  users: Array<{ userId: string; userName: string }>
}

// Generate demo usernames based on user ID
const generateUsername = (userId: string): string => {
  const adjectives = ['Swift', 'Brave', 'Wise', 'Cool', 'Epic', 'Bold', 'Smart', 'Quick']
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Lion', 'Fox', 'Bear', 'Hawk', 'Shark']
  
  // Use userId to generate consistent username
  const adjIndex = userId.length % adjectives.length
  const nounIndex = userId.charCodeAt(0) % nouns.length
  
  return `${adjectives[adjIndex]}${nouns[nounIndex]}`
}

// Generate avatar color based on user ID
const getAvatarColor = (userId: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
    'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
  ]
  return colors[userId.length % colors.length]
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
    <div className="flex items-center space-x-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg mx-4 mb-2">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 italic">{getTypingText()}</span>
    </div>
  )
}

export const EnhancedMessageList: React.FC<EnhancedMessageListProps> = ({ 
  roomId, 
  className = '',
  currentUserId = 'user-demo'
}) => {
  const { 
    messages, 
    typingUsers, 
    presenceUsers, 
    isSubscribed, 
    error 
  } = useAblyChannel(roomId)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [showLoadMore, setShowLoadMore] = useState(false)
  const [loadedMessagesCount, setLoadedMessagesCount] = useState(50)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll && isNearBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, shouldAutoScroll, isNearBottom])

  // Check if user is near bottom of messages
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isNear = scrollHeight - scrollTop - clientHeight < 100
    setIsNearBottom(isNear)
    setShouldAutoScroll(isNear)
    
    // Show load more button when scrolled to top
    setShowLoadMore(scrollTop < 100 && messages.length >= loadedMessagesCount)
  }, [messages.length, loadedMessagesCount])

  const formatTimestamp = (timestamp: Date) => {
    if (isToday(timestamp)) {
      return format(timestamp, 'HH:mm')
    } else if (isYesterday(timestamp)) {
      return `Yesterday ${format(timestamp, 'HH:mm')}`
    } else {
      return format(timestamp, 'MMM d, HH:mm')
    }
  }

  // Smart timestamp logic - show timestamp if more than 2 hours since last message
  const shouldShowTimestamp = (currentMessage: any, previousMessage: any) => {
    if (!previousMessage) return true
    const hoursDiff = differenceInHours(currentMessage.timestamp, previousMessage.timestamp)
    return hoursDiff >= 2
  }

  // Group consecutive messages from same user
  const groupMessages = () => {
    const grouped: Array<{
      id: string
      senderId: string
      senderName: string
      messages: typeof messages
      timestamp: Date
      showTimestamp: boolean
    }> = []

    // Sort messages chronologically (oldest first)
    const sortedMessages = [...messages].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    
    sortedMessages.slice(0, loadedMessagesCount).forEach((message, index) => {
      const previousMessage = index > 0 ? sortedMessages[index - 1] : null
      const showTimestamp = shouldShowTimestamp(message, previousMessage)
      
      // Check if we can group with previous group
      const lastGroup = grouped[grouped.length - 1]
      const canGroup = lastGroup && 
        lastGroup.senderId === message.senderId && 
        !showTimestamp &&
        differenceInHours(message.timestamp, lastGroup.timestamp) < 0.25 // Within 15 minutes

      if (canGroup) {
        lastGroup.messages.push(message)
      } else {
        grouped.push({
          id: message.id,
          senderId: message.senderId,
          senderName: generateUsername(message.senderId),
          messages: [message],
          timestamp: message.timestamp,
          showTimestamp
        })
      }
    })

    return grouped // Return in chronological order (oldest to newest)
  }

  const loadMoreMessages = () => {
    setLoadedMessagesCount(prev => prev + 50)
    setShowLoadMore(false)
  }

  const scrollToBottom = () => {
    setShouldAutoScroll(true)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (!isSubscribed) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">Connecting to real-time...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col h-full max-h-screen ${className}`}>
      {/* Header with room info and presence */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                #{roomId}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {presenceUsers.filter(u => u.isOnline).length} members online
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <ConnectionIndicator />
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <FiMoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex-shrink-0 p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Messages Container - This is the key fix for scrolling */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Load More Button */}
        {showLoadMore && (
          <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={loadMoreMessages}
              className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center space-x-2"
            >
              <FiChevronUp className="w-4 h-4" />
              <span>Load previous messages</span>
            </button>
          </div>
        )}

        {/* Scrollable Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4"
          onScroll={handleScroll}
        >
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No messages yet
                </h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Be the first to send a message in #{roomId}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupMessages().map(group => {
                const isCurrentUser = group.senderId === currentUserId
                
                return (
                  <div key={group.id} className="space-y-2">
                    {/* Timestamp */}
                    {group.showTimestamp && (
                      <div className="flex items-center justify-center my-6">
                        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {formatTimestamp(group.timestamp)}
                        </div>
                      </div>
                    )}

                    {/* Message Group */}
                    <div className={`flex items-start space-x-3 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getAvatarColor(group.senderId)} flex items-center justify-center text-white font-semibold text-sm`}>
                        {group.senderName.charAt(0)}
                      </div>

                      {/* Messages */}
                      <div className={`flex-1 max-w-[70%] ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
                        {/* Username and timestamp */}
                        <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">
                            {isCurrentUser ? 'You' : group.senderName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(group.timestamp, 'HH:mm')}
                          </span>
                        </div>

                        {/* Message bubbles */}
                        <div className="space-y-1">
                          {group.messages.map(message => (
                            <div
                              key={message.id}
                              className={`
                                relative px-4 py-2 rounded-2xl max-w-full
                                ${isCurrentUser 
                                  ? 'bg-primary-600 text-white rounded-br-md' 
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                                }
                                ${message.optimistic ? 'opacity-70' : ''}
                              `}
                            >
                              <div className="text-sm leading-relaxed">
                                <MessageRenderer content={message.content} />
                              </div>
                              
                              {/* Attachments */}
                              {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map(attachment => (
                                    <div
                                      key={attachment.id}
                                      className="flex items-center space-x-2 p-2 bg-black/10 rounded text-xs"
                                    >
                                      <span className="font-medium">{attachment.name}</span>
                                      <span className="opacity-75">
                                        ({(attachment.size / 1024 / 1024).toFixed(1)} MB)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Optimistic sending indicator */}
                              {message.optimistic && (
                                <div className="flex items-center justify-end mt-1">
                                  <FiClock className="w-3 h-3 opacity-50 mr-1" />
                                  <span className="text-xs opacity-50">Sending...</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicators */}
        <div className="flex-shrink-0">
          <TypingIndicator users={typingUsers.filter(u => u.userId !== currentUserId)} />
        </div>
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && messages.length > 0 && (
        <div className="absolute bottom-20 right-6">
          <button
            onClick={scrollToBottom}
            className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-full shadow-lg transition-all duration-200 flex items-center space-x-2"
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