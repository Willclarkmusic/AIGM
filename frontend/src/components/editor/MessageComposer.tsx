import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { 
  FiBold, 
  FiItalic, 
  FiUnderline,
  FiCode, 
  FiSmile, 
  FiPaperclip, 
  FiSend,
  FiX,
  FiImage,
  FiFile,
  FiLink,
  FiType,
  FiDroplet,
  FiList,
  FiChevronDown,
  FiMoreHorizontal
} from 'react-icons/fi'
import { useDropzone } from 'react-dropzone'
import { useResponsive, useKeyboardVisible } from '../../stores/uiStore'
import { createEditorConfig, validateMessage, MentionUser } from '../../lib/tiptap'
import { useAblyChannel } from '../../hooks/useAblyChannel'
import EmojiPicker from './EmojiPicker'
import ColorPicker from './ColorPicker'
import LinkDialog from './LinkDialog'

interface FileAttachment {
  id: string
  file: File
  preview?: string
  type: 'image' | 'file'
  uploading?: boolean
  error?: string
}

interface MessageComposerProps {
  placeholder?: string
  maxCharacters?: number
  onSend: (content: string, attachments: FileAttachment[]) => Promise<void>
  onMentionQuery?: (query: string) => Promise<MentionUser[]>
  disabled?: boolean
  initialContent?: string
  roomId?: string
  enableVoiceMessage?: boolean
  className?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  file: [
    'application/pdf', 
    'text/plain', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/json'
  ]
}

const MessageComposer = ({
  placeholder = 'Type a message...',
  maxCharacters = 2000,
  onSend,
  onMentionQuery,
  disabled = false,
  initialContent = '',
  roomId = 'general',
  enableVoiceMessage = false,
  className = ''
}: MessageComposerProps) => {
  // Real-time functionality
  const { 
    sendMessage, 
    sendTypingIndicator, 
    stopTyping,
    error: realtimeError 
  } = useAblyChannel(roomId)
  const { isMobile } = useResponsive()
  const keyboardVisible = useKeyboardVisible()
  
  // Editor state
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showHighlightPicker, setShowHighlightPicker] = useState(false)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showMoreOptions, setShowMoreOptions] = useState(false)
  const [attachments, setAttachments] = useState<FileAttachment[]>([])
  const [isSending, setIsSending] = useState(false)
  const [editorHeight, setEditorHeight] = useState(44)
  
  // Refs
  const composerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle image paste and upload
  const handleImagePaste = useCallback(async (file: File) => {
    if (!ALLOWED_FILE_TYPES.image.includes(file.type)) {
      console.error('Invalid image type')
      return
    }
    
    if (file.size > MAX_FILE_SIZE) {
      console.error('File too large')
      return
    }

    const attachment: FileAttachment = {
      id: Date.now().toString(),
      file,
      type: 'image',
      preview: URL.createObjectURL(file),
      uploading: false
    }

    setAttachments(prev => [...prev, attachment])
  }, [])

  // Handle editor resize
  const handleEditorResize = useCallback((height: number) => {
    setEditorHeight(Math.max(44, Math.min(height, window.innerHeight * 0.3)))
  }, [])

  // Create editor instance
  const editor = useEditor({
    extensions: createEditorConfig({
      placeholder,
      maxCharacters,
      onMention: onMentionQuery,
      enableMentions: !!onMentionQuery,
      enableImages: true,
      enableLinks: true,
      onSend: handleSendMessage,
      onImagePaste: handleImagePaste,
      onResize: handleEditorResize,
    }),
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[44px] p-3',
        'data-placeholder': placeholder,
      },
      handleKeyDown: (view, event) => {
        // Handle Enter key for sending messages
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          console.log('🎹 Enter key pressed - sending message')
          handleSendMessage()
          return true
        }
        // Shift+Enter creates a new line (default behavior)
        return false
      },
    },
    onUpdate: ({ editor }) => {
      // Send typing indicator when user is typing
      const content = editor.getText()
      if (content.trim().length > 0 && sendTypingIndicator) {
        sendTypingIndicator()
      }
    },
    onFocus: () => {
      if (isMobile) {
        setIsToolbarVisible(true)
      }
    },
    onBlur: () => {
      // Stop typing when editor loses focus
      if (stopTyping) {
        stopTyping()
      }
      
      // Keep toolbar visible if emoji picker is open
      if (!showEmojiPicker) {
        setIsToolbarVisible(false)
      }
    },
  })

  // Handle send message
  async function handleSendMessage(content?: string) {
    console.log('🎬 handleSendMessage called', { 
      hasEditor: !!editor, 
      isSending, 
      content: content?.substring(0, 50) 
    })
    
    if (!editor || isSending) {
      console.log('🎬 handleSendMessage early return: no editor or already sending')
      return
    }

    const html = content || editor.getHTML()
    console.log('🎬 Message HTML:', html)
    
    const validation = validateMessage(html, maxCharacters)

    if (!validation.isValid) {
      console.error('Message validation failed:', validation.errors)
      return
    }

    setIsSending(true)
    
    // Stop typing indicator
    stopTyping()
    
    try {
      console.log('🚀 MessageComposer: Attempting to send message', { 
        html, 
        sendMessageAvailable: !!sendMessage,
        attachments: attachments.length 
      })
      
      // Use real-time sendMessage if available, otherwise fallback to onSend
      if (sendMessage) {
        console.log('🚀 Using real-time sendMessage')
        // Convert attachments to the format expected by real-time
        const realtimeAttachments = attachments.map(att => ({
          id: att.id,
          name: att.file.name,
          size: att.file.size,
          type: att.file.type,
          url: att.preview || '' // TODO: Upload to server and get URL
        }))
        
        await sendMessage(html, realtimeAttachments)
        console.log('🚀 Real-time message sent successfully')
      } else {
        console.log('🚀 Using fallback onSend')
        // Fallback to traditional onSend
        await onSend(html, attachments)
        console.log('🚀 Fallback message sent successfully')
      }
      
      editor.commands.clearContent()
      setAttachments([])
      setShowEmojiPicker(false)
      setIsToolbarVisible(false)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Handle file selection
  const handleFileSelect = useCallback((files: File[]) => {
    const newAttachments: FileAttachment[] = []

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        console.error(`File ${file.name} is too large`)
        continue
      }

      const isImage = ALLOWED_FILE_TYPES.image.includes(file.type)
      const isAllowedFile = ALLOWED_FILE_TYPES.file.includes(file.type)

      if (!isImage && !isAllowedFile) {
        console.error(`File type ${file.type} not allowed`)
        continue
      }

      const attachment: FileAttachment = {
        id: Date.now().toString() + Math.random(),
        file,
        type: isImage ? 'image' : 'file',
        preview: isImage ? URL.createObjectURL(file) : undefined,
        uploading: false
      }

      newAttachments.push(attachment)
    }

    setAttachments(prev => [...prev, ...newAttachments])
  }, [])

  // Dropzone for file uploads
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    noClick: true,
    multiple: true,
    maxSize: MAX_FILE_SIZE,
  })

  // Remove attachment
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id)
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
      return prev.filter(a => a.id !== id)
    })
  }

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    editor?.commands.insertContent(emoji)
    setShowEmojiPicker(false)
    editor?.commands.focus()
  }

  // Handle text color
  const handleTextColor = (color: string) => {
    if (color) {
      editor?.chain().focus().setColor(color).run()
    } else {
      editor?.chain().focus().unsetColor().run()
    }
    setShowTextColorPicker(false)
  }

  // Handle highlight color
  const handleHighlightColor = (color: string) => {
    if (color) {
      editor?.chain().focus().setHighlight({ color }).run()
    } else {
      editor?.chain().focus().unsetHighlight().run()
    }
    setShowHighlightPicker(false)
  }

  // Handle link operations
  const handleLinkAdd = (url: string, text?: string) => {
    if (text) {
      editor?.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
    } else {
      editor?.chain().focus().setLink({ href: url }).run()
    }
    setShowLinkDialog(false)
  }

  const handleLinkRemove = () => {
    editor?.chain().focus().unsetLink().run()
    setShowLinkDialog(false)
  }

  // Handle heading level changes
  const handleHeadingChange = (level: number) => {
    if (level === 0) {
      editor?.chain().focus().setParagraph().run()
    } else {
      editor?.chain().focus().toggleHeading({ level: level as 1 | 2 }).run()
    }
    setShowMoreOptions(false)
  }

  // Close all popups
  const closeAllPopups = () => {
    setShowEmojiPicker(false)
    setShowTextColorPicker(false)
    setShowHighlightPicker(false)
    setShowLinkDialog(false)
    setShowMoreOptions(false)
  }

  // Get current text formatting state
  const getCurrentTextColor = () => {
    return editor?.getAttributes('textStyle')?.color || ''
  }

  const getCurrentHighlightColor = () => {
    return editor?.getAttributes('highlight')?.color || ''
  }

  const getCurrentLinkUrl = () => {
    return editor?.getAttributes('link')?.href || ''
  }

  // Keyboard event handling for mobile
  useEffect(() => {
    if (isMobile && keyboardVisible && composerRef.current) {
      // Scroll composer into view when keyboard appears
      setTimeout(() => {
        composerRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest' 
        })
      }, 100)
    }
  }, [isMobile, keyboardVisible])

  // Character count and validation
  const characterCount = editor?.storage.characterCount?.characters() || 0
  const isOverLimit = characterCount > maxCharacters
  const canSend = !disabled && !isSending && characterCount > 0 && !isOverLimit

  return (
    <div 
      ref={composerRef}
      className={`message-composer bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 ${className}`}
      style={{
        paddingBottom: isMobile && keyboardVisible ? 'env(keyboard-inset-height, 0px)' : '0px'
      }}
    >
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group bg-gray-100 dark:bg-gray-800 rounded-lg p-2 flex items-center space-x-2 max-w-xs"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <img
                    src={attachment.preview}
                    alt={attachment.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                    <FiFile className="w-6 h-6 text-gray-500" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attachment.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(attachment.file.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>

                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 transition-opacity"
                >
                  <FiX className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Editor Container */}
      <div
        {...getRootProps()}
        className={`editor-container relative ${isDragActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}
        ref={editorContainerRef}
      >
        <input {...getInputProps()} />
        
        {/* Drag Overlay */}
        {isDragActive && (
          <div className="absolute inset-0 bg-primary-100 dark:bg-primary-900/50 border-2 border-dashed border-primary-300 dark:border-primary-600 rounded-lg flex items-center justify-center z-10">
            <div className="text-center">
              <FiPaperclip className="w-8 h-8 mx-auto mb-2 text-primary-600 dark:text-primary-400" />
              <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Drop files to attach
              </p>
            </div>
          </div>
        )}

        {/* Editor */}
        <div 
          className="relative"
          style={{ minHeight: `${editorHeight}px` }}
        >
          <EditorContent 
            editor={editor}
            className="editor-content"
          />

          {/* Send Button */}
          <div className="absolute bottom-2 right-2">
            <button
              onClick={() => {
                console.log('🎯 Send button clicked!', { canSend, isSending, characterCount })
                handleSendMessage()
              }}
              disabled={!canSend}
              className={`
                p-2 rounded-full transition-all duration-200 min-h-touch min-w-touch
                ${canSend
                  ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }
              `}
            >
              <FiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Toolbar */}
      {(isToolbarVisible || !isMobile) && (
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Main Toolbar Row */}
          <div className="flex items-center justify-between p-2">
            {/* Left: Basic Formatting */}
            <div className="flex items-center space-x-1">
              {/* Text Size Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreOptions(!showMoreOptions)}
                  className={`btn-icon flex items-center space-x-1 ${showMoreOptions ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                  title="Text Size"
                >
                  <FiType className="w-4 h-4" />
                  <FiChevronDown className="w-3 h-3" />
                </button>
                
                {showMoreOptions && (
                  <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px]">
                    <button
                      onClick={() => handleHeadingChange(0)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${!editor?.isActive('heading') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                    >
                      <span className="text-sm">Normal</span>
                    </button>
                    <button
                      onClick={() => handleHeadingChange(1)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('heading', { level: 1 }) ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                    >
                      <span className="text-lg font-bold">Heading 1</span>
                    </button>
                    <button
                      onClick={() => handleHeadingChange(2)}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 ${editor?.isActive('heading', { level: 2 }) ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                    >
                      <span className="text-base font-semibold">Heading 2</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bold */}
              <button
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className={`btn-icon ${editor?.isActive('bold') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Bold (Cmd+B)"
              >
                <FiBold className="w-4 h-4" />
              </button>
              
              {/* Italic */}
              <button
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className={`btn-icon ${editor?.isActive('italic') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Italic (Cmd+I)"
              >
                <FiItalic className="w-4 h-4" />
              </button>

              {/* Underline */}
              <button
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className={`btn-icon ${editor?.isActive('underline') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Underline (Cmd+U)"
              >
                <FiUnderline className="w-4 h-4" />
              </button>
              
              {/* Code */}
              <button
                onClick={() => editor?.chain().focus().toggleCode().run()}
                className={`btn-icon ${editor?.isActive('code') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Code (Cmd+K)"
              >
                <FiCode className="w-4 h-4" />
              </button>

              {/* Separator */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

              {/* Link */}
              <button
                onClick={() => setShowLinkDialog(!showLinkDialog)}
                className={`btn-icon ${editor?.isActive('link') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Add Link"
              >
                <FiLink className="w-4 h-4" />
              </button>

              {/* Bullet List */}
              <button
                onClick={() => editor?.chain().focus().toggleBulletListInline().run()}
                className={`btn-icon ${editor?.isActive('bulletList') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                title="Bullet List"
              >
                <FiList className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Colors and Actions */}
            <div className="flex items-center space-x-1">
              {/* Text Color */}
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllPopups()
                    setShowTextColorPicker(!showTextColorPicker)
                  }}
                  className={`btn-icon flex items-center ${showTextColorPicker ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                  title="Text Color"
                >
                  <FiType className="w-4 h-4" />
                  <div 
                    className="w-2 h-2 rounded-full ml-1 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: getCurrentTextColor() || '#000000' }}
                  ></div>
                </button>
                
                {showTextColorPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <ColorPicker
                      onColorSelect={handleTextColor}
                      onClose={() => setShowTextColorPicker(false)}
                      currentColor={getCurrentTextColor()}
                      type="text"
                    />
                  </div>
                )}
              </div>

              {/* Highlight Color */}
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllPopups()
                    setShowHighlightPicker(!showHighlightPicker)
                  }}
                  className={`btn-icon flex items-center ${showHighlightPicker ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                  title="Highlight"
                >
                  <FiDroplet className="w-4 h-4" />
                  <div 
                    className="w-2 h-2 rounded-full ml-1 border border-gray-300 dark:border-gray-600"
                    style={{ backgroundColor: getCurrentHighlightColor() || '#fef08a' }}
                  ></div>
                </button>
                
                {showHighlightPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <ColorPicker
                      onColorSelect={handleHighlightColor}
                      onClose={() => setShowHighlightPicker(false)}
                      currentColor={getCurrentHighlightColor()}
                      type="highlight"
                    />
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>

              {/* Character Count */}
              <span className={`text-xs px-2 py-1 rounded ${
                isOverLimit 
                  ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {characterCount}/{maxCharacters}
              </span>

              {/* Emoji Picker */}
              <div className="relative">
                <button
                  onClick={() => {
                    closeAllPopups()
                    setShowEmojiPicker(!showEmojiPicker)
                  }}
                  className={`btn-icon ${showEmojiPicker ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
                  title="Emoji"
                >
                  <FiSmile className="w-4 h-4" />
                </button>
                
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker
                      onEmojiSelect={insertEmoji}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>

              {/* File Attachment */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-icon"
                title="Attach File"
              >
                <FiPaperclip className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFileSelect(Array.from(e.target.files))
                    e.target.value = '' // Reset input
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <LinkDialog
            onLinkAdd={handleLinkAdd}
            onLinkRemove={getCurrentLinkUrl() ? handleLinkRemove : undefined}
            onClose={() => setShowLinkDialog(false)}
            currentUrl={getCurrentLinkUrl()}
          />
        </div>
      )}
    </div>
  )
}

export default MessageComposer