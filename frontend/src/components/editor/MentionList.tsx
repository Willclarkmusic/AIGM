import { useState, useEffect, forwardRef, useImperativeHandle } from 'react'
import { MentionUser } from '../../lib/tiptap'

interface MentionListProps {
  items: MentionUser[]
  command: (item: MentionUser) => void
  editor?: any
}

interface MentionListHandle {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean
}

const MentionList = forwardRef<MentionListHandle, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [props.items])

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((prevIndex) => 
      prevIndex === 0 ? props.items.length - 1 : prevIndex - 1
    )
  }

  const downHandler = () => {
    setSelectedIndex((prevIndex) => 
      prevIndex === props.items.length - 1 ? 0 : prevIndex + 1
    )
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  if (props.items.length === 0) {
    return (
      <div className="mention-list bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[200px]">
        <div className="text-sm text-gray-500 dark:text-gray-400 px-2 py-1">
          No users found
        </div>
      </div>
    )
  }

  return (
    <div className="mention-list bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-1 min-w-[200px] max-h-[200px] overflow-y-auto">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          className={`
            w-full flex items-center space-x-3 px-3 py-2 text-left rounded-md transition-colors
            ${index === selectedIndex 
              ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
            }
          `}
          onClick={() => selectItem(index)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            {item.avatar ? (
              <img
                src={item.avatar}
                alt={item.name}
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <div className="w-6 h-6 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                  {item.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm truncate">
                {item.name}
              </span>
              {item.isOnline && (
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
              @{item.username}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
})

MentionList.displayName = 'MentionList'

export default MentionList