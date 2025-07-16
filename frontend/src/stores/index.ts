// Store exports
export * from './authStore'
export * from './friendsStore'
export * from './serverStore'
export * from './roomStore'
export * from './uiStore'
export * from './themeStore'

// Store initialization
import { initializeAuth } from './authStore'
import { initializeUIStore } from './uiStore'
import { setAccessToken } from '../lib/api'

// Combined store initialization
export const initializeStores = async () => {
  try {
    // Initialize UI store first (sets up event listeners)
    const cleanupUI = initializeUIStore()
    
    // Initialize auth store (validates session)
    await initializeAuth()
    
    // Return cleanup function
    return () => {
      cleanupUI?.()
    }
  } catch (error) {
    console.error('Failed to initialize stores:', error)
    return () => {}
  }
}

// Store reset functions for logout/cleanup
export const resetAllStores = () => {
  const { useAuthStore } = require('./authStore')
  const { useFriendsStore } = require('./friendsStore')
  const { useServerStore } = require('./serverStore')
  const { useRoomStore } = require('./roomStore')
  const { useUIStore } = require('./uiStore')
  
  // Reset all stores
  useAuthStore.getState().reset()
  useFriendsStore.getState().reset()
  useServerStore.getState().reset()
  useRoomStore.getState().reset()
  useUIStore.getState().resetModalState() // Don't reset entire UI state
  
  // Clear API token
  setAccessToken(null)
}

// Store hydration for SSR/persistence
export const hydrateStores = () => {
  // Stores are automatically hydrated by Zustand persist middleware
  // This function is for any additional hydration logic
  
  const { useAuthStore } = require('./authStore')
  const { useUIStore } = require('./uiStore')
  
  // Restore access token from auth store
  const authState = useAuthStore.getState()
  if (authState.accessToken) {
    setAccessToken(authState.accessToken)
  }
  
  // Apply current theme
  const uiState = useUIStore.getState()
  uiState.setTheme(uiState.theme)
}

// Store debugging utilities (development only)
export const getStoreStates = () => {
  if (import.meta.env.PROD) {
    console.warn('Store debugging is only available in development')
    return {}
  }
  
  const { useAuthStore } = require('./authStore')
  const { useFriendsStore } = require('./friendsStore')
  const { useServerStore } = require('./serverStore')
  const { useRoomStore } = require('./roomStore')
  const { useUIStore } = require('./uiStore')
  
  return {
    auth: useAuthStore.getState(),
    friends: useFriendsStore.getState(),
    servers: useServerStore.getState(),
    rooms: useRoomStore.getState(),
    ui: useUIStore.getState(),
  }
}

// Export store instance getters
export const getAuthStore = () => {
  const { useAuthStore } = require('./authStore')
  return useAuthStore.getState()
}

export const getFriendsStore = () => {
  const { useFriendsStore } = require('./friendsStore')
  return useFriendsStore.getState()
}

export const getServerStore = () => {
  const { useServerStore } = require('./serverStore')
  return useServerStore.getState()
}

export const getRoomStore = () => {
  const { useRoomStore } = require('./roomStore')
  return useRoomStore.getState()
}

export const getUIStore = () => {
  const { useUIStore } = require('./uiStore')
  return useUIStore.getState()
}

// Mobile-specific store helpers
export const getMobileStoreHelpers = () => {
  const { useUIStore } = require('./uiStore')
  const uiStore = useUIStore.getState()
  
  return {
    // Close all modals and sidebar for mobile navigation
    closeAllOverlays: () => {
      uiStore.closeAllModals()
      if (uiStore.isMobile) {
        uiStore.setSidebarOpen(false)
      }
    },
    
    // Handle mobile back button
    handleMobileBack: () => {
      if (uiStore.activeModal) {
        uiStore.closeModal()
        return true
      }
      
      if (uiStore.sidebarOpen && uiStore.isMobile) {
        uiStore.setSidebarOpen(false)
        return true
      }
      
      return uiStore.canGoBack()
    },
    
    // Get mobile-optimized store selectors
    getMobileSelectors: () => ({
      isMobile: uiStore.isMobile,
      isTouch: uiStore.isTouch,
      keyboardVisible: uiStore.keyboardVisible,
      safePadding: uiStore.safePadding,
      sidebarOpen: uiStore.sidebarOpen,
      activeModal: uiStore.activeModal,
    }),
  }
}

// Performance monitoring for stores
export const getStorePerformance = () => {
  if (import.meta.env.PROD) {
    return null
  }
  
  const { useUIStore } = require('./uiStore')
  const uiState = useUIStore.getState()
  
  return {
    lastRenderTime: uiState.lastRenderTime,
    renderTimeDelta: performance.now() - uiState.lastRenderTime,
    deviceInfo: uiState.deviceInfo,
  }
}

// Store event listeners for real-time updates
export const setupStoreListeners = (ablyChannel?: any) => {
  if (!ablyChannel) return () => {}
  
  const { useFriendsStore } = require('./friendsStore')
  const { useRoomStore } = require('./roomStore')
  
  // Friend status updates
  const friendsUnsubscribe = ablyChannel.subscribe('friends.status', (message: any) => {
    const friendsStore = useFriendsStore.getState()
    friendsStore.updateOnlineStatus(message.data.users)
  })
  
  // Message updates
  const messagesUnsubscribe = ablyChannel.subscribe('messages.new', (message: any) => {
    const roomStore = useRoomStore.getState()
    roomStore.addMessage(message.data.roomId, message.data.message)
  })
  
  // Typing indicators
  const typingUnsubscribe = ablyChannel.subscribe('typing.update', (message: any) => {
    const roomStore = useRoomStore.getState()
    roomStore.updateTypingUsers(message.data.roomId, message.data.users)
  })
  
  // Return cleanup function
  return () => {
    friendsUnsubscribe()
    messagesUnsubscribe()
    typingUnsubscribe()
  }
}

// Type exports
export type {
  User,
  Friend,
  FriendRequest,
  DMConversation,
  Server,
  ServerMember,
  Room,
  Message,
  MessageReaction,
  OnlineStatus,
  UIState,
  DeviceInfo,
  ThemeMode,
} from '../types'