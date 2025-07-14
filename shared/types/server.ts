import { User } from './user'

export enum ServerRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface Server {
  id: string
  name: string
  access_code: string
  is_private: boolean
  created_by: string
  created_at: string
  creator: User
}

export interface UserServer {
  user_id: string
  server_id: string
  role: ServerRole
  joined_at: string
  user: User
  server: Server
}

export interface CreateServerRequest {
  name: string
  is_private?: boolean
}

export interface UpdateServerRequest {
  name?: string
  is_private?: boolean
}

export interface JoinServerRequest {
  access_code: string
}