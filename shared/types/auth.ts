import { User } from './user'

export interface AuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export interface AuthUser extends User {
  // Additional auth-specific fields if needed
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  tokens: AuthTokens
}

export interface LogoutRequest {
  refresh_token: string
}

// Auth0 specific types
export interface Auth0User {
  sub: string
  email: string
  email_verified: boolean
  name: string
  nickname: string
  picture: string
  updated_at: string
}

export interface Auth0CallbackData {
  code: string
  state: string
}