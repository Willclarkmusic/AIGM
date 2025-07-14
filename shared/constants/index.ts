// API Constants
export const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000'
export const API_V1_PREFIX = '/api/v1'

// Ably Constants
export const ABLY_CHANNEL_PREFIX = 'aigm'

// File Upload Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'text/plain',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Pagination Constants
export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

// Message Constants
export const MAX_MESSAGE_LENGTH = 2000
export const TYPING_TIMEOUT = 3000 // 3 seconds

// Server/Room Constants
export const MAX_SERVERS_PER_USER = 3
export const ACCESS_CODE_LENGTH = 5
export const MAX_SERVER_NAME_LENGTH = 100
export const MAX_ROOM_NAME_LENGTH = 100

// Rate Limiting
export const DEFAULT_RATE_LIMIT = 100 // requests per hour
export const AI_AGENT_RATE_LIMIT = 100 // requests per hour

// Theme Constants
export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = typeof THEMES[number]

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'aigm-theme',
  AUTH_TOKEN: 'aigm-auth-token',
  USER_PREFERENCES: 'aigm-user-preferences',
} as const