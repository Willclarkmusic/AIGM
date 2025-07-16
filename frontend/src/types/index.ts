// User and Authentication Types
export interface User {
  id: string
  email: string
  name: string
  username: string
  avatar?: string
  bio?: string
  isEmailVerified: boolean
  isOnline: boolean
  lastSeen?: Date
  createdAt: Date
  updatedAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isEmailVerified: boolean
  accessToken: string | null
  refreshToken: string | null
}

// Friends and Social Types
export interface Friend {
  id: string
  username: string
  displayName: string
  avatar?: string
  isOnline: boolean
  lastSeen?: Date
  status?: string
  mutualServers?: string[]
}

export interface FriendRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromUser: User
  toUser: User
  status: 'pending' | 'accepted' | 'rejected'
  sentAt: Date
  respondedAt?: Date
}

export interface DMConversation {
  id: string
  participants: User[]
  lastMessage?: Message
  lastMessageAt?: Date
  isGroupDM: boolean
  unreadCount: number
  createdAt: Date
}

export interface OnlineStatus {
  userId: string
  isOnline: boolean
  lastSeen?: Date
  status?: 'online' | 'away' | 'busy' | 'invisible'
}

// Server and Room Types
export interface Server {
  id: string
  name: string
  description?: string
  icon?: string
  ownerId: string
  accessCode: string
  memberCount: number
  maxMembers: number
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ServerMember {
  id: string
  serverId: string
  userId: string
  user: User
  role: 'owner' | 'admin' | 'moderator' | 'member'
  joinedAt: Date
  permissions: string[]
}

export interface Room {
  id: string
  serverId: string
  name: string
  description?: string
  type: 'text' | 'voice' | 'announcement'
  position: number
  isPrivate: boolean
  parentId?: string // For categories
  permissions: RoomPermission[]
  createdAt: Date
  updatedAt: Date
}

export interface RoomPermission {
  id: string
  roomId: string
  roleId?: string
  userId?: string
  permissions: string[]
}

// Message Types
export interface Message {
  id: string
  content: string
  authorId: string
  author: User
  roomId?: string // For server messages
  conversationId?: string // For DMs
  parentId?: string // For replies
  type: 'text' | 'image' | 'file' | 'system'
  attachments: MessageAttachment[]
  reactions: MessageReaction[]
  mentions: string[]
  isEdited: boolean
  editedAt?: Date
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
  // Client-side properties
  isOptimistic?: boolean // For optimistic updates
  isSending?: boolean
  sendError?: string
}

export interface MessageAttachment {
  id: string
  messageId: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  thumbnailUrl?: string
  width?: number
  height?: number
  createdAt: Date
}

export interface MessageReaction {
  id: string
  messageId: string
  userId: string
  user: User
  emoji: string
  createdAt: Date
}

export interface TypingUser {
  userId: string
  user: User
  startedAt: Date
}

// UI and App State Types
export interface UIState {
  // Layout and Navigation
  sidebarOpen: boolean
  currentView: 'friends' | 'server'
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  screenWidth: number
  screenHeight: number
  
  // Modals and Overlays
  activeModal: string | null
  modalData: any
  
  // Theme and Appearance
  theme: ThemeMode
  
  // Mobile-specific UI state
  keyboardVisible: boolean
  safePadding: {
    top: number
    bottom: number
    left: number
    right: number
  }
  
  // Touch and Interaction
  isTouch: boolean
  lastTouchTime: number
  
  // Loading and Error States
  globalLoading: boolean
  globalError: string | null
  
  // Navigation History
  previousRoute?: string
  canGoBack: boolean
}

export interface ModalState {
  type: string
  data?: any
  isOpen: boolean
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  statusCode: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ErrorResponse {
  error: string
  message: string
  statusCode: number
  details?: any
}

// Store Action Types
export interface StoreActions {
  reset: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

// WebSocket Event Types
export interface WSEvent {
  type: string
  data: any
  timestamp: Date
}

export interface AblyMessage {
  name: string
  data: any
  timestamp: number
  clientId?: string
}

// File Upload Types
export interface FileUpload {
  file: File
  progress: number
  url?: string
  error?: string
  isUploading: boolean
  isComplete: boolean
}

// Search and Filter Types
export interface SearchFilters {
  query: string
  type?: 'users' | 'messages' | 'servers'
  serverId?: string
  roomId?: string
  authorId?: string
  dateRange?: {
    start: Date
    end: Date
  }
}

export interface SearchResult {
  id: string
  type: 'user' | 'message' | 'server' | 'room'
  title: string
  description?: string
  avatar?: string
  url: string
  relevance: number
}

// Notification Types
export interface Notification {
  id: string
  type: 'friend_request' | 'message' | 'mention' | 'server_invite' | 'system'
  title: string
  message: string
  data?: any
  isRead: boolean
  createdAt: Date
  expiresAt?: Date
}

// Mobile-specific Types
export interface TouchGesture {
  type: 'tap' | 'long_press' | 'swipe' | 'pinch'
  startX: number
  startY: number
  endX?: number
  endY?: number
  duration: number
  target: string
}

export interface DeviceInfo {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouch: boolean
  userAgent: string
  platform: string
  screenSize: {
    width: number
    height: number
  }
  viewport: {
    width: number
    height: number
  }
}

// Voice and Media Types (Phase 2)
export interface VoiceRoom {
  id: string
  serverId: string
  name: string
  participants: VoiceParticipant[]
  isActive: boolean
  maxParticipants: number
  createdAt: Date
}

export interface VoiceParticipant {
  userId: string
  user: User
  isMuted: boolean
  isDeafened: boolean
  isSpeaking: boolean
  joinedAt: Date
}

// Utility Types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export type ThemeMode = 'light' | 'dark' | 'system'

export type MessageSort = 'newest' | 'oldest'

export type FriendSort = 'name' | 'status' | 'recent'

export type ServerSort = 'name' | 'members' | 'recent'