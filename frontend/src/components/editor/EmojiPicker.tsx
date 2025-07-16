import { useRef, useEffect } from 'react'
import { Picker } from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { useTheme } from '../../stores/uiStore'
import { FiX } from 'react-icons/fi'

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void
  onClose: () => void
  className?: string
}

const EmojiPicker = ({ onEmojiSelect, onClose, className = '' }: EmojiPickerProps) => {
  const theme = useTheme()
  const pickerRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
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
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handleEmojiSelect = (emoji: any) => {
    onEmojiSelect(emoji.native)
    onClose()
  }

  return (
    <div
      ref={pickerRef}
      className={`emoji-picker-container bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white">
          Pick an emoji
        </h3>
        <button
          onClick={onClose}
          className="btn-icon p-1"
          aria-label="Close emoji picker"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji Picker */}
      <div className="p-2">
        <Picker
          data={data}
          onEmojiSelect={handleEmojiSelect}
          theme={theme === 'dark' ? 'dark' : 'light'}
          set="native"
          maxFrequentRows={2}
          perLine={8}
          searchPosition="none"
          previewPosition="none"
          skinTonePosition="none"
          categories={[
            'frequent',
            'people', 
            'nature', 
            'foods', 
            'activity', 
            'places', 
            'objects', 
            'symbols'
          ]}
          custom={[
            {
              id: 'custom',
              name: 'Custom',
              emojis: [
                {
                  id: 'wave',
                  name: 'Wave',
                  keywords: ['hello', 'hi', 'wave'],
                  skins: [{ src: '👋' }]
                },
                {
                  id: 'thumbs_up',
                  name: 'Thumbs Up',
                  keywords: ['like', 'good', 'yes'],
                  skins: [{ src: '👍' }]
                },
                {
                  id: 'heart',
                  name: 'Heart',
                  keywords: ['love', 'like'],
                  skins: [{ src: '❤️' }]
                },
                {
                  id: 'fire',
                  name: 'Fire',
                  keywords: ['hot', 'fire', 'cool'],
                  skins: [{ src: '🔥' }]
                },
                {
                  id: 'rocket',
                  name: 'Rocket',
                  keywords: ['fast', 'launch', 'space'],
                  skins: [{ src: '🚀' }]
                },
                {
                  id: 'tada',
                  name: 'Party',
                  keywords: ['celebrate', 'party'],
                  skins: [{ src: '🎉' }]
                },
                {
                  id: 'thinking',
                  name: 'Thinking',
                  keywords: ['think', 'hmm'],
                  skins: [{ src: '🤔' }]
                },
                {
                  id: 'laughing',
                  name: 'Laughing',
                  keywords: ['lol', 'funny', 'laugh'],
                  skins: [{ src: '😂' }]
                }
              ]
            }
          ]}
          style={{
            width: '320px',
            height: '400px',
            background: 'transparent',
            border: 'none',
          }}
        />
      </div>

      {/* Quick Access Emojis */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Quick Access
        </div>
        <div className="flex flex-wrap gap-1">
          {['👍', '❤️', '😂', '😢', '😮', '😡', '🎉', '🔥'].map((emoji, index) => (
            <button
              key={index}
              onClick={() => handleEmojiSelect({ native: emoji })}
              className="p-2 text-lg hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title={`Insert ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default EmojiPicker