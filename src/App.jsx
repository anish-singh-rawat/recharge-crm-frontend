import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'

import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { settingsApi } from '@/api/settings'
import { setAccessToken } from '@/lib/axios'

import Layout from '@/components/layout/Layout'
import { ProtectedRoute, AdminRoute, GuestRoute } from '@/components/auth/ProtectedRoute'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

import Login from '@/pages/auth/Login'
import Register from '@/pages/auth/Register'
import ForgotPassword from '@/pages/auth/ForgotPassword'
import ResetPassword from '@/pages/auth/ResetPassword'
import Dashboard from '@/pages/Dashboard'
import Recharge from '@/pages/Recharge'
import Wallet from '@/pages/Wallet'
import Reports from '@/pages/Reports'
import Notifications from '@/pages/Notifications'
import ApiKeys from '@/pages/ApiKeys'
import Profile from '@/pages/Profile'
import AdminWallet from '@/pages/admin/AdminWallet'
import AdminRecharge from '@/pages/admin/AdminRecharge'
import Users from '@/pages/admin/Users'
import Operators from '@/pages/admin/Operators'
import Settings from '@/pages/admin/Settings'
import Logs from '@/pages/admin/Logs'
import Maintenance from '@/pages/Maintenance'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
})

function AppInitializer({ children }) {
  const { login, logout, setInitialized, isInitialized } = useAuthStore()

  useEffect(() => {
    const handleAuthLogout = () => logout()
    window.addEventListener('auth:logout', handleAuthLogout)
    return () => window.removeEventListener('auth:logout', handleAuthLogout)
  }, [logout])

  useEffect(() => {
    const init = async () => {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) {
        setInitialized(true)
        return
      }
      try {
        const res = await import('@/lib/axios').then(({ default: api }) =>
          api.post('/auth/refresh-token', { refreshToken })
        )
        const { accessToken, refreshToken: newRT, user } = res.data.data || {}
        if (accessToken) {
          setAccessToken(accessToken)
          if (newRT) localStorage.setItem('refreshToken', newRT)
          if (user) login({ user, accessToken, refreshToken: newRT || refreshToken })
          else {
            const profileRes = await authApi.getProfile()
            login({ user: profileRes.data.data, accessToken, refreshToken: newRT || refreshToken })
          }
        } else {
          logout()
        }
      } catch {
        logout()
      }
    }
    init()
  }, [])

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
      </div>
    )
  }

  return children
}

function MaintenanceGate({ children }) {
  const { data: isMaintenanceMode } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.getPublicSettings(),
    select: (r) => {
      const items = r.data.data?.items || r.data.data || []
      if (Array.isArray(items)) {
        const setting = items.find((s) => s.key === 'app.maintenanceMode')
        return setting?.value === true || setting?.value === 'true'
      }
      return false
    },
    refetchInterval: 60000,
    retry: false,
  })

  if (isMaintenanceMode) return <Maintenance />
  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppInitializer>
          <MaintenanceGate>
            <ErrorBoundary>
              <Routes>
                <Route element={<GuestRoute />}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/recharge" element={<Recharge />} />
                    <Route path="/wallet" element={<Wallet />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/api-keys" element={<ApiKeys />} />
                    <Route path="/profile" element={<Profile />} />

                    <Route element={<AdminRoute />}>
                      <Route path="/admin/wallet" element={<AdminWallet />} />
                      <Route path="/admin/recharge" element={<AdminRecharge />} />
                      <Route path="/admin/users" element={<Users />} />
                      <Route path="/admin/operators" element={<Operators />} />
                      <Route path="/admin/settings" element={<Settings />} />
                      <Route path="/admin/logs" element={<Logs />} />
                    </Route>
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ErrorBoundary>
          </MaintenanceGate>
        </AppInitializer>
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '13px',
            maxWidth: '360px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
          success: {
            iconTheme: { primary: '#16A34A', secondary: '#DCFCE7' },
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#FEE2E2' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
