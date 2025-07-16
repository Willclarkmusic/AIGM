import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Friend, FriendRequest, DMConversation, OnlineStatus, User, LoadingState, PaginatedResponse } from '../types'
import { API } from '../lib/api'

interface FriendsStore {
  // State
  friends: Friend[]
  requests: FriendRequest[]
  conversations: DMConversation[]
  onlineUsers: Map<string, OnlineStatus>
  blockedUsers: User[]
  
  // Loading states
  friendsLoading: boolean
  requestsLoading: boolean
  conversationsLoading: boolean
  sendingRequest: boolean
  
  // Error states
  error: string | null
  requestError: string | null
  
  // Pagination
  friendsPagination: {
    page: number
    hasNext: boolean
    total: number
  }
  
  // Search and filters
  searchQuery: string
  sortBy: 'name' | 'status' | 'recent'
  filterOnline: boolean
  
  // Actions - State setters
  setFriends: (friends: Friend[]) => void
  setRequests: (requests: FriendRequest[]) => void
  setConversations: (conversations: DMConversation[]) => void
  setOnlineStatus: (userId: string, status: OnlineStatus) => void
  setLoading: (type: 'friends' | 'requests' | 'conversations' | 'sending', loading: boolean) => void
  setError: (error: string | null) => void
  setRequestError: (error: string | null) => void
  
  // Search and filters
  setSearchQuery: (query: string) => void
  setSortBy: (sortBy: 'name' | 'status' | 'recent') => void
  setFilterOnline: (filterOnline: boolean) => void
  
  // Friend actions
  loadFriends: (page?: number, refresh?: boolean) => Promise<void>
  sendFriendRequest: (usernameOrEmail: string) => Promise<void>
  acceptFriendRequest: (requestId: string) => Promise<void>
  rejectFriendRequest: (requestId: string) => Promise<void>
  removeFriend: (friendId: string) => Promise<void>
  blockUser: (userId: string) => Promise<void>
  unblockUser: (userId: string) => Promise<void>
  
  // Friend requests
  loadFriendRequests: () => Promise<void>
  cancelFriendRequest: (requestId: string) => Promise<void>
  
  // Conversations
  loadConversations: () => Promise<void>
  startConversation: (friendIds: string[]) => Promise<DMConversation>
  deleteConversation: (conversationId: string) => Promise<void>
  markConversationRead: (conversationId: string) => Promise<void>
  
  // Online status
  updateOnlineStatus: (users: OnlineStatus[]) => void
  setUserOffline: (userId: string) => void
  getUserOnlineStatus: (userId: string) => OnlineStatus | null
  
  // Search and discovery
  searchUsers: (query: string) => Promise<User[]>
  getSuggestedFriends: () => Promise<User[]>
  
  // Utilities
  getFriendById: (friendId: string) => Friend | null
  getConversationById: (conversationId: string) => DMConversation | null
  getFilteredFriends: () => Friend[]
  getTotalUnreadCount: () => number
  
  // Cleanup
  reset: () => void
}

const initialState = {
  friends: [],
  requests: [],
  conversations: [],
  onlineUsers: new Map<string, OnlineStatus>(),
  blockedUsers: [],
  friendsLoading: false,
  requestsLoading: false,
  conversationsLoading: false,
  sendingRequest: false,
  error: null,
  requestError: null,
  friendsPagination: {
    page: 1,
    hasNext: false,
    total: 0,
  },
  searchQuery: '',
  sortBy: 'name' as const,
  filterOnline: false,
}

export const useFriendsStore = create<FriendsStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // State setters
      setFriends: (friends) => {
        set({ friends }, false, 'friends/setFriends')
      },

      setRequests: (requests) => {
        set({ requests }, false, 'friends/setRequests')
      },

      setConversations: (conversations) => {
        set({ conversations }, false, 'friends/setConversations')
      },

      setOnlineStatus: (userId, status) => {
        const onlineUsers = new Map(get().onlineUsers)
        onlineUsers.set(userId, status)
        set({ onlineUsers }, false, 'friends/setOnlineStatus')
        
        // Update friends list
        const friends = get().friends.map(friend =>
          friend.id === userId
            ? { ...friend, isOnline: status.isOnline, lastSeen: status.lastSeen }
            : friend
        )
        set({ friends }, false, 'friends/updateFriendOnlineStatus')
      },

      setLoading: (type, loading) => {
        set(
          { [`${type}Loading`]: loading },
          false,
          `friends/setLoading/${type}`
        )
      },

      setError: (error) => {
        set({ error }, false, 'friends/setError')
      },

      setRequestError: (error) => {
        set({ requestError: error }, false, 'friends/setRequestError')
      },

      // Search and filters
      setSearchQuery: (query) => {
        set({ searchQuery: query }, false, 'friends/setSearchQuery')
      },

      setSortBy: (sortBy) => {
        set({ sortBy }, false, 'friends/setSortBy')
      },

      setFilterOnline: (filterOnline) => {
        set({ filterOnline }, false, 'friends/setFilterOnline')
      },

      // Friend actions
      loadFriends: async (page = 1, refresh = false) => {
        if (refresh) {
          set({ friends: [], friendsPagination: { ...get().friendsPagination, page: 1 } })
        }

        get().setLoading('friends', true)
        get().setError(null)

        try {
          const response = await API.get<PaginatedResponse<Friend>>('/friends', {
            params: {
              page,
              limit: 20,
              search: get().searchQuery || undefined,
              sort: get().sortBy,
              online_only: get().filterOnline || undefined,
            },
          })

          if (response.success && response.data) {
            const { data: friends, ...pagination } = response.data
            
            if (page === 1 || refresh) {
              get().setFriends(friends)
            } else {
              // Append to existing friends for pagination
              const existingFriends = get().friends
              get().setFriends([...existingFriends, ...friends])
            }

            set({
              friendsPagination: {
                page: pagination.page,
                hasNext: pagination.hasNext,
                total: pagination.total,
              },
            })
          } else {
            throw new Error(response.error || 'Failed to load friends')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load friends'
          get().setError(errorMessage)
        } finally {
          get().setLoading('friends', false)
        }
      },

      sendFriendRequest: async (usernameOrEmail) => {
        get().setLoading('sending', true)
        get().setRequestError(null)

        try {
          const response = await API.post('/friends/requests', {
            usernameOrEmail,
          })

          if (response.success) {
            // Reload requests to show the new outgoing request
            await get().loadFriendRequests()
          } else {
            throw new Error(response.error || 'Failed to send friend request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request'
          get().setRequestError(errorMessage)
          throw error
        } finally {
          get().setLoading('sending', false)
        }
      },

      acceptFriendRequest: async (requestId) => {
        try {
          const response = await API.post(`/friends/requests/${requestId}/accept`)

          if (response.success) {
            // Remove request from list
            const requests = get().requests.filter(req => req.id !== requestId)
            get().setRequests(requests)
            
            // Reload friends list to include new friend
            await get().loadFriends(1, true)
          } else {
            throw new Error(response.error || 'Failed to accept friend request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to accept friend request'
          get().setError(errorMessage)
          throw error
        }
      },

      rejectFriendRequest: async (requestId) => {
        try {
          const response = await API.post(`/friends/requests/${requestId}/reject`)

          if (response.success) {
            // Remove request from list
            const requests = get().requests.filter(req => req.id !== requestId)
            get().setRequests(requests)
          } else {
            throw new Error(response.error || 'Failed to reject friend request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to reject friend request'
          get().setError(errorMessage)
          throw error
        }
      },

      removeFriend: async (friendId) => {
        try {
          const response = await API.delete(`/friends/${friendId}`)

          if (response.success) {
            // Remove friend from list
            const friends = get().friends.filter(friend => friend.id !== friendId)
            get().setFriends(friends)
            
            // Remove related conversations
            const conversations = get().conversations.filter(
              conv => !conv.participants.some(p => p.id === friendId)
            )
            get().setConversations(conversations)
          } else {
            throw new Error(response.error || 'Failed to remove friend')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to remove friend'
          get().setError(errorMessage)
          throw error
        }
      },

      blockUser: async (userId) => {
        try {
          const response = await API.post(`/users/${userId}/block`)

          if (response.success) {
            // Remove from friends if they were a friend
            const friends = get().friends.filter(friend => friend.id !== userId)
            get().setFriends(friends)
            
            // Add to blocked users list
            if (response.data) {
              const blockedUsers = [...get().blockedUsers, response.data]
              set({ blockedUsers })
            }
          } else {
            throw new Error(response.error || 'Failed to block user')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to block user'
          get().setError(errorMessage)
          throw error
        }
      },

      unblockUser: async (userId) => {
        try {
          const response = await API.post(`/users/${userId}/unblock`)

          if (response.success) {
            // Remove from blocked users list
            const blockedUsers = get().blockedUsers.filter(user => user.id !== userId)
            set({ blockedUsers })
          } else {
            throw new Error(response.error || 'Failed to unblock user')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to unblock user'
          get().setError(errorMessage)
          throw error
        }
      },

      // Friend requests
      loadFriendRequests: async () => {
        get().setLoading('requests', true)
        get().setError(null)

        try {
          const response = await API.get<FriendRequest[]>('/friends/requests')

          if (response.success && response.data) {
            get().setRequests(response.data)
          } else {
            throw new Error(response.error || 'Failed to load friend requests')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load friend requests'
          get().setError(errorMessage)
        } finally {
          get().setLoading('requests', false)
        }
      },

      cancelFriendRequest: async (requestId) => {
        try {
          const response = await API.delete(`/friends/requests/${requestId}`)

          if (response.success) {
            // Remove request from list
            const requests = get().requests.filter(req => req.id !== requestId)
            get().setRequests(requests)
          } else {
            throw new Error(response.error || 'Failed to cancel friend request')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to cancel friend request'
          get().setError(errorMessage)
          throw error
        }
      },

      // Conversations
      loadConversations: async () => {
        get().setLoading('conversations', true)
        get().setError(null)

        try {
          const response = await API.get<DMConversation[]>('/conversations')

          if (response.success && response.data) {
            get().setConversations(response.data)
          } else {
            throw new Error(response.error || 'Failed to load conversations')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations'
          get().setError(errorMessage)
        } finally {
          get().setLoading('conversations', false)
        }
      },

      startConversation: async (friendIds) => {
        try {
          const response = await API.post<DMConversation>('/conversations', {
            participantIds: friendIds,
          })

          if (response.success && response.data) {
            // Add to conversations list
            const conversations = [...get().conversations, response.data]
            get().setConversations(conversations)
            
            return response.data
          } else {
            throw new Error(response.error || 'Failed to start conversation')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to start conversation'
          get().setError(errorMessage)
          throw error
        }
      },

      deleteConversation: async (conversationId) => {
        try {
          const response = await API.delete(`/conversations/${conversationId}`)

          if (response.success) {
            // Remove from conversations list
            const conversations = get().conversations.filter(conv => conv.id !== conversationId)
            get().setConversations(conversations)
          } else {
            throw new Error(response.error || 'Failed to delete conversation')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation'
          get().setError(errorMessage)
          throw error
        }
      },

      markConversationRead: async (conversationId) => {
        try {
          const response = await API.post(`/conversations/${conversationId}/read`)

          if (response.success) {
            // Update conversation unread count
            const conversations = get().conversations.map(conv =>
              conv.id === conversationId
                ? { ...conv, unreadCount: 0 }
                : conv
            )
            get().setConversations(conversations)
          } else {
            throw new Error(response.error || 'Failed to mark conversation as read')
          }
        } catch (error) {
          // Don't show error for this action as it's not critical
          console.warn('Failed to mark conversation as read:', error)
        }
      },

      // Online status
      updateOnlineStatus: (users) => {
        const onlineUsers = new Map(get().onlineUsers)
        users.forEach(user => {
          onlineUsers.set(user.userId, user)
        })
        set({ onlineUsers }, false, 'friends/updateOnlineStatus')
        
        // Update friends list
        const friends = get().friends.map(friend => {
          const status = onlineUsers.get(friend.id)
          return status
            ? { ...friend, isOnline: status.isOnline, lastSeen: status.lastSeen }
            : friend
        })
        set({ friends }, false, 'friends/updateFriendsOnlineStatus')
      },

      setUserOffline: (userId) => {
        const onlineUsers = new Map(get().onlineUsers)
        const currentStatus = onlineUsers.get(userId)
        
        if (currentStatus) {
          onlineUsers.set(userId, {
            ...currentStatus,
            isOnline: false,
            lastSeen: new Date(),
          })
          set({ onlineUsers }, false, 'friends/setUserOffline')
          
          // Update friends list
          const friends = get().friends.map(friend =>
            friend.id === userId
              ? { ...friend, isOnline: false, lastSeen: new Date() }
              : friend
          )
          set({ friends }, false, 'friends/updateFriendOffline')
        }
      },

      getUserOnlineStatus: (userId) => {
        return get().onlineUsers.get(userId) || null
      },

      // Search and discovery
      searchUsers: async (query) => {
        try {
          const response = await API.get<User[]>('/users/search', {
            params: { q: query, limit: 10 },
          })

          if (response.success && response.data) {
            return response.data
          } else {
            throw new Error(response.error || 'Search failed')
          }
        } catch (error) {
          console.warn('User search failed:', error)
          return []
        }
      },

      getSuggestedFriends: async () => {
        try {
          const response = await API.get<User[]>('/friends/suggestions')

          if (response.success && response.data) {
            return response.data
          } else {
            return []
          }
        } catch (error) {
          console.warn('Failed to get friend suggestions:', error)
          return []
        }
      },

      // Utilities
      getFriendById: (friendId) => {
        return get().friends.find(friend => friend.id === friendId) || null
      },

      getConversationById: (conversationId) => {
        return get().conversations.find(conv => conv.id === conversationId) || null
      },

      getFilteredFriends: () => {
        const { friends, searchQuery, sortBy, filterOnline } = get()
        
        let filtered = friends

        // Apply search filter
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(
            friend =>
              friend.displayName.toLowerCase().includes(query) ||
              friend.username.toLowerCase().includes(query)
          )
        }

        // Apply online filter
        if (filterOnline) {
          filtered = filtered.filter(friend => friend.isOnline)
        }

        // Apply sorting
        filtered.sort((a, b) => {
          switch (sortBy) {
            case 'name':
              return a.displayName.localeCompare(b.displayName)
            case 'status':
              if (a.isOnline && !b.isOnline) return -1
              if (!a.isOnline && b.isOnline) return 1
              return a.displayName.localeCompare(b.displayName)
            case 'recent':
              const aTime = a.lastSeen?.getTime() || 0
              const bTime = b.lastSeen?.getTime() || 0
              return bTime - aTime
            default:
              return 0
          }
        })

        return filtered
      },

      getTotalUnreadCount: () => {
        return get().conversations.reduce((total, conv) => total + conv.unreadCount, 0)
      },

      reset: () => {
        set(initialState, false, 'friends/reset')
      },
    }),
    {
      name: 'friends-store',
    }
  )
)

// Selectors for optimized re-renders
export const useFriends = () => useFriendsStore(state => state.getFilteredFriends())
export const useFriendRequests = () => useFriendsStore(state => state.requests)
export const useConversations = () => useFriendsStore(state => state.conversations)
export const useOnlineUsers = () => useFriendsStore(state => state.onlineUsers)
export const useFriendsLoading = () => useFriendsStore(state => state.friendsLoading)
export const useFriendsError = () => useFriendsStore(state => state.error)
export const useTotalUnreadCount = () => useFriendsStore(state => state.getTotalUnreadCount())

// Action selectors
export const useFriendsActions = () => useFriendsStore(state => ({
  loadFriends: state.loadFriends,
  sendFriendRequest: state.sendFriendRequest,
  acceptFriendRequest: state.acceptFriendRequest,
  rejectFriendRequest: state.rejectFriendRequest,
  removeFriend: state.removeFriend,
  startConversation: state.startConversation,
  searchUsers: state.searchUsers,
}))

export const useFriendsFilters = () => useFriendsStore(state => ({
  searchQuery: state.searchQuery,
  sortBy: state.sortBy,
  filterOnline: state.filterOnline,
  setSearchQuery: state.setSearchQuery,
  setSortBy: state.setSortBy,
  setFilterOnline: state.setFilterOnline,
}))