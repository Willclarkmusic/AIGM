import { User } from './user'
import { Room } from './room'

export interface Message {
  id: string
  room_id?: string
  user_id: string
  content?: string
  parent_message_id?: string
  created_at: string
  edited_at?: string
  user: User
  room?: Room
  parent_message?: Message
  files?: File[]
  reactions?: MessageReaction[]
}

export interface File {
  id: string
  message_id: string
  file_name?: string
  file_size?: number
  mime_type?: string
  s3_key?: string
  thumbnail_s3_key?: string
  uploaded_at: string
}

export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
  user: User
}

export interface CreateMessageRequest {
  room_id?: string
  content?: string
  parent_message_id?: string
  files?: FileUploadInfo[]
}

export interface UpdateMessageRequest {
  content: string
}

export interface FileUploadInfo {
  file_name: string
  file_size: number
  mime_type: string
}

export interface AddReactionRequest {
  emoji: string
}

export interface RemoveReactionRequest {
  emoji: string
}