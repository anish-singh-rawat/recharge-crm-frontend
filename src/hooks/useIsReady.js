import useAuthStore from '@/store/authStore'

export const useIsReady = () => {
  return useAuthStore((s) => s.isInitialized)
}
