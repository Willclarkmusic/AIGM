import { User } from './user'
import { Server } from './server'

export enum RoomRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface Room {
  id: string
  server_id: string
  name: string
  is_private: boolean
  created_by: string
  created_at: string
  server: Server
  creator: User
}

export interface UserRoom {
  user_id: string
  room_id: string
  role: RoomRole
  joined_at: string
  last_read_at?: string
  user: User
  room: Room
}

export interface CreateRoomRequest {
  server_id: string
  name: string
  is_private?: boolean
}

export interface UpdateRoomRequest {
  name?: string
  is_private?: boolean
}