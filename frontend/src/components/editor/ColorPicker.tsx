import { useState, useRef, useEffect } from 'react'
import { FiX, FiDroplet } from 'react-icons/fi'

interface ColorPickerProps {
  onColorSelect: (color: string) => void
  onClose: () => void
  currentColor?: string
  type?: 'text' | 'highlight'
  className?: string
}

const PRESET_COLORS = {
  text: [
    '#000000', '#374151', '#6b7280', '#9ca3af', // Grays
    '#dc2626', '#ea580c', '#d97706', '#ca8a04', // Reds/Oranges/Yellows
    '#65a30d', '#16a34a', '#059669', '#0d9488', // Greens/Teals
    '#0284c7', '#2563eb', '#4f46e5', '#7c3aed', // Blues/Purples
    '#c026d3', '#db2777', '#e11d48', '#ffffff'  // Pinks/White
  ],
  highlight: [
    '#fef3c7', '#fed7aa', '#fecaca', '#f3e8ff', // Light yellows/oranges/reds/purples
    '#dbeafe', '#d1fae5', '#ecfdf5', '#f0fdfa', // Light blues/greens
    '#fdf4ff', '#fce7f3', '#fff1f2', '#f9fafb', // Light pinks/grays
    '#ffedd5', '#fef08a', '#d9f99d', '#bfdbfe', // More highlights
    '#e0e7ff', '#ede9fe', '#fae8ff', '#fdf2f8'  // More pastels
  ]
}

const ColorPicker = ({ 
  onColorSelect, 
  onClose, 
  currentColor, 
  type = 'text',
  className = '' 
}: ColorPickerProps) => {
  const [customColor, setCustomColor] = useState(currentColor || '#000000')
  const pickerRef = useRef<HTMLDivElement>(null)
  const colors = PRESET_COLORS[type]

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

  const handleColorClick = (color: string) => {
    onColorSelect(color)
    onClose()
  }

  const handleCustomColorSubmit = () => {
    onColorSelect(customColor)
    onClose()
  }

  const handleRemoveColor = () => {
    onColorSelect('')
    onClose()
  }

  return (
    <div
      ref={pickerRef}
      className={`color-picker-container bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[280px] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FiDroplet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            {type === 'text' ? 'Text Color' : 'Highlight Color'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="btn-icon p-1"
          aria-label="Close color picker"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* Remove Color Button */}
      {currentColor && (
        <button
          onClick={handleRemoveColor}
          className="w-full mb-3 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Remove {type === 'text' ? 'Color' : 'Highlight'}
        </button>
      )}

      {/* Preset Colors */}
      <div className="mb-4">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Preset Colors
        </div>
        <div className="grid grid-cols-8 gap-2">
          {colors.map((color, index) => (
            <button
              key={index}
              onClick={() => handleColorClick(color)}
              className={`
                w-6 h-6 rounded border-2 transition-all duration-200 hover:scale-110
                ${currentColor === color 
                  ? 'border-primary-500 shadow-lg' 
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
              style={{ backgroundColor: color }}
              title={color}
              aria-label={`Select color ${color}`}
            >
              {color === '#ffffff' && (
                <div className="w-full h-full border border-gray-300 dark:border-gray-600 rounded"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Custom Color
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
            aria-label="Custom color picker"
          />
          <input
            type="text"
            value={customColor}
            onChange={(e) => setCustomColor(e.target.value)}
            placeholder="#000000"
            className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleCustomColorSubmit}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColorPicker