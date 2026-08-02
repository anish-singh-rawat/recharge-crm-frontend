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
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {}
}

const persistedUser = loadPersistedUser()
const hasRefreshToken = !!localStorage.getItem('refreshToken')

const useAuthStore = create((set, get) => ({
  user: persistedUser,
  isAuthenticated: !!(persistedUser && hasRefreshToken),
  isInitialized: false,

  setUser: (user) => {
    persistUser(user)
    set({ user })
  },

  login: (data) => {
    const { user, accessToken, refreshToken } = data
    setAccessToken(accessToken)
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken)
    persistUser(user)
    set({ user, isAuthenticated: true, isInitialized: true })
  },

  logout: () => {
    clearAccessToken()
    localStorage.removeItem('refreshToken')
    persistUser(null)
    set({ user: null, isAuthenticated: false, isInitialized: true })
  },

  setInitialized: (value) => set({ isInitialized: value }),

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
