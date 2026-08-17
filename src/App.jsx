import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import axios from 'axios'

import useAuthStore from '@/store/authStore'
import { authApi } from '@/api/auth'
import { settingsApi } from '@/api/settings'
import { healthApi } from '@/api/health'
import { setAccessToken } from '@/lib/axios'

import Layout from '@/components/layout/Layout'
import { ProtectedRoute, AdminRoute, GuestRoute, ApiAccessRoute } from '@/components/auth/ProtectedRoute'
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
import ApiDocs from '@/pages/ApiDocs'
import Profile from '@/pages/Profile'
import AdminWallet from '@/pages/admin/AdminWallet'
import AdminRecharge from '@/pages/admin/AdminRecharge'
import Users from '@/pages/admin/Users'
import Operators from '@/pages/admin/Operators'
import OperatorPlans from '@/pages/admin/OperatorPlans'
import OperatorsPlans from '@/pages/retailer/OperatorsPlans'
import Settings from '@/pages/admin/Settings'
import Logs from '@/pages/admin/Logs'
import Provider from '@/pages/admin/Provider'
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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'

function AppInitializer({ children }) {
  const { login, logout, isAuthenticated, isInitialized, setTokenReady } = useAuthStore()
  const [maintenance, setMaintenance] = useState(false)

  useEffect(() => {
    const handleAuthLogout = () => logout()
    const handleMaintenance = () => setMaintenance(true)
    window.addEventListener('auth:logout', handleAuthLogout)
    window.addEventListener('app:maintenance', handleMaintenance)
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout)
      window.removeEventListener('app:maintenance', handleMaintenance)
    }
  }, [logout])

  useEffect(() => {
    const init = async () => {
      try {
        const healthRes = await healthApi.health()
        if (healthRes.data?.data?.status === 'DOWN' || healthRes.data?.data?.database?.status === 'DISCONNECTED') {
          setMaintenance(true)
          return
        }
      } catch (healthErr) {
        if (healthErr?.response?.status === 503) {
          setMaintenance(true)
          return
        }
      }

      const refreshToken = localStorage.getItem('refreshToken')

      if (!refreshToken) {
        logout()
        return
      }

      try {
        const res = await axios.post(
          `${BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { withCredentials: true }
        )

        const data = res.data?.data || res.data || {}
        const accessToken = data.accessToken
        const newRT = data.refreshToken

        if (!accessToken) {
          logout()
          return
        }

        setAccessToken(accessToken)
        if (newRT) localStorage.setItem('refreshToken', newRT)

        setTokenReady()

        const profileRes = await authApi.getProfile()
        const freshUser =
          profileRes.data?.data?.user ||
          profileRes.data?.data ||
          profileRes.data?.user ||
          profileRes.data

        login({
          user: {
            ...freshUser,
            apiAccessEnabled: freshUser?.apiAccessEnabled ?? false,
          },
          accessToken,
          refreshToken: newRT || refreshToken,
        })
      } catch {
        logout()
      }
    }

    init()
  }, [])

  if (!isAuthenticated && !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <span className="w-10 h-10 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin" />
          <p className="text-sm text-[#94A3B8]">Loading...</p>
        </div>
      </div>
    )
  }

  if (maintenance) return <Maintenance />

  return children
}

function MaintenanceGate({ children }) {
  const { data: isMaintenanceMode } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => settingsApi.getPublicSettings(),
    select: (r) => {
      const d = r.data.data
      const settings = d?.settings || d || {}
      if (typeof settings === 'object' && !Array.isArray(settings)) {
        return settings['app.maintenanceMode'] === true || settings['app.maintenanceMode'] === 'true'
      }
      if (Array.isArray(settings)) {
        const s = settings.find((x) => x.key === 'app.maintenanceMode')
        return s?.value === true || s?.value === 'true'
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
                    <Route element={<ApiAccessRoute />}>
                      <Route path="/api-keys" element={<ApiKeys />} />
                      <Route path="/api-docs" element={<ApiDocs />} />
                    </Route>
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/operators" element={<OperatorsPlans />} />

                    <Route element={<AdminRoute />}>
                      <Route path="/admin/wallet" element={<AdminWallet />} />
                      <Route path="/admin/recharge" element={<AdminRecharge />} />
                      <Route path="/admin/users" element={<Users />} />
                      <Route path="/admin/operators" element={<Operators />} />
                      <Route path="/admin/operators/:id/plans" element={<OperatorPlans />} />
                      <Route path="/admin/settings" element={<Settings />} />
                      <Route path="/admin/logs" element={<Logs />} />
                      <Route path="/admin/provider" element={<Provider />} />
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
