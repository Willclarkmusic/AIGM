import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Server, ServerMember, Room, User, LoadingState } from '../types'
import { API } from '../lib/api'

interface ServerStore {
  // State
  servers: Server[]
  currentServer: Server | null
  members: Map<string, ServerMember[]> // serverId -> members
  
  // Server limits
  readonly MAX_SERVERS: number
  canCreateServer: boolean
  
  // Loading states
  serversLoading: boolean
  membersLoading: boolean
  joinLoading: boolean
  createLoading: boolean
  
  // Error states
  error: string | null
  joinError: string | null
  createError: string | null
  
  // Actions - State setters
  setServers: (servers: Server[]) => void
  setCurrentServer: (server: Server | null) => void
  setMembers: (serverId: string, members: ServerMember[]) => void
  setLoading: (type: 'servers' | 'members' | 'join' | 'create', loading: boolean) => void
  setError: (error: string | null) => void
  setJoinError: (error: string | null) => void
  setCreateError: (error: string | null) => void
  updateCanCreateServer: () => void
  
  // Server actions
  loadServers: () => Promise<void>
  createServer: (name: string, description?: string, isPublic?: boolean) => Promise<Server>
  joinServer: (accessCode: string) => Promise<Server>
  leaveServer: (serverId: string) => Promise<void>
  updateServer: (serverId: string, data: Partial<Server>) => Promise<void>
  deleteServer: (serverId: string) => Promise<void>
  
  // Server management
  generateNewAccessCode: (serverId: string) => Promise<string>
  updateServerSettings: (serverId: string, settings: {
    name?: string
    description?: string
    isPublic?: boolean
    maxMembers?: number
  }) => Promise<void>
  
  // Member management
  loadServerMembers: (serverId: string) => Promise<void>
  kickMember: (serverId: string, memberId: string) => Promise<void>
  banMember: (serverId: string, memberId: string, reason?: string) => Promise<void>
  updateMemberRole: (serverId: string, memberId: string, role: 'admin' | 'moderator' | 'member') => Promise<void>
  
  // Invites and discovery
  getServerInvite: (serverId: string) => Promise<string>
  getPublicServers: () => Promise<Server[]>
  searchServers: (query: string) => Promise<Server[]>
  
  // Utilities
  getServerById: (serverId: string) => Server | null
  getServerMembers: (serverId: string) => ServerMember[]
  getMemberById: (serverId: string, memberId: string) => ServerMember | null
  isServerOwner: (serverId: string, userId?: string) => boolean
  isServerAdmin: (serverId: string, userId?: string) => boolean
  canManageServer: (serverId: string, userId?: string) => boolean
  getServerMemberCount: (serverId: string) => number
  
  // Navigation helpers
  selectServer: (serverId: string) => Promise<void>
  
  // Cleanup
  reset: () => void
}

const MAX_SERVERS = 3

const initialState = {
  servers: [],
  currentServer: null,
  members: new Map<string, ServerMember[]>(),
  MAX_SERVERS,
  canCreateServer: true,
  serversLoading: false,
  membersLoading: false,
  joinLoading: false,
  createLoading: false,
  error: null,
  joinError: null,
  createError: null,
}

export const useServerStore = create<ServerStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // State setters
      setServers: (servers) => {
        set({ servers }, false, 'servers/setServers')
        get().updateCanCreateServer()
      },

      setCurrentServer: (server) => {
        set({ currentServer: server }, false, 'servers/setCurrentServer')
      },

      setMembers: (serverId, members) => {
        const membersMap = new Map(get().members)
        membersMap.set(serverId, members)
        set({ members: membersMap }, false, 'servers/setMembers')
      },

      setLoading: (type, loading) => {
        set(
          { [`${type}Loading`]: loading },
          false,
          `servers/setLoading/${type}`
        )
      },

      setError: (error) => {
        set({ error }, false, 'servers/setError')
      },

      setJoinError: (error) => {
        set({ joinError: error }, false, 'servers/setJoinError')
      },

      setCreateError: (error) => {
        set({ createError: error }, false, 'servers/setCreateError')
      },

      updateCanCreateServer: () => {
        const canCreateServer = get().servers.length < MAX_SERVERS
        set({ canCreateServer }, false, 'servers/updateCanCreateServer')
      },

      // Server actions
      loadServers: async () => {
        get().setLoading('servers', true)
        get().setError(null)

        try {
          const response = await API.get<Server[]>('/servers')

          if (response.success && response.data) {
            get().setServers(response.data)
          } else {
            throw new Error(response.error || 'Failed to load servers')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load servers'
          get().setError(errorMessage)
        } finally {
          get().setLoading('servers', false)
        }
      },

      createServer: async (name, description, isPublic = false) => {
        if (!get().canCreateServer) {
          throw new Error(`You can only be in ${MAX_SERVERS} servers at a time`)
        }

        get().setLoading('create', true)
        get().setCreateError(null)

        try {
          const response = await API.post<Server>('/servers', {
            name: name.trim(),
            description: description?.trim(),
            isPublic,
          })

          if (response.success && response.data) {
            // Add to servers list
            const servers = [...get().servers, response.data]
            get().setServers(servers)
            
            // Set as current server
            get().setCurrentServer(response.data)
            
            return response.data
          } else {
            throw new Error(response.error || 'Failed to create server')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create server'
          get().setCreateError(errorMessage)
          throw error
        } finally {
          get().setLoading('create', false)
        }
      },

      joinServer: async (accessCode) => {
        if (!get().canCreateServer) {
          throw new Error(`You can only be in ${MAX_SERVERS} servers at a time`)
        }

        get().setLoading('join', true)
        get().setJoinError(null)

        try {
          const response = await API.post<Server>('/servers/join', {
            accessCode: accessCode.trim().toUpperCase(),
          })

          if (response.success && response.data) {
            // Check if already in server
            const existingServer = get().servers.find(s => s.id === response.data!.id)
            if (existingServer) {
              get().setCurrentServer(existingServer)
              return existingServer
            }

            // Add to servers list
            const servers = [...get().servers, response.data]
            get().setServers(servers)
            
            // Set as current server
            get().setCurrentServer(response.data)
            
            return response.data
          } else {
            throw new Error(response.error || 'Failed to join server')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to join server'
          get().setJoinError(errorMessage)
          throw error
        } finally {
          get().setLoading('join', false)
        }
      },

      leaveServer: async (serverId) => {
        try {
          const response = await API.post(`/servers/${serverId}/leave`)

          if (response.success) {
            // Remove from servers list
            const servers = get().servers.filter(server => server.id !== serverId)
            get().setServers(servers)
            
            // Clear current server if it was the one we left
            if (get().currentServer?.id === serverId) {
              get().setCurrentServer(null)
            }
            
            // Remove members data
            const members = new Map(get().members)
            members.delete(serverId)
            set({ members })
          } else {
            throw new Error(response.error || 'Failed to leave server')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to leave server'
          get().setError(errorMessage)
          throw error
        }
      },

      updateServer: async (serverId, data) => {
        try {
          const response = await API.patch<Server>(`/servers/${serverId}`, data)

          if (response.success && response.data) {
            // Update in servers list
            const servers = get().servers.map(server =>
              server.id === serverId ? response.data! : server
            )
            get().setServers(servers)
            
            // Update current server if it's the one we updated
            if (get().currentServer?.id === serverId) {
              get().setCurrentServer(response.data)
            }
          } else {
            throw new Error(response.error || 'Failed to update server')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update server'
          get().setError(errorMessage)
          throw error
        }
      },

      deleteServer: async (serverId) => {
        try {
          const response = await API.delete(`/servers/${serverId}`)

          if (response.success) {
            // Remove from servers list
            const servers = get().servers.filter(server => server.id !== serverId)
            get().setServers(servers)
            
            // Clear current server if it was the one we deleted
            if (get().currentServer?.id === serverId) {
              get().setCurrentServer(null)
            }
            
            // Remove members data
            const members = new Map(get().members)
            members.delete(serverId)
            set({ members })
          } else {
            throw new Error(response.error || 'Failed to delete server')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete server'
          get().setError(errorMessage)
          throw error
        }
      },

      // Server management
      generateNewAccessCode: async (serverId) => {
        try {
          const response = await API.post<{ accessCode: string }>(`/servers/${serverId}/access-code`)

          if (response.success && response.data) {
            // Update server in list
            const servers = get().servers.map(server =>
              server.id === serverId
                ? { ...server, accessCode: response.data!.accessCode }
                : server
            )
            get().setServers(servers)
            
            // Update current server if it's the one we updated
            if (get().currentServer?.id === serverId) {
              get().setCurrentServer({
                ...get().currentServer!,
                accessCode: response.data.accessCode,
              })
            }
            
            return response.data.accessCode
          } else {
            throw new Error(response.error || 'Failed to generate new access code')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate new access code'
          get().setError(errorMessage)
          throw error
        }
      },

      updateServerSettings: async (serverId, settings) => {
        await get().updateServer(serverId, settings)
      },

      // Member management
      loadServerMembers: async (serverId) => {
        get().setLoading('members', true)
        get().setError(null)

        try {
          const response = await API.get<ServerMember[]>(`/servers/${serverId}/members`)

          if (response.success && response.data) {
            get().setMembers(serverId, response.data)
          } else {
            throw new Error(response.error || 'Failed to load server members')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load server members'
          get().setError(errorMessage)
        } finally {
          get().setLoading('members', false)
        }
      },

      kickMember: async (serverId, memberId) => {
        try {
          const response = await API.post(`/servers/${serverId}/members/${memberId}/kick`)

          if (response.success) {
            // Remove member from list
            const currentMembers = get().members.get(serverId) || []
            const updatedMembers = currentMembers.filter(member => member.id !== memberId)
            get().setMembers(serverId, updatedMembers)
          } else {
            throw new Error(response.error || 'Failed to kick member')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to kick member'
          get().setError(errorMessage)
          throw error
        }
      },

      banMember: async (serverId, memberId, reason) => {
        try {
          const response = await API.post(`/servers/${serverId}/members/${memberId}/ban`, {
            reason,
          })

          if (response.success) {
            // Remove member from list
            const currentMembers = get().members.get(serverId) || []
            const updatedMembers = currentMembers.filter(member => member.id !== memberId)
            get().setMembers(serverId, updatedMembers)
          } else {
            throw new Error(response.error || 'Failed to ban member')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to ban member'
          get().setError(errorMessage)
          throw error
        }
      },

      updateMemberRole: async (serverId, memberId, role) => {
        try {
          const response = await API.patch<ServerMember>(`/servers/${serverId}/members/${memberId}`, {
            role,
          })

          if (response.success && response.data) {
            // Update member in list
            const currentMembers = get().members.get(serverId) || []
            const updatedMembers = currentMembers.map(member =>
              member.id === memberId ? response.data! : member
            )
            get().setMembers(serverId, updatedMembers)
          } else {
            throw new Error(response.error || 'Failed to update member role')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update member role'
          get().setError(errorMessage)
          throw error
        }
      },

      // Invites and discovery
      getServerInvite: async (serverId) => {
        try {
          const response = await API.get<{ inviteUrl: string }>(`/servers/${serverId}/invite`)

          if (response.success && response.data) {
            return response.data.inviteUrl
          } else {
            throw new Error(response.error || 'Failed to get invite link')
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to get invite link'
          get().setError(errorMessage)
          throw error
        }
      },

      getPublicServers: async () => {
        try {
          const response = await API.get<Server[]>('/servers/public')

          if (response.success && response.data) {
            return response.data
          } else {
            return []
          }
        } catch (error) {
          console.warn('Failed to get public servers:', error)
          return []
        }
      },

      searchServers: async (query) => {
        try {
          const response = await API.get<Server[]>('/servers/search', {
            params: { q: query, limit: 10 },
          })

          if (response.success && response.data) {
            return response.data
          } else {
            return []
          }
        } catch (error) {
          console.warn('Server search failed:', error)
          return []
        }
      },

      // Utilities
      getServerById: (serverId) => {
        return get().servers.find(server => server.id === serverId) || null
      },

      getServerMembers: (serverId) => {
        return get().members.get(serverId) || []
      },

      getMemberById: (serverId, memberId) => {
        const members = get().members.get(serverId) || []
        return members.find(member => member.id === memberId) || null
      },

      isServerOwner: (serverId, userId) => {
        const server = get().getServerById(serverId)
        return server?.ownerId === userId
      },

      isServerAdmin: (serverId, userId) => {
        const members = get().members.get(serverId) || []
        const member = members.find(m => m.userId === userId)
        return member?.role === 'owner' || member?.role === 'admin'
      },

      canManageServer: (serverId, userId) => {
        const members = get().members.get(serverId) || []
        const member = members.find(m => m.userId === userId)
        return ['owner', 'admin', 'moderator'].includes(member?.role || '')
      },

      getServerMemberCount: (serverId) => {
        const members = get().members.get(serverId) || []
        return members.length
      },

      // Navigation helpers
      selectServer: async (serverId) => {
        const server = get().getServerById(serverId)
        if (server) {
          get().setCurrentServer(server)
          
          // Load members if not already loaded
          if (!get().members.has(serverId)) {
            await get().loadServerMembers(serverId)
          }
        }
      },

      reset: () => {
        set(initialState, false, 'servers/reset')
      },
    }),
    {
      name: 'server-store',
    }
  )
)

// Selectors for optimized re-renders
export const useServers = () => useServerStore(state => state.servers)
export const useCurrentServer = () => useServerStore(state => state.currentServer)
export const useCanCreateServer = () => useServerStore(state => state.canCreateServer)
export const useServersLoading = () => useServerStore(state => state.serversLoading)
export const useServersError = () => useServerStore(state => state.error)
export const useMaxServers = () => useServerStore(state => state.MAX_SERVERS)

// Action selectors
export const useServerActions = () => useServerStore(state => ({
  loadServers: state.loadServers,
  createServer: state.createServer,
  joinServer: state.joinServer,
  leaveServer: state.leaveServer,
  selectServer: state.selectServer,
  updateServer: state.updateServer,
  deleteServer: state.deleteServer,
}))

export const useServerManagement = () => useServerStore(state => ({
  generateNewAccessCode: state.generateNewAccessCode,
  kickMember: state.kickMember,
  banMember: state.banMember,
  updateMemberRole: state.updateMemberRole,
  getServerInvite: state.getServerInvite,
}))

// Helper hooks
export const useServerMembers = (serverId: string | undefined) => {
  return useServerStore(state => 
    serverId ? state.getServerMembers(serverId) : []
  )
}

export const useIsServerOwner = (serverId: string | undefined, userId: string | undefined) => {
  return useServerStore(state => 
    serverId && userId ? state.isServerOwner(serverId, userId) : false
  )
}

export const useCanManageServer = (serverId: string | undefined, userId: string | undefined) => {
  return useServerStore(state => 
    serverId && userId ? state.canManageServer(serverId, userId) : false
  )
}