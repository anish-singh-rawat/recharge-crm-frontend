import { create } from 'zustand'
import { setAccessToken, clearAccessToken } from '@/lib/axios'

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setUser: (user) => set({ user }),

  login: (data) => {
    const { user, accessToken, refreshToken } = data
    setAccessToken(accessToken)
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken)
    }
    set({ user, isAuthenticated: true, isInitialized: true })
  },

  logout: () => {
    clearAccessToken()
    localStorage.removeItem('refreshToken')
    set({ user: null, isAuthenticated: false, isInitialized: true })
  },

  setInitialized: (value) => set({ isInitialized: value }),

  updateUser: (updates) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    })),

  isRole: (role) => get().user?.role === role,

  isAdmin: () => {
    const role = get().user?.role
    return role === 'admin' || role === 'super_admin'
  },

  isSuperAdmin: () => get().user?.role === 'super_admin',

  isRetailer: () => get().user?.role === 'retailer',
}))

export default useAuthStore
