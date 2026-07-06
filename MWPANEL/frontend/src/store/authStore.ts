import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, LoginRequest, LoginResponse } from '@/types/user'
import { authService } from '@services/authService'
import { showSessionExpiredModal } from '@/components/common/SessionExpiredModal'
import { resetLoggingOutFlag } from '@services/apiClient'

// Datos guardados del admin cuando está impersonando otro usuario
interface SavedAdminSession {
  user: User
  accessToken: string
  refreshToken: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  // Impersonation state - sesión de admin guardada
  savedAdminSession: SavedAdminSession | null
  isImpersonating: boolean
  // Auto-logout state
  autoLogoutEnabled: boolean
  autoLogoutTimeout: number // en milisegundos (30 min = 1800000ms)
  lastActivity: number
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<void>
  logout: (reason?: 'manual' | 'inactivity' | 'expired') => void
  refreshAuth: () => Promise<void>
  setUser: (user: User) => void
  checkAuth: () => Promise<void>
  impersonateUser: (userId: string) => Promise<void>
  // Impersonation actions
  returnToAdmin: () => void
  clearImpersonation: () => void
  // Auto-logout actions
  updateActivity: () => void
  setAutoLogoutEnabled: (enabled: boolean) => void
  setAutoLogoutTimeout: (timeout: number) => void
  autoLogout: () => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      isAuthenticated: false,
      // Impersonation initial state
      savedAdminSession: null,
      isImpersonating: false,
      // Auto-logout initial state
      autoLogoutEnabled: true, // Habilitado por defecto
      autoLogoutTimeout: 30 * 60 * 1000, // 30 minutos en milisegundos
      lastActivity: Date.now(),

      // Actions
      login: async (credentials: LoginRequest) => {
        try {
          set({ isLoading: true })

          // Resetear el flag de logout ANTES de intentar login
          // Esto permite que el request de login se envíe
          resetLoggingOutFlag()

          const response: LoginResponse = await authService.login(credentials)

          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            isLoading: false,
            lastActivity: Date.now(), // Actualizar actividad en login
          })

        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: (reason: 'manual' | 'inactivity' | 'expired' = 'manual') => {
        const { refreshToken } = get()

        // Clear auth data AND impersonation data
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          lastActivity: Date.now(),
          // También limpiar la sesión de admin guardada
          savedAdminSession: null,
          isImpersonating: false,
        })

        // Call logout API to invalidate tokens
        authService.logout(refreshToken || undefined).catch((error) => {
          // Don't log 401 errors during logout (token expired is expected)
          if (error?.response?.status !== 401) {
            console.error('Logout error:', error)
          }
        })

        // Mostrar modal elegante de sesión cerrada
        // Solo mostrar para logout manual e inactividad (expired lo maneja apiClient)
        if (reason === 'manual') {
          showSessionExpiredModal('/', 4, 'manual')
        } else if (reason === 'inactivity') {
          showSessionExpiredModal('/', 4, 'inactivity')
        }
      },

      refreshAuth: async () => {
        try {
          const { refreshToken } = get()
          
          if (!refreshToken) {
            throw new Error('No refresh token available')
          }

          const response = await authService.refreshToken(refreshToken)
          
          set({
            accessToken: response.accessToken,
          })
        } catch (error) {
          // If refresh fails, logout user
          get().logout()
          throw error
        }
      },

      setUser: (user: User) => {
        set({ user })
      },

      checkAuth: async () => {
        try {
          const { accessToken, refreshToken, user } = get()

          if (!accessToken || !refreshToken || !user) {
            set({ isLoading: false, isAuthenticated: false })
            return
          }

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch {
          set({ isLoading: false, isAuthenticated: false })
        }
      },

      impersonateUser: async (userId: string) => {
        try {
          const { user, accessToken, refreshToken } = get()

          // Guardar la sesión actual del admin antes de impersonar
          // Solo si el usuario actual es admin y no está ya impersonando
          const isAdmin = user?.role === 'admin'

          const response = await authService.impersonateUser(userId)

          // Update store state with new user data
          set({
            user: response.user,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            isAuthenticated: true,
            // Guardar sesión del admin solo si era admin
            savedAdminSession: isAdmin && user && accessToken && refreshToken ? {
              user,
              accessToken,
              refreshToken,
            } : get().savedAdminSession,
            isImpersonating: isAdmin ? true : get().isImpersonating,
          })

        } catch (error) {
          throw error
        }
      },

      // Volver a la sesión del admin
      returnToAdmin: () => {
        const { savedAdminSession } = get()

        if (!savedAdminSession) {
          return
        }

        // Restaurar la sesión del admin
        set({
          user: savedAdminSession.user,
          accessToken: savedAdminSession.accessToken,
          refreshToken: savedAdminSession.refreshToken,
          isAuthenticated: true,
          // Limpiar el estado de impersonación
          savedAdminSession: null,
          isImpersonating: false,
          lastActivity: Date.now(),
        })
      },

      // Limpiar impersonación sin restaurar (por si se necesita)
      clearImpersonation: () => {
        set({
          savedAdminSession: null,
          isImpersonating: false,
        })
      },

      // Auto-logout functions
      updateActivity: () => {
        const state = get()
        if (state.isAuthenticated && state.autoLogoutEnabled) {
          set({ lastActivity: Date.now() })
        }
      },

      setAutoLogoutEnabled: (enabled: boolean) => {
        set({ autoLogoutEnabled: enabled })
      },

      setAutoLogoutTimeout: (timeout: number) => {
        set({ autoLogoutTimeout: timeout })
      },

      autoLogout: () => {
        const state = get()
        if (state.isAuthenticated) {
          state.logout('inactivity')
        }
      },
    }),
    {
      name: 'mw-panel-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        // Impersonation state - persistir para no perder la sesión del admin al refrescar
        savedAdminSession: state.savedAdminSession,
        isImpersonating: state.isImpersonating,
        autoLogoutEnabled: state.autoLogoutEnabled,
        autoLogoutTimeout: state.autoLogoutTimeout,
        lastActivity: state.lastActivity,
      }),
    }
  )
)

