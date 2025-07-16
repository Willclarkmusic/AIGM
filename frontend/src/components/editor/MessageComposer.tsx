import { useState, useRef, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { 
  FiBold, 
  FiItalic, 
  FiCode, 
  FiSmile, 
  FiPaperclip, 
  FiSend,
  FiX,
  FiImage,
  FiFile
} from 'react-icons/fi'
import { useDropzone } from 'react-dropzone'
import { useResponsive, useKeyboardVisible } from '../../stores/uiStore'
import { createEditorConfig, validateMessage, MentionUser } from '../../lib/tiptap'
import EmojiPicker from './EmojiPicker'

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
  roomId,
  enableVoiceMessage = false,
  className = ''
}: MessageComposerProps) => {
  const { isMobile } = useResponsive()
  const keyboardVisible = useKeyboardVisible()
  
  // Editor state
  const [isToolbarVisible, setIsToolbarVisible] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
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
    },
    onFocus: () => {
      if (isMobile) {
        setIsToolbarVisible(true)
      }
    },
    onBlur: () => {
      // Keep toolbar visible if emoji picker is open
      if (!showEmojiPicker) {
        setIsToolbarVisible(false)
      }
    },
  })

  // Handle send message
  async function handleSendMessage(content?: string) {
    if (!editor || isSending) return

    const html = content || editor.getHTML()
    const validation = validateMessage(html, maxCharacters)

    if (!validation.isValid) {
      console.error('Message validation failed:', validation.errors)
      return
    }

    setIsSending(true)
    try {
      await onSend(html, attachments)
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
              onClick={() => handleSendMessage()}
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

      {/* Mobile Toolbar */}
      {(isToolbarVisible || !isMobile) && (
        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          {/* Formatting Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`btn-icon ${editor?.isActive('bold') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
              title="Bold"
            >
              <FiBold className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`btn-icon ${editor?.isActive('italic') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
              title="Italic"
            >
              <FiItalic className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => editor?.chain().focus().toggleCode().run()}
              className={`btn-icon ${editor?.isActive('code') ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400' : ''}`}
              title="Code"
            >
              <FiCode className="w-4 h-4" />
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-1">
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
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
      )}
    </div>
  )
}

export default MessageComposer