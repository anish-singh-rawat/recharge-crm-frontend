import useAuthStore from '@/store/authStore'

export const useIsReady = () => {
  const isInitialized = useAuthStore((s) => s.isInitialized)
  return isInitialized
}
