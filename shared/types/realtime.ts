import { Message, MessageReaction } from './message'
import { User } from './user'
import { Room } from './room'

// Real-time event types for Ably
export enum RealtimeEventType {
  // Message events
  MESSAGE_CREATED = 'message.created',
  MESSAGE_UPDATED = 'message.updated',
  MESSAGE_DELETED = 'message.deleted',
  
  // Reaction events
  REACTION_ADDED = 'reaction.added',
  REACTION_REMOVED = 'reaction.removed',
  
  // Room/Server events
  USER_JOINED = 'user.joined',
  USER_LEFT = 'user.left',
  ROOM_CREATED = 'room.created',
  ROOM_UPDATED = 'room.updated',
  ROOM_DELETED = 'room.deleted',
  
  // Typing events
  TYPING_START = 'typing.start',
  TYPING_STOP = 'typing.stop',
  
  // Friend events
  FRIEND_REQUEST = 'friend.request',
  FRIEND_ACCEPTED = 'friend.accepted',
  FRIEND_REMOVED = 'friend.removed',
  FRIEND_ONLINE = 'friend.online',
  FRIEND_OFFLINE = 'friend.offline',
  
  // AI Agent events
  AGENT_ACTIVE = 'agent.active',
}

export interface RealtimeEvent<T = any> {
  type: RealtimeEventType
  data: T
  timestamp: string
  user_id?: string
}

// Event payload types
export interface MessageCreatedEvent {
  message: Message
}

export interface MessageUpdatedEvent {
  message: Message
}

export interface MessageDeletedEvent {
  message_id: string
  room_id: string
}

export interface ReactionAddedEvent {
  reaction: MessageReaction
}

export interface ReactionRemovedEvent {
  message_id: string
  user_id: string
  emoji: string
}

export interface UserJoinedEvent {
  user: User
  room_id: string
}

export interface UserLeftEvent {
  user_id: string
  room_id: string
}

export interface TypingEvent {
  user_id: string
  room_id: string
  username: string
}

// Channel naming conventions
export interface ChannelNames {
  room: (server_id: string, room_id: string) => string
  directMessage: (conversation_id: string) => string
  user: (user_id: string) => string
  server: (server_id: string) => string
}