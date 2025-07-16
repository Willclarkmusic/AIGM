import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { UIState, ModalState, DeviceInfo, ThemeMode, TouchGesture } from '../types'

interface UIStore extends UIState {
  // Modal management
  modals: Map<string, ModalState>
  
  // Navigation
  navigationHistory: string[]
  
  // Mobile-specific state
  deviceInfo: DeviceInfo
  
  // Performance monitoring
  lastRenderTime: number
  
  // Actions - Layout and Navigation
  setSidebarOpen: (open: boolean) => void
  setCurrentView: (view: 'friends' | 'server') => void
  updateScreenSize: (width: number, height: number) => void
  updateDeviceInfo: (info: Partial<DeviceInfo>) => void
  
  // Theme management
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  
  // Modal management
  openModal: (type: string, data?: any) => void
  closeModal: (type?: string) => void
  closeAllModals: () => void
  isModalOpen: (type: string) => boolean
  getModalData: (type: string) => any
  
  // Mobile-specific actions
  setKeyboardVisible: (visible: boolean) => void
  updateSafePadding: (padding: Partial<UIState['safePadding']>) => void
  recordTouchGesture: (gesture: TouchGesture) => void
  
  // Loading and error states
  setGlobalLoading: (loading: boolean) => void
  setGlobalError: (error: string | null) => void
  
  // Navigation helpers
  pushRoute: (route: string) => void
  popRoute: () => string | null
  canGoBack: () => boolean
  
  // Responsive helpers
  getBreakpoint: () => 'mobile' | 'tablet' | 'desktop'
  isBreakpoint: (breakpoint: 'mobile' | 'tablet' | 'desktop') => boolean
  
  // Performance monitoring
  updateRenderTime: () => void
  
  // Utilities
  reset: () => void
  resetModalState: () => void
}

// Breakpoint definitions (matching Tailwind config)
const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const

// Detect device capabilities
const detectDeviceInfo = (): DeviceInfo => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouch: false,
      userAgent: '',
      platform: '',
      screenSize: { width: 1024, height: 768 },
      viewport: { width: 1024, height: 768 },
    }
  }

  const userAgent = navigator.userAgent
  const platform = navigator.platform
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Screen dimensions
  const screenWidth = window.screen?.width || window.innerWidth
  const screenHeight = window.screen?.height || window.innerHeight
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  
  // Device type detection
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
  const isTabletUA = /iPad|Android(?!.*Mobile)/i.test(userAgent)
  
  // Use viewport width as primary indicator, fallback to user agent
  const isMobile = viewportWidth < BREAKPOINTS.tablet || (isMobileUA && !isTabletUA)
  const isTablet = !isMobile && (viewportWidth < BREAKPOINTS.desktop || isTabletUA)
  const isDesktop = !isMobile && !isTablet

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouch,
    userAgent,
    platform,
    screenSize: { width: screenWidth, height: screenHeight },
    viewport: { width: viewportWidth, height: viewportHeight },
  }
}

// Detect safe area insets
const detectSafePadding = () => {
  if (typeof window === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const style = getComputedStyle(document.documentElement)
  
  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
  }
}

// Get initial theme from system preference
const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light'
  
  const stored = localStorage.getItem('theme') as ThemeMode
  if (stored && ['light', 'dark', 'system'].includes(stored)) {
    return stored
  }
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const initialDeviceInfo = detectDeviceInfo()

const initialState: Omit<UIStore, keyof UIStore['deviceInfo'] | 'modals' | 'navigationHistory'> = {
  // Layout and Navigation
  sidebarOpen: false,
  currentView: 'friends',
  isMobile: initialDeviceInfo.isMobile,
  isTablet: initialDeviceInfo.isTablet,
  isDesktop: initialDeviceInfo.isDesktop,
  screenWidth: initialDeviceInfo.viewport.width,
  screenHeight: initialDeviceInfo.viewport.height,
  
  // Modals and Overlays
  activeModal: null,
  modalData: null,
  
  // Theme
  theme: getInitialTheme(),
  
  // Mobile-specific
  keyboardVisible: false,
  safePadding: detectSafePadding(),
  isTouch: initialDeviceInfo.isTouch,
  lastTouchTime: 0,
  
  // Loading and Error States
  globalLoading: false,
  globalError: null,
  
  // Navigation
  previousRoute: undefined,
  canGoBack: false,
  
  // Performance
  lastRenderTime: performance.now(),
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        modals: new Map<string, ModalState>(),
        navigationHistory: [],
        deviceInfo: initialDeviceInfo,

        // Layout and Navigation
        setSidebarOpen: (open) => {
          set({ sidebarOpen: open }, false, 'ui/setSidebarOpen')
        },

        setCurrentView: (view) => {
          set({ 
            currentView: view,
            // Auto-close sidebar on mobile when switching views
            sidebarOpen: get().isMobile ? false : get().sidebarOpen,
          }, false, 'ui/setCurrentView')
        },

        updateScreenSize: (width, height) => {
          const isMobile = width < BREAKPOINTS.tablet
          const isTablet = !isMobile && width < BREAKPOINTS.desktop
          const isDesktop = !isMobile && !isTablet
          
          set({
            screenWidth: width,
            screenHeight: height,
            isMobile,
            isTablet,
            isDesktop,
            // Auto-close sidebar when switching to mobile
            sidebarOpen: isMobile ? false : get().sidebarOpen,
          }, false, 'ui/updateScreenSize')
          
          // Update device info
          const deviceInfo = {
            ...get().deviceInfo,
            viewport: { width, height },
            isMobile,
            isTablet,
            isDesktop,
          }
          set({ deviceInfo }, false, 'ui/updateDeviceInfo')
        },

        updateDeviceInfo: (info) => {
          const deviceInfo = { ...get().deviceInfo, ...info }
          set({ deviceInfo }, false, 'ui/updateDeviceInfo')
        },

        // Theme management
        setTheme: (theme) => {
          const currentTheme = get().theme
          
          // Prevent unnecessary updates
          if (currentTheme === theme) {
            return
          }
          
          set({ theme }, false, 'ui/setTheme')
          
          // Apply theme to document
          if (typeof document !== 'undefined') {
            const isDark = theme === 'dark' || 
              (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
            
            if (isDark) {
              document.documentElement.classList.add('dark')
            } else {
              document.documentElement.classList.remove('dark')
            }
          }
        },

        toggleTheme: () => {
          const currentTheme = get().theme
          const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
          get().setTheme(newTheme)
        },

        // Modal management
        openModal: (type, data) => {
          const modals = new Map(get().modals)
          modals.set(type, { type, data, isOpen: true })
          set({ 
            modals,
            activeModal: type,
            modalData: data,
          }, false, 'ui/openModal')
        },

        closeModal: (type) => {
          const modals = new Map(get().modals)
          
          if (type) {
            modals.delete(type)
            
            // If this was the active modal, clear it
            if (get().activeModal === type) {
              set({ activeModal: null, modalData: null })
            }
          } else {
            // Close active modal
            const activeModal = get().activeModal
            if (activeModal) {
              modals.delete(activeModal)
              set({ activeModal: null, modalData: null })
            }
          }
          
          set({ modals }, false, 'ui/closeModal')
        },

        closeAllModals: () => {
          set({
            modals: new Map(),
            activeModal: null,
            modalData: null,
          }, false, 'ui/closeAllModals')
        },

        isModalOpen: (type) => {
          return get().modals.has(type)
        },

        getModalData: (type) => {
          return get().modals.get(type)?.data
        },

        // Mobile-specific actions
        setKeyboardVisible: (visible) => {
          set({ keyboardVisible: visible }, false, 'ui/setKeyboardVisible')
        },

        updateSafePadding: (padding) => {
          const safePadding = { ...get().safePadding, ...padding }
          set({ safePadding }, false, 'ui/updateSafePadding')
        },

        recordTouchGesture: (gesture) => {
          set({ lastTouchTime: Date.now() }, false, 'ui/recordTouchGesture')
          
          // Could be used for analytics or gesture recognition
          if (import.meta.env.DEV) {
            console.log('Touch gesture:', gesture)
          }
        },

        // Loading and error states
        setGlobalLoading: (loading) => {
          set({ globalLoading: loading }, false, 'ui/setGlobalLoading')
        },

        setGlobalError: (error) => {
          set({ globalError: error }, false, 'ui/setGlobalError')
        },

        // Navigation helpers
        pushRoute: (route) => {
          const history = [...get().navigationHistory, route]
          set({
            navigationHistory: history,
            previousRoute: get().navigationHistory[get().navigationHistory.length - 1],
            canGoBack: history.length > 1,
          }, false, 'ui/pushRoute')
        },

        popRoute: () => {
          const history = [...get().navigationHistory]
          const poppedRoute = history.pop()
          
          set({
            navigationHistory: history,
            previousRoute: history[history.length - 2],
            canGoBack: history.length > 1,
          }, false, 'ui/popRoute')
          
          return poppedRoute || null
        },

        canGoBack: () => {
          return get().navigationHistory.length > 1
        },

        // Responsive helpers
        getBreakpoint: () => {
          const { screenWidth } = get()
          
          if (screenWidth < BREAKPOINTS.tablet) return 'mobile'
          if (screenWidth < BREAKPOINTS.desktop) return 'tablet'
          return 'desktop'
        },

        isBreakpoint: (breakpoint) => {
          return get().getBreakpoint() === breakpoint
        },

        // Performance monitoring
        updateRenderTime: () => {
          set({ lastRenderTime: performance.now() }, false, 'ui/updateRenderTime')
        },

        // Utilities
        reset: () => {
          set({
            ...initialState,
            modals: new Map(),
            navigationHistory: [],
            deviceInfo: detectDeviceInfo(),
          }, false, 'ui/reset')
        },

        resetModalState: () => {
          set({
            modals: new Map(),
            activeModal: null,
            modalData: null,
          }, false, 'ui/resetModalState')
        },
      }),
      {
        name: 'ui-store',
        // Only persist certain UI preferences
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.isDesktop ? state.sidebarOpen : false, // Don't persist mobile sidebar state
        }),
      }
    ),
    {
      name: 'ui-store',
    }
  )
)

