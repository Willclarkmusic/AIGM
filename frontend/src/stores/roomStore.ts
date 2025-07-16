import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Room, Message, MessageReaction, TypingUser, User, PaginatedResponse } from '../types'
import { API } from '../lib/api'

interface RoomStore {
  // State
  rooms: Room[]
  currentRoom: Room | null
  messages: Map<string, Message[]> // roomId -> messages
  replies: Map<string, Message[]> // parentMessageId -> replies
  typingUsers: Map<string, TypingUser[]> // roomId -> typing users
  
  // Message pagination
  messagePagination: Map<string, {
    hasMore: boolean
    oldestMessageId: string | null
    loading: boolean
  }>
  
  // Loading states
  roomsLoading: boolean
  messagesLoading: boolean
  sendingMessage: boolean
  uploadingFile: boolean
  
  // Error states
  error: string | null
  sendError: string | null
  
  // UI state
  expandedReplies: Set<string> // messageIds with expanded replies
  
  // Actions - State setters
  setRooms: (rooms: Room[]) => void
  setCurrentRoom: (room: Room | null) => void
  setMessages: (roomId: string, messages: Message[]) => void
  addMessage: (roomId: string, message: Message) => void
  updateMessage: (roomId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (roomId: string, messageId: string) => void
  setReplies: (parentId: string, replies: Message[]) => void
  addReply: (parentId: string, reply: Message) => void
  setTypingUsers: (roomId: string, users: TypingUser[]) => void
  setLoading: (type: 'rooms' | 'messages' | 'sending' | 'uploading', loading: boolean) => void
  setError: (error: string | null) => void
  setSendError: (error: string | null) => void
  
  // Room actions
  loadRooms: (serverId: string) => Promise<void>
  createRoom: (serverId: string, name: string, type?: 'text' | 'voice', isPrivate?: boolean) => Promise<Room>
  updateRoom: (roomId: string, data: Partial<Room>) => Promise<void>
  deleteRoom: (roomId: string) => Promise<void>
  
  // Message actions
  loadMessages: (roomId: string, before?: string, limit?: number) => Promise<void>
  loadMoreMessages: (roomId: string) => Promise<void>
  sendMessage: (roomId: string, content: string, parentId?: string) => Promise<Message>
  editMessage: (roomId: string, messageId: string, content: string) => Promise<void>
  deleteMessage: (roomId: string, messageId: string) => Promise<void>
  
  // Reactions
  addReaction: (roomId: string, messageId: string, emoji: string) => Promise<void>
  removeReaction: (roomId: string, messageId: string, emoji: string) => Promise<void>
  
  // Replies
  loadReplies: (messageId: string) => Promise<void>
  toggleRepliesExpanded: (messageId: string) => void
  
  // File uploads
  uploadFile: (roomId: string, file: File, onProgress?: (progress: number) => void) => Promise<Message>
  
  // Typing indicators
  startTyping: (roomId: string) => void
  stopTyping: (roomId: string) => void
  updateTypingUsers: (roomId: string, users: TypingUser[]) => void
  
  // Message search
  searchMessages: (roomId: string, query: string, limit?: number) => Promise<Message[]>
  
  // Utilities
  getRoomById: (roomId: string) => Room | null
  getRoomMessages: (roomId: string) => Message[]
  getMessageReplies: (messageId: string) => Message[]
  getMessageById: (roomId: string, messageId: string) => Message | null
  hasMoreMessages: (roomId: string) => boolean
  getTypingUsers: (roomId: string) => TypingUser[]
  
  // Navigation helpers
  selectRoom: (roomId: string) => Promise<void>
  
  // Optimistic updates
  addOptimisticMessage: (roomId: string, message: Omit<Message, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateOptimisticMessage: (tempId: string, message: Message) => void
  removeOptimisticMessage: (tempId: string) => void
  
  // Cleanup
  reset: () => void
  resetRoom: (roomId: string) => void
}

const initialState = {
  rooms: [],
  currentRoom: null,
  messages: new Map<string, Message[]>(),
  replies: new Map<string, Message[]>(),
  typingUsers: new Map<string, TypingUser[]>(),
  messagePagination: new Map(),
  roomsLoading: false,
  messagesLoading: false,
  sendingMessage: false,
  uploadingFile: false,
  error: null,
  sendError: null,
  expandedReplies: new Set<string>(),
}

export const useRoomStore = create<RoomStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // State setters
      setRooms: (rooms) => {
        set({ rooms }, false, 'rooms/setRooms')
      },

      setCurrentRoom: (room) => {
        set({ currentRoom: room }, false, 'rooms/setCurrentRoom')
      },

      setMessages: (roomId, messages) => {
        const messagesMap = new Map(get().messages)
        messagesMap.set(roomId, messages)
        set({ messages: messagesMap }, false, 'rooms/setMessages')
      },

      addMessage: (roomId, message) => {
        const messagesMap = new Map(get().messages)
        const currentMessages = messagesMap.get(roomId) || []
        
        // Insert message in chronological order
        const insertIndex = currentMessages.findIndex(m => 
          new Date(m.createdAt) > new Date(message.createdAt)
        )
        
        if (insertIndex === -1) {
          // Add to end
          messagesMap.set(roomId, [...currentMessages, message])
        } else {
          // Insert at correct position
          const newMessages = [...currentMessages]
          newMessages.splice(insertIndex, 0, message)
          messagesMap.set(roomId, newMessages)
        }
        
        set({ messages: messagesMap }, false, 'rooms/addMessage')
      },

      updateMessage: (roomId, messageId, updates) => {
        const messagesMap = new Map(get().messages)
        const currentMessages = messagesMap.get(roomId) || []
        const updatedMessages = currentMessages.map(message =>
          message.id === messageId ? { ...message, ...updates } : message
        )
        messagesMap.set(roomId, updatedMessages)
        set({ messages: messagesMap }, false, 'rooms/updateMessage')
      },

      removeMessage: (roomId, messageId) => {
        const messagesMap = new Map(get().messages)
        const currentMessages = messagesMap.get(roomId) || []
        const filteredMessages = currentMessages.filter(message => message.id !== messageId)
        messagesMap.set(roomId, filteredMessages)
        set({ messages: messagesMap }, false, 'rooms/removeMessage')
        
        // Also remove replies if this was a parent message
        const repliesMap = new Map(get().replies)
        repliesMap.delete(messageId)
        set({ replies: repliesMap }, false, 'rooms/removeMessageReplies')
      },

      setReplies: (parentId, replies) => {
        const repliesMap = new Map(get().replies)
        repliesMap.set(parentId, replies)
        set({ replies: repliesMap }, false, 'rooms/setReplies')
      },

      addReply: (parentId, reply) => {
        const repliesMap = new Map(get().replies)
        const currentReplies = repliesMap.get(parentId) || []
        repliesMap.set(parentId, [...currentReplies, reply])
        set({ replies: repliesMap }, false, 'rooms/addReply')
      },

      setTypingUsers: (roomId, users) => {
        const typingMap = new Map(get().typingUsers)
        typingMap.set(roomId, users)
        set({ typingUsers: typingMap }, false, 'rooms/setTypingUsers')
      },

      setLoading: (type, loading) => {
        set(
          { [`${type}Loading`]: loading },
          false,
          `rooms/setLoading/${type}`
        )
      },

      setError: (error) => {
        set({ error }, false, 'rooms/setError')
      },

      setSendError: (error) => {
        set({ sendError: error }, false, 'rooms/setSendError')
      },

      // Room actions
      loadRooms: async (serverId) => {
        get().setLoading('rooms', true)
        get().setError(null)

        try {
          const response = await API.get<Room[]>(`/servers/${serverId}/rooms`)

          if (response.success && response.data) {
            get().setRooms(response.data)
          } else {
            throw new Error(response.error || 'Failed to load rooms')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load rooms'
          get().setError(errorMessage)
        } finally {
          get().setLoading('rooms', false)
        }
      },

      createRoom: async (serverId, name, type = 'text', isPrivate = false) => {
        try {
          const response = await API.post<Room>(`/servers/${serverId}/rooms`, {
            name: name.trim(),
            type,
            isPrivate,
          })

          if (response.success && response.data) {
            // Add to rooms list
            const rooms = [...get().rooms, response.data]
            get().setRooms(rooms)
            
            return response.data
          } else {
            throw new Error(response.error || 'Failed to create room')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create room'
          get().setError(errorMessage)
          throw error
        }
      },

      updateRoom: async (roomId, data) => {
        try {
          const response = await API.patch<Room>(`/rooms/${roomId}`, data)

          if (response.success && response.data) {
            // Update in rooms list
            const rooms = get().rooms.map(room =>
              room.id === roomId ? response.data! : room
            )
            get().setRooms(rooms)
            
            // Update current room if it's the one we updated
            if (get().currentRoom?.id === roomId) {
              get().setCurrentRoom(response.data)
            }
          } else {
            throw new Error(response.error || 'Failed to update room')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update room'
          get().setError(errorMessage)
          throw error
        }
      },

      deleteRoom: async (roomId) => {
        try {
          const response = await API.delete(`/rooms/${roomId}`)

          if (response.success) {
            // Remove from rooms list
            const rooms = get().rooms.filter(room => room.id !== roomId)
            get().setRooms(rooms)
            
            // Clear current room if it was the one we deleted
            if (get().currentRoom?.id === roomId) {
              get().setCurrentRoom(null)
            }
            
            // Clear room data
            get().resetRoom(roomId)
          } else {
            throw new Error(response.error || 'Failed to delete room')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete room'
          get().setError(errorMessage)
          throw error
        }
      },

      // Message actions
      loadMessages: async (roomId, before, limit = 50) => {
        get().setLoading('messages', true)
        get().setError(null)

        try {
          const response = await API.get<PaginatedResponse<Message>>(`/rooms/${roomId}/messages`, {
            params: {
              before,
              limit,
            },
          })

          if (response.success && response.data) {
            const { data: messages, hasNext } = response.data
            
            if (before) {
              // Prepend older messages
              const currentMessages = get().messages.get(roomId) || []
              get().setMessages(roomId, [...messages, ...currentMessages])
            } else {
              // Set initial messages
              get().setMessages(roomId, messages)
            }

            // Update pagination
            const pagination = new Map(get().messagePagination)
            pagination.set(roomId, {
              hasMore: hasNext,
              oldestMessageId: messages.length > 0 ? messages[0].id : null,
              loading: false,
            })
            set({ messagePagination: pagination })
          } else {
            throw new Error(response.error || 'Failed to load messages')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load messages'
          get().setError(errorMessage)
        } finally {
          get().setLoading('messages', false)
        }
      },

      loadMoreMessages: async (roomId) => {
        const pagination = get().messagePagination.get(roomId)
        if (!pagination?.hasMore || pagination.loading) {
          return
        }

        // Update pagination loading state
        const paginationMap = new Map(get().messagePagination)
        paginationMap.set(roomId, { ...pagination, loading: true })
        set({ messagePagination: paginationMap })

        try {
          await get().loadMessages(roomId, pagination.oldestMessageId || undefined)
        } finally {
          // Update pagination loading state
          const updatedPagination = get().messagePagination.get(roomId)
          if (updatedPagination) {
            const paginationMap = new Map(get().messagePagination)
            paginationMap.set(roomId, { ...updatedPagination, loading: false })
            set({ messagePagination: paginationMap })
          }
        }
      },

      sendMessage: async (roomId, content, parentId) => {
        get().setLoading('sending', true)
        get().setSendError(null)

        // Create optimistic message
        const tempId = get().addOptimisticMessage(roomId, {
          content: content.trim(),
          authorId: '', // Will be filled by backend
          author: {} as User, // Will be filled by backend
          roomId,
          parentId,
          type: 'text',
          attachments: [],
          reactions: [],
          mentions: [],
          isEdited: false,
          isPinned: false,
          isOptimistic: true,
          isSending: true,
        })

        try {
          const response = await API.post<Message>(`/rooms/${roomId}/messages`, {
            content: content.trim(),
            parentId,
          })

          if (response.success && response.data) {
            // Update optimistic message with real data
            get().updateOptimisticMessage(tempId, response.data)
            
            // Add reply if this was a reply
            if (parentId) {
              get().addReply(parentId, response.data)
            }
            
            return response.data
          } else {
            throw new Error(response.error || 'Failed to send message')
          }
        } catch (error) {
          // Remove failed optimistic message
          get().removeOptimisticMessage(tempId)
          
          const errorMessage = error instanceof Error ? error.message : 'Failed to send message'
          get().setSendError(errorMessage)
          throw error
        } finally {
          get().setLoading('sending', false)
        }
      },

      editMessage: async (roomId, messageId, content) => {
        try {
          const response = await API.patch<Message>(`/rooms/${roomId}/messages/${messageId}`, {
            content: content.trim(),
          })

          if (response.success && response.data) {
            get().updateMessage(roomId, messageId, response.data)
          } else {
            throw new Error(response.error || 'Failed to edit message')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to edit message'
          get().setError(errorMessage)
          throw error
        }
      },

      deleteMessage: async (roomId, messageId) => {
        try {
          const response = await API.delete(`/rooms/${roomId}/messages/${messageId}`)

          if (response.success) {
            get().removeMessage(roomId, messageId)
          } else {
            throw new Error(response.error || 'Failed to delete message')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete message'
          get().setError(errorMessage)
          throw error
        }
      },

      // Reactions
      addReaction: async (roomId, messageId, emoji) => {
        try {
          const response = await API.post(`/rooms/${roomId}/messages/${messageId}/reactions`, {
            emoji,
          })

          if (response.success && response.data) {
            // Update message reactions
            const messages = get().messages.get(roomId) || []
            const updatedMessages = messages.map(message =>
              message.id === messageId
                ? { ...message, reactions: response.data.reactions }
                : message
            )
            get().setMessages(roomId, updatedMessages)
          } else {
            throw new Error(response.error || 'Failed to add reaction')
          }
        } catch (error) {
          console.warn('Failed to add reaction:', error)
        }
      },

      removeReaction: async (roomId, messageId, emoji) => {
        try {
          const response = await API.delete(`/rooms/${roomId}/messages/${messageId}/reactions/${emoji}`)

          if (response.success && response.data) {
            // Update message reactions
            const messages = get().messages.get(roomId) || []
            const updatedMessages = messages.map(message =>
              message.id === messageId
                ? { ...message, reactions: response.data.reactions }
                : message
            )
            get().setMessages(roomId, updatedMessages)
          } else {
            throw new Error(response.error || 'Failed to remove reaction')
          }
        } catch (error) {
          console.warn('Failed to remove reaction:', error)
        }
      },

      // Replies
      loadReplies: async (messageId) => {
        try {
          const response = await API.get<Message[]>(`/messages/${messageId}/replies`)

          if (response.success && response.data) {
            get().setReplies(messageId, response.data)
          } else {
            console.warn('Failed to load replies:', response.error)
          }
        } catch (error) {
          console.warn('Failed to load replies:', error)
        }
      },

      toggleRepliesExpanded: (messageId) => {
        const expandedReplies = new Set(get().expandedReplies)
        if (expandedReplies.has(messageId)) {
          expandedReplies.delete(messageId)
        } else {
          expandedReplies.add(messageId)
          // Load replies if not already loaded
          if (!get().replies.has(messageId)) {
            get().loadReplies(messageId)
          }
        }
        set({ expandedReplies }, false, 'rooms/toggleRepliesExpanded')
      },

      // File uploads
      uploadFile: async (roomId, file, onProgress) => {
        get().setLoading('uploading', true)
        get().setSendError(null)

        try {
          const response = await API.upload<Message>(`/rooms/${roomId}/upload`, file, onProgress)

          if (response.success && response.data) {
            get().addMessage(roomId, response.data)
            return response.data
          } else {
            throw new Error(response.error || 'Failed to upload file')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to upload file'
          get().setSendError(errorMessage)
          throw error
        } finally {
          get().setLoading('uploading', false)
        }
      },

      // Typing indicators
      startTyping: (roomId) => {
        // This would typically be handled by the real-time system
        // Here we just make an API call to notify the server
        API.post(`/rooms/${roomId}/typing/start`).catch(console.warn)
      },

      stopTyping: (roomId) => {
        // This would typically be handled by the real-time system
        API.post(`/rooms/${roomId}/typing/stop`).catch(console.warn)
      },

      updateTypingUsers: (roomId, users) => {
        get().setTypingUsers(roomId, users)
      },

      // Message search
      searchMessages: async (roomId, query, limit = 20) => {
        try {
          const response = await API.get<Message[]>(`/rooms/${roomId}/messages/search`, {
            params: { q: query, limit },
          })

          if (response.success && response.data) {
            return response.data
          } else {
            return []
          }
        } catch (error) {
          console.warn('Message search failed:', error)
          return []
        }
      },

      // Utilities
      getRoomById: (roomId) => {
        return get().rooms.find(room => room.id === roomId) || null
      },

      getRoomMessages: (roomId) => {
        return get().messages.get(roomId) || []
      },

      getMessageReplies: (messageId) => {
        return get().replies.get(messageId) || []
      },

      getMessageById: (roomId, messageId) => {
        const messages = get().messages.get(roomId) || []
        return messages.find(message => message.id === messageId) || null
      },

      hasMoreMessages: (roomId) => {
        const pagination = get().messagePagination.get(roomId)
        return pagination?.hasMore || false
      },

      getTypingUsers: (roomId) => {
        return get().typingUsers.get(roomId) || []
      },

      // Navigation helpers
      selectRoom: async (roomId) => {
        const room = get().getRoomById(roomId)
        if (room) {
          get().setCurrentRoom(room)
          
          // Load messages if not already loaded
          if (!get().messages.has(roomId)) {
            await get().loadMessages(roomId)
          }
        }
      },

      // Optimistic updates
      addOptimisticMessage: (roomId, message) => {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const optimisticMessage: Message = {
          id: tempId,
          ...message,
          createdAt: new Date(),
          updatedAt: new Date(),
          isOptimistic: true,
          isSending: true,
        }
        
        get().addMessage(roomId, optimisticMessage)
        return tempId
      },

      updateOptimisticMessage: (tempId, message) => {
        // Find and replace optimistic message across all rooms
        const messagesMap = new Map(get().messages)
        
        for (const [roomId, messages] of messagesMap.entries()) {
          const messageIndex = messages.findIndex(m => m.id === tempId)
          if (messageIndex !== -1) {
            const updatedMessages = [...messages]
            updatedMessages[messageIndex] = message
            messagesMap.set(roomId, updatedMessages)
            break
          }
        }
        
        set({ messages: messagesMap }, false, 'rooms/updateOptimisticMessage')
      },

      removeOptimisticMessage: (tempId) => {
        // Find and remove optimistic message across all rooms
        const messagesMap = new Map(get().messages)
        
        for (const [roomId, messages] of messagesMap.entries()) {
          const filteredMessages = messages.filter(m => m.id !== tempId)
          if (filteredMessages.length !== messages.length) {
            messagesMap.set(roomId, filteredMessages)
            break
          }
        }
        
        set({ messages: messagesMap }, false, 'rooms/removeOptimisticMessage')
      },

      reset: () => {
        set(initialState, false, 'rooms/reset')
      },

      resetRoom: (roomId) => {
        const messagesMap = new Map(get().messages)
        messagesMap.delete(roomId)
        
        const typingMap = new Map(get().typingUsers)
        typingMap.delete(roomId)
        
        const paginationMap = new Map(get().messagePagination)
        paginationMap.delete(roomId)
        
        set({
          messages: messagesMap,
          typingUsers: typingMap,
          messagePagination: paginationMap,
        }, false, 'rooms/resetRoom')
      },
    }),
    {
      name: 'room-store',
    }
  )
)

// Selectors for optimized re-renders
export const useRooms = () => useRoomStore(state => state.rooms)
export const useCurrentRoom = () => useRoomStore(state => state.currentRoom)
export const useRoomsLoading = () => useRoomStore(state => state.roomsLoading)
export const useMessagesLoading = () => useRoomStore(state => state.messagesLoading)
export const useRoomsError = () => useRoomStore(state => state.error)

// Action selectors
export const useRoomActions = () => useRoomStore(state => ({
  loadRooms: state.loadRooms,
  createRoom: state.createRoom,
  selectRoom: state.selectRoom,
  updateRoom: state.updateRoom,
  deleteRoom: state.deleteRoom,
}))

export const useMessageActions = () => useRoomStore(state => ({
  loadMessages: state.loadMessages,
  loadMoreMessages: state.loadMoreMessages,
  sendMessage: state.sendMessage,
  editMessage: state.editMessage,
  deleteMessage: state.deleteMessage,
  uploadFile: state.uploadFile,
  addReaction: state.addReaction,
  removeReaction: state.removeReaction,
}))

// Helper hooks
export const useRoomMessages = (roomId: string | undefined) => {
  return useRoomStore(state => 
    roomId ? state.getRoomMessages(roomId) : []
  )
}

export const useMessageReplies = (messageId: string | undefined) => {
  return useRoomStore(state => 
    messageId ? state.getMessageReplies(messageId) : []
  )
}

export const useTypingUsers = (roomId: string | undefined) => {
  return useRoomStore(state => 
    roomId ? state.getTypingUsers(roomId) : []
  )
}

export const useHasMoreMessages = (roomId: string | undefined) => {
  return useRoomStore(state => 
    roomId ? state.hasMoreMessages(roomId) : false
  )
}