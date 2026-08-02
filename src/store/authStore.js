import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '@/lib/axios'

const USER_KEY = 'crm_user'

const loadPersistedUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const persistUser = (user) => {
  try {
    if (user && user.role) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
    } else if (!user) {
      localStorage.removeItem(USER_KEY)
    }
  } catch {}
}

const persistedUser = loadPersistedUser()
const hasRefreshToken = !!localStorage.getItem('refreshToken')

if (persistedUser && !persistedUser.role) {
  try { localStorage.removeItem(USER_KEY) } catch {}
}

const validPersistedUser = persistedUser?.role ? persistedUser : null
const hasPersistedSession = !!(validPersistedUser && hasRefreshToken)

const useAuthStore = create((set, get) => ({
  user: validPersistedUser,
  isAuthenticated: hasPersistedSession,
  isInitialized: false,

  setUser: (user) => {
    persistUser(user)
    set({ user })
  },

  login: (data) => {
    const accessToken = data.accessToken
    const refreshToken = data.refreshToken
    let user = data.user || data.profile || null

    if (!user && data.data) {
      user = data.data.user || data.data.profile || data.data
    }

    if (accessToken) setAccessToken(accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    if (user) persistUser(user)

    set({ user, isAuthenticated: true, isInitialized: true })
  },

  logout: () => {
    clearAccessToken()
    localStorage.removeItem('refreshToken')
    persistUser(null)
    set({ user: null, isAuthenticated: false, isInitialized: true })
  },

  setInitialized: (value) => set({ isInitialized: value }),

  setTokenReady: () => set({ isInitialized: true }),

  updateUser: (updates) =>
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null
      persistUser(updated)
      return { user: updated }
    }),

  isRole: (role) => get().user?.role === role,

  isAdmin: () => {
    const role = get().user?.role
    return role === 'admin' || role === 'super_admin'
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',

  isRetailer: () => get().user?.role === 'retailer',
}))

export default useAuthStore
