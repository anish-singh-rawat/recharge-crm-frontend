import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { PageLoader } from '@/components/ui/LoadingSpinner'

export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAuthStore()

  if (!isAuthenticated && !isInitialized) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return <Outlet />
}

export function AdminRoute() {
  const { isAuthenticated, isInitialized, isAdmin } = useAuthStore()

  if (!isAuthenticated && !isInitialized) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export function GuestRoute() {
  const { isAuthenticated, isInitialized } = useAuthStore()

  if (!isInitialized && !isAuthenticated) return null

  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export function ApiAccessRoute() {
  const { isAuthenticated, isInitialized, hasApiAccess } = useAuthStore()

  if (!isAuthenticated && !isInitialized) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!hasApiAccess()) return <Navigate to="/dashboard" replace />

  return <Outlet />
}
