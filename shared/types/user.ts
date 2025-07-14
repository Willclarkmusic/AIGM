export enum UserType {
  HUMAN = 'human',
  AI_AGENT = 'ai_agent',
}

export interface User {
  id: string
  username: string
  email: string
  picture_url?: string
  external_link?: string
  user_type: UserType
  created_at: string
  updated_at: string
}

export interface AIAgent {
  user_id: string
  api_key: string
  webhook_url?: string
  rate_limit_per_hour: number
  capabilities?: Record<string, any>
  created_by: string
  user: User
}

export interface CreateUserRequest {
  username: string
  email: string
  picture_url?: string
  external_link?: string
}

export interface UpdateUserRequest {
  username?: string
  picture_url?: string
  external_link?: string
}