// Selectors for optimized re-renders
export const useTheme = () => useUIStore(state => state.theme)
export const useIsMobile = () => useUIStore(state => state.isMobile)
export const useIsTablet = () => useUIStore(state => state.isTablet)
export const useIsDesktop = () => useUIStore(state => state.isDesktop)
export const useSidebarOpen = () => useUIStore(state => state.sidebarOpen)
export const useCurrentView = () => useUIStore(state => state.currentView)
export const useActiveModal = () => useUIStore(state => state.activeModal)
export const useGlobalLoading = () => useUIStore(state => state.globalLoading)
export const useGlobalError = () => useUIStore(state => state.globalError)

// Action selectors
export const useUIActions = () => useUIStore(state => ({
  setSidebarOpen: state.setSidebarOpen,
  setCurrentView: state.setCurrentView,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
}))

export const useModalActions = () => useUIStore(state => ({
  openModal: state.openModal,
  closeModal: state.closeModal,
  closeAllModals: state.closeAllModals,
  isModalOpen: state.isModalOpen,
  getModalData: state.getModalData,
}))

export const useNavigationActions = () => useUIStore(state => ({
  pushRoute: state.pushRoute,
  popRoute: state.popRoute,
  canGoBack: state.canGoBack,
}))

// Custom hooks for responsive design
export const useBreakpoint = () => {
  return useUIStore(state => state.getBreakpoint())
}

export const useResponsive = () => {
  return useUIStore(state => ({
    isMobile: state.isMobile,
    isTablet: state.isTablet,
    isDesktop: state.isDesktop,
    breakpoint: state.getBreakpoint(),
    screenWidth: state.screenWidth,
    screenHeight: state.screenHeight,
    isBreakpoint: state.isBreakpoint,
  }))
}

// Device-specific hooks
export const useDeviceInfo = () => useUIStore(state => state.deviceInfo)
export const useIsTouch = () => useUIStore(state => state.isTouch)
export const useSafePadding = () => useUIStore(state => state.safePadding)
export const useKeyboardVisible = () => useUIStore(state => state.keyboardVisible)

// Initialize UI store with window events
export const initializeUIStore = () => {
  if (typeof window === 'undefined') return

  const { updateScreenSize, setKeyboardVisible, updateSafePadding, setTheme } = useUIStore.getState()

  // Handle window resize
  const handleResize = () => {
    updateScreenSize(window.innerWidth, window.innerHeight)
  }

  // Handle keyboard visibility (iOS)
  const handleVisualViewportChange = () => {
    if (window.visualViewport) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height
      setKeyboardVisible(keyboardHeight > 150)
    }
  }

  // Handle orientation change
  const handleOrientationChange = () => {
    setTimeout(() => {
      updateScreenSize(window.innerWidth, window.innerHeight)
      updateSafePadding(detectSafePadding())
    }, 100)
  }

  // Handle theme changes
  const handleThemeChange = (e: MediaQueryListEvent) => {
    const { theme, setTheme } = useUIStore.getState()
    if (theme === 'system') {
      // Force re-apply the system theme when system preference changes
      const isDark = e.matches
      if (isDark) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  // Add event listeners
  window.addEventListener('resize', handleResize)
  window.addEventListener('orientationchange', handleOrientationChange)
  
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleVisualViewportChange)
  }

  const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  darkModeMediaQuery.addEventListener('change', handleThemeChange)

  // Initial setup
  handleResize()
  updateSafePadding(detectSafePadding())
  
  // Apply initial theme to document if not already applied
  const { theme } = useUIStore.getState()
  const isDark = theme === 'dark' || 
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  
  if (isDark && !document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.add('dark')
  } else if (!isDark && document.documentElement.classList.contains('dark')) {
    document.documentElement.classList.remove('dark')
  }

  // Cleanup function
  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('orientationchange', handleOrientationChange)
    
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleVisualViewportChange)
    }
    
    darkModeMediaQuery.removeEventListener('change', handleThemeChange)
  }
}