import { User } from './user'

export enum FriendshipStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

export interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: FriendshipStatus
  created_at: string
  accepted_at?: string
  requester: User
  friend: User
}

export interface DirectConversation {
  id: string
  created_at: string
  members: DirectConversationMember[]
}

export interface DirectConversationMember {
  conversation_id: string
  user_id: string
  last_read_at?: string
  user: User
}

export interface SendFriendRequestRequest {
  friend_email_or_username: string
}

export interface CreateDirectConversationRequest {
  user_ids: string[]
}