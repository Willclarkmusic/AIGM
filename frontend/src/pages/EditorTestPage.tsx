import { useState } from 'react'
import { useResponsive } from '../stores/uiStore'
import MessageComposer from '../components/editor/MessageComposer'
import MessageRenderer from '../components/editor/MessageRenderer'
import { FiArrowLeft, FiUsers, FiSettings } from 'react-icons/fi'
import { MentionUser } from '../lib/tiptap'

interface Message {
  id: string
  content: string
  author: {
    id: string
    name: string
    username: string
    avatar?: string
  }
  timestamp: Date
  attachments: any[]
}

const EditorTestPage = () => {
  const { isMobile } = useResponsive()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: '<h1>Welcome to the Enhanced TipTap Editor! 🎉</h1><p>This demo showcases <strong>all the rich text features</strong> available:</p><ul><li><strong>Bold text</strong> and <em>italic text</em></li><li><u>Underlined text</u> and <code>inline code</code></li><li><span style="color: #dc2626">Colored text</span> and <mark style="background: #fef08a">highlighted text</mark></li><li><a href="https://tiptap.dev">Working links</a></li><li>Bullet points and numbered lists</li></ul><p>Try all the formatting options in the toolbar below! 👇</p>',
      author: {
        id: 'demo-user',
        name: 'Demo User',
        username: 'demo'
      },
      timestamp: new Date(Date.now() - 120000),
      attachments: []
    },
    {
      id: '2',
      content: '<h2>Pro Tips for Using the Editor</h2><p>Here are some <mark style="background: #bfdbfe">helpful shortcuts</mark> to get you started:</p><ul><li><strong>Cmd/Ctrl + B</strong> for bold</li><li><strong>Cmd/Ctrl + I</strong> for italic</li><li><strong>Cmd/Ctrl + U</strong> for underline</li><li><strong>Cmd/Ctrl + K</strong> for code</li><li><strong>Enter</strong> to send, <strong>Shift+Enter</strong> for new line</li></ul><p>Try mentioning <span style="color: #2563eb">@alice</span> or adding some 🎨 <span style="color: #dc2626">colorful</span> <span style="color: #16a34a">text</span>!</p>',
      author: {
        id: 'demo-user-2',
        name: 'Helper Bot',
        username: 'helper'
      },
      timestamp: new Date(Date.now() - 60000),
      attachments: []
    }
  ])

  // Mock users for mention autocomplete
  const mockUsers: MentionUser[] = [
    {
      id: '1',
      name: 'Alice Johnson',
      username: 'alice',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=32&h=32&fit=crop&crop=face',
      isOnline: true
    },
    {
      id: '2',
      name: 'Bob Smith',
      username: 'bob',
      isOnline: false
    },
    {
      id: '3',
      name: 'Charlie Brown',
      username: 'charlie',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
      isOnline: true
    },
    {
      id: '4',
      name: 'Diana Prince',
      username: 'diana',
      isOnline: true
    },
    {
      id: '5',
      name: 'Ethan Hunt',
      username: 'ethan',
      isOnline: false
    }
  ]

  // Handle mention query
  const handleMentionQuery = async (query: string): Promise<MentionUser[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return mockUsers.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5)
  }

  // Handle message send
  const handleSendMessage = async (content: string, attachments: any[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      content,
      author: {
        id: 'current-user',
        name: 'You',
        username: 'you'
      },
      timestamp: new Date(),
      attachments
    }

    setMessages(prev => [...prev, newMessage])
  }

  // Handle link clicks
  const handleLinkClick = (url: string) => {
    console.log('Link clicked:', url)
    // In real app, you might want to show a preview modal
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            {isMobile && (
              <button 
                onClick={() => window.history.back()}
                className="btn-icon"
                aria-label="Go back"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                TipTap Editor Demo
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rich text editing with mobile optimization
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="btn-icon">
              <FiUsers className="w-5 h-5" />
            </button>
            <button className="btn-icon">
              <FiSettings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="flex flex-col h-[calc(100vh-73px)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="flex space-x-3">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {message.author.avatar ? (
                  <img
                    src={message.author.avatar}
                    alt={message.author.name}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                      {message.author.name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {message.author.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(message.timestamp)}
                  </span>
                </div>

                {/* Content */}
                <MessageRenderer
                  content={message.content}
                  attachments={message.attachments}
                  onLinkClick={handleLinkClick}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Message Composer */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <MessageComposer
            placeholder="Type a message... Try @alice for mentions!"
            maxCharacters={2000}
            onSend={handleSendMessage}
            onMentionQuery={handleMentionQuery}
            roomId="demo-room"
          />
        </div>
      </div>

      {/* Feature Info Panel (Desktop) */}
      {!isMobile && (
        <div className="fixed top-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 max-h-[calc(100vh-6rem)] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ✨ Enhanced Rich Text Features
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Text Formatting:</strong> Bold, italic, underline, code
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Text Sizes:</strong> Heading 1, Heading 2, Normal text
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Text Colors:</strong> Full color picker for text styling
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Text Highlighting:</strong> Color highlight backgrounds
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Enhanced Links:</strong> Link dialog with URL validation
              </span>
            </div>

            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Lists:</strong> Bullet points and numbered lists
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>@Mentions:</strong> Type @alice to mention users
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Emoji Picker:</strong> Click 😊 in toolbar
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>File Attachments:</strong> Drag & drop or click 📎
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Image Paste:</strong> Paste images from clipboard
              </span>
            </div>
            
            <div className="flex items-start space-x-2">
              <span className="text-green-600 dark:text-green-400">✅</span>
              <span className="text-gray-700 dark:text-gray-300">
                <strong>Mobile Optimized:</strong> Touch-friendly interface
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
              <strong>Keyboard Shortcuts:</strong>
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <div>• Cmd+B: Bold</div>
              <div>• Cmd+I: Italic</div>
              <div>• Cmd+U: Underline</div>
              <div>• Cmd+K: Code</div>
              <div>• Enter: Send</div>
              <div>• Shift+Enter: New line</div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-green-700 dark:text-green-300">
              <strong>Try the toolbar:</strong> Use the enhanced toolbar to format text with colors, highlights, headings, and more!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default EditorTestPage