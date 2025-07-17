// Responsive Layout Hook for AIGM
import { useState, useEffect, useCallback } from 'react'

export type ScreenSize = 'mobile' | 'tablet' | 'desktop'
export type ViewType = 'friends' | 'server'

export interface ResponsiveLayoutState {
  screenSize: ScreenSize
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  sidebarOpen: boolean
  keyboardVisible: boolean
  windowHeight: number
  windowWidth: number
}

export interface ResponsiveLayoutActions {
  toggleSidebar: () => void
  closeSidebar: () => void
  openSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

export const useResponsiveLayout = (): ResponsiveLayoutState & ResponsiveLayoutActions => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('mobile')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [windowHeight, setWindowHeight] = useState(window.innerHeight)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  // Breakpoints
  const MOBILE_MAX = 767
  const TABLET_MAX = 1023

  // Calculate screen size based on width
  const calculateScreenSize = useCallback((width: number): ScreenSize => {
    if (width <= MOBILE_MAX) return 'mobile'
    if (width <= TABLET_MAX) return 'tablet'
    return 'desktop'
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight
      const newScreenSize = calculateScreenSize(newWidth)
      
      setWindowWidth(newWidth)
      setWindowHeight(newHeight)
      setScreenSize(newScreenSize)

      // Auto-close sidebar on desktop
      if (newScreenSize === 'desktop') {
        setSidebarOpen(false)
      }

      // Detect keyboard on mobile (iOS/Android behavior)
      if (newScreenSize === 'mobile') {
        const heightDiff = window.screen.height - newHeight
        setKeyboardVisible(heightDiff > 150) // Threshold for keyboard detection
      } else {
        setKeyboardVisible(false)
      }
    }

    // Initial calculation
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [calculateScreenSize])

  // Handle viewport changes (mobile keyboard)
  useEffect(() => {
    const handleVisualViewportChange = () => {
      if (screenSize === 'mobile' && window.visualViewport) {
        const viewport = window.visualViewport
        const heightDiff = window.innerHeight - viewport.height
        setKeyboardVisible(heightDiff > 150)
      }
    }

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportChange)
      return () => {
        window.visualViewport?.removeEventListener('resize', handleVisualViewportChange)
      }
    }
  }, [screenSize])

  // Sidebar actions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const openSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  // Derived state
  const isMobile = screenSize === 'mobile'
  const isTablet = screenSize === 'tablet'
  const isDesktop = screenSize === 'desktop'

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    sidebarOpen,
    keyboardVisible,
    windowHeight,
    windowWidth,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    setSidebarOpen
  }
}

// Touch gesture hook for mobile drawer
export const useMobileGestures = (
  isEnabled: boolean,
  onSwipeRight: () => void,
  onSwipeLeft: () => void
) => {
  useEffect(() => {
    if (!isEnabled) return

    let startX = 0
    let startY = 0
    let startTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startTime = Date.now()
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0]
      const endX = touch.clientX
      const endY = touch.clientY
      const endTime = Date.now()

      const deltaX = endX - startX
      const deltaY = endY - startY
      const deltaTime = endTime - startTime

      // Swipe detection criteria
      const minDistance = 50
      const maxTime = 300
      const maxVerticalDistance = 100

      if (
        Math.abs(deltaX) > minDistance &&
        Math.abs(deltaY) < maxVerticalDistance &&
        deltaTime < maxTime
      ) {
        if (deltaX > 0) {
          onSwipeRight()
        } else {
          onSwipeLeft()
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isEnabled, onSwipeRight, onSwipeLeft])
}

// Keyboard handling hook
export const useKeyboardHandling = (isMobile: boolean, keyboardVisible: boolean) => {
  useEffect(() => {
    if (!isMobile) return

    const rootElement = document.documentElement

    if (keyboardVisible) {
      // Keyboard is visible - adjust layout
      rootElement.style.setProperty('--keyboard-height', '280px')
      rootElement.classList.add('keyboard-visible')
    } else {
      // Keyboard is hidden
      rootElement.style.removeProperty('--keyboard-height')
      rootElement.classList.remove('keyboard-visible')
    }

    return () => {
      rootElement.style.removeProperty('--keyboard-height')
      rootElement.classList.remove('keyboard-visible')
    }
  }, [isMobile, keyboardVisible])
}