import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User, AuthState, LoadingState } from '../types'
import { API, setAccessToken } from '../lib/api'

interface AuthStore extends AuthState {
  // Loading states
  loginLoading: boolean
  verificationLoading: boolean
  profileLoading: boolean
  
  // Error states
  error: string | null
  verificationError: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setEmailVerified: (verified: boolean) => void
  setTokens: (accessToken: string, refreshToken?: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  
  // Auth actions
  login: () => Promise<void>
  logout: () => Promise<void>
  resendVerification: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
  refreshUserData: () => Promise<void>
  
  // Email verification
  verifyEmail: (token: string) => Promise<boolean>
  checkEmailVerification: () => Promise<boolean>
  
  // Password and security
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  
  // Session management
  validateSession: () => Promise<boolean>
  refreshToken: () => Promise<void>
  
  // Cleanup
  reset: () => void
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isEmailVerified: false,
  accessToken: null,
  refreshToken: null,
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        ...initialState,
        loginLoading: false,
        verificationLoading: false,
        profileLoading: false,
        error: null,
        verificationError: null,

        // Setters
        setUser: (user) => {
          set(
            { user, isEmailVerified: user?.isEmailVerified || false },
            false,
            'auth/setUser'
          )
        },

        setAuthenticated: (authenticated) => {
          set({ isAuthenticated: authenticated }, false, 'auth/setAuthenticated')
        },

        setEmailVerified: (verified) => {
          set({ isEmailVerified: verified }, false, 'auth/setEmailVerified')
          
          // Update user object if it exists
          const { user } = get()
          if (user) {
            set(
              { user: { ...user, isEmailVerified: verified } },
              false,
              'auth/updateUserEmailVerified'
            )
          }
        },

        setTokens: (accessToken, refreshToken) => {
          setAccessToken(accessToken)
          set(
            { 
              accessToken,
              refreshToken: refreshToken || get().refreshToken 
            },
            false,
            'auth/setTokens'
          )
        },

        setLoading: (loading) => {
          set({ isLoading: loading }, false, 'auth/setLoading')
        },

        setError: (error) => {
          set({ error }, false, 'auth/setError')
        },

        // Auth actions
        login: async () => {
          set({ loginLoading: true, error: null }, false, 'auth/loginStart')
          
          try {
            // TODO: Replace with actual Auth0 login when dependencies are fixed
            // For now, create a mock user for development
            const mockUser = {
              id: 'mock-user-id',
              email: 'user@example.com',
              name: 'Test User',
              username: 'testuser',
              isEmailVerified: true,
              isOnline: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            }
            
            const mockTokens = {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            }
            
            get().setUser(mockUser)
            get().setTokens(mockTokens.accessToken, mockTokens.refreshToken)
            get().setAuthenticated(true)
            get().setEmailVerified(true)
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed'
            set({ error: errorMessage }, false, 'auth/loginError')
            throw error
          } finally {
            set({ loginLoading: false }, false, 'auth/loginEnd')
          }
        },

        logout: async () => {
          try {
            // In development, skip API call
            if (!import.meta.env.DEV) {
              await API.post('/auth/logout')
            }
          } catch (error) {
            console.warn('Backend logout failed:', error)
          } finally {
            // Clear local state regardless of backend response
            setAccessToken(null)
            set(
              {
                ...initialState,
                isLoading: false,
              },
              false,
              'auth/logout'
            )
          }
        },

        resendVerification: async () => {
          const { user } = get()
          if (!user?.email) {
            throw new Error('No user email found')
          }

          set({ verificationLoading: true, verificationError: null }, false, 'auth/resendStart')

          try {
            const response = await API.post('/auth/resend-verification', {
              email: user.email,
            })

            if (!response.success) {
              throw new Error(response.error || 'Failed to resend verification email')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to resend verification'
            set({ verificationError: errorMessage }, false, 'auth/resendError')
            throw error
          } finally {
            set({ verificationLoading: false }, false, 'auth/resendEnd')
          }
        },

        updateProfile: async (data) => {
          const { user } = get()
          if (!user) {
            throw new Error('No user found')
          }

          set({ profileLoading: true, error: null }, false, 'auth/updateProfileStart')

          try {
            const response = await API.patch('/auth/profile', data)

            if (response.success && response.data) {
              const updatedUser = { ...user, ...response.data }
              get().setUser(updatedUser)
            } else {
              throw new Error(response.error || 'Failed to update profile')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile'
            set({ error: errorMessage }, false, 'auth/updateProfileError')
            throw error
          } finally {
            set({ profileLoading: false }, false, 'auth/updateProfileEnd')
          }
        },

        refreshUserData: async () => {
          // In development, skip API call since we use mock data
          if (import.meta.env.DEV) {
            return
          }
          
          try {
            const response = await API.get('/auth/me')
            
            if (response.success && response.data) {
              get().setUser(response.data)
            }
          } catch (error) {
            console.warn('Failed to refresh user data:', error)
            // Don't throw error as this is a background operation
          }
        },

        verifyEmail: async (token) => {
          set({ verificationLoading: true, verificationError: null }, false, 'auth/verifyStart')

          try {
            const response = await API.post('/auth/verify-email', { token })

            if (response.success) {
              get().setEmailVerified(true)
              // Refresh user data to get updated info
              await get().refreshUserData()
              return true
            } else {
              throw new Error(response.error || 'Email verification failed')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Email verification failed'
            set({ verificationError: errorMessage }, false, 'auth/verifyError')
            return false
          } finally {
            set({ verificationLoading: false }, false, 'auth/verifyEnd')
          }
        },

        checkEmailVerification: async () => {
          try {
            const response = await API.get('/auth/verification-status')
            
            if (response.success && response.data) {
              const isVerified = response.data.isVerified
              get().setEmailVerified(isVerified)
              return isVerified
            }
            
            return false
          } catch (error) {
            console.warn('Failed to check email verification:', error)
            return false
          }
        },

        changePassword: async (oldPassword, newPassword) => {
          set({ profileLoading: true, error: null }, false, 'auth/changePasswordStart')

          try {
            const response = await API.post('/auth/change-password', {
              oldPassword,
              newPassword,
            })

            if (!response.success) {
              throw new Error(response.error || 'Failed to change password')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to change password'
            set({ error: errorMessage }, false, 'auth/changePasswordError')
            throw error
          } finally {
            set({ profileLoading: false }, false, 'auth/changePasswordEnd')
          }
        },

        resetPassword: async (email) => {
          set({ verificationLoading: true, verificationError: null }, false, 'auth/resetPasswordStart')

          try {
            const response = await API.post('/auth/reset-password', { email })

            if (!response.success) {
              throw new Error(response.error || 'Failed to send reset email')
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email'
            set({ verificationError: errorMessage }, false, 'auth/resetPasswordError')
            throw error
          } finally {
            set({ verificationLoading: false }, false, 'auth/resetPasswordEnd')
          }
        },

        validateSession: async () => {
          // In development, always return true if we have any token
          if (import.meta.env.DEV) {
            const { accessToken } = get()
            return !!accessToken
          }
          
          const { accessToken } = get()
          
          if (!accessToken) {
            return false
          }

          try {
            const response = await API.get('/auth/validate')
            
            if (response.success) {
              // Session is valid, optionally refresh user data
              await get().refreshUserData()
              return true
            } else {
              // Session invalid, clear auth state
              get().logout()
              return false
            }
          } catch (error) {
            console.warn('Session validation failed:', error)
            get().logout()
            return false
          }
        },

        refreshToken: async () => {
          const { refreshToken } = get()
          
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          try {
            const response = await API.post('/auth/refresh', {
              refreshToken,
            })

            if (response.success && response.data) {
              const { accessToken, refreshToken: newRefreshToken } = response.data
              get().setTokens(accessToken, newRefreshToken)
            } else {
              throw new Error(response.error || 'Token refresh failed')
            }
          } catch (error) {
            // Refresh failed, logout user
            get().logout()
            throw error
          }
        },

        reset: () => {
          setAccessToken(null)
          set(
            {
              ...initialState,
              isLoading: false,
              loginLoading: false,
              verificationLoading: false,
              profileLoading: false,
              error: null,
              verificationError: null,
            },
            false,
            'auth/reset'
          )
        },
      }),
      {
        name: 'auth-store',
        // Only persist essential auth data
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          isEmailVerified: state.isEmailVerified,
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
        }),
        // Custom storage for sensitive data
        storage: {
          getItem: (name) => {
            const value = localStorage.getItem(name)
            if (value) {
              try {
                const parsed = JSON.parse(value)
                // Validate stored data structure
                if (parsed && typeof parsed === 'object') {
                  return parsed
                }
              } catch (error) {
                console.warn('Failed to parse stored auth data:', error)
                localStorage.removeItem(name)
              }
            }
            return null
          },
          setItem: (name, value) => {
            try {
              localStorage.setItem(name, JSON.stringify(value))
            } catch (error) {
              console.warn('Failed to store auth data:', error)
            }
          },
          removeItem: (name) => {
            localStorage.removeItem(name)
          },
        },
      }
    ),
    {
      name: 'auth-store',
    }
  )
)

// Selectors for optimized re-renders
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated)
export const useIsEmailVerified = () => useAuthStore((state) => state.isEmailVerified)
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useAuthError = () => useAuthStore((state) => state.error)

// Helper hooks for specific auth states
export const useAuthActions = () => useAuthStore((state) => ({
  login: state.login,
  logout: state.logout,
  resendVerification: state.resendVerification,
  updateProfile: state.updateProfile,
  verifyEmail: state.verifyEmail,
  checkEmailVerification: state.checkEmailVerification,
  changePassword: state.changePassword,
  resetPassword: state.resetPassword,
}))

export const useAuthStatus = () => useAuthStore((state) => ({
  isAuthenticated: state.isAuthenticated,
  isEmailVerified: state.isEmailVerified,
  isLoading: state.isLoading,
  loginLoading: state.loginLoading,
  verificationLoading: state.verificationLoading,
  profileLoading: state.profileLoading,
  error: state.error,
  verificationError: state.verificationError,
}))

// Initialize auth store on app start
export const initializeAuth = async () => {
  const { validateSession, setLoading, setAuthenticated, setUser, setEmailVerified, setTokens } = useAuthStore.getState()
  
  setLoading(true)
  
  try {
    // For development mode, bypass auth and create mock user
    if (import.meta.env.DEV) {
      const mockUser = {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
        username: 'testuser',
        isEmailVerified: true,
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      
      setUser(mockUser)
      setAuthenticated(true)
      setEmailVerified(true)
      setTokens('mock-dev-token', 'mock-dev-refresh-token')
      console.log('🧪 Dev mode: Using mock authenticated user')
    } else {
      await validateSession()
    }
  } catch (error) {
    console.warn('Auth initialization failed:', error)
  } finally {
    setLoading(false)
  }
}