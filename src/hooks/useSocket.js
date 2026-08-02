import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken } from '@/lib/axios'
import useAuthStore from '@/store/authStore'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080'

let socketInstance = null

export const getSocket = () => socketInstance

export const useSocket = (handlers = {}) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!isAuthenticated) return

    const token = getAccessToken()
    if (!token) return

    if (!socketInstance) {
      socketInstance = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })

      socketInstance.on('connect_error', async (err) => {
        if (err.message === 'Invalid token' || err.message === 'Authentication required') {
          try {
            const refreshToken = localStorage.getItem('refreshToken')
            if (!refreshToken) return
            const { default: axios } = await import('axios')
            const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1'
            const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken })
            const newToken = res.data?.data?.accessToken
            if (newToken && socketInstance) {
              const { setAccessToken } = await import('@/lib/axios')
              setAccessToken(newToken)
              socketInstance.auth.token = newToken
              socketInstance.connect()
            }
          } catch {
            window.dispatchEvent(new Event('auth:logout'))
          }
        }
      })
    }

    const socket = socketInstance

    const eventNames = [
      'recharge:update',
      'recharge:update:all',
      'recharge:success',
      'recharge:failed',
      'wallet:update',
      'wallet:frozen',
      'wallet:unfrozen',
      'notification:new',
      'notification:broadcast',
    ]

    const wrappedHandlers = {}
    eventNames.forEach((event) => {
      wrappedHandlers[event] = (payload) => {
        if (handlersRef.current[event]) {
          handlersRef.current[event](payload)
        }
      }
      socket.on(event, wrappedHandlers[event])
    })

    return () => {
      eventNames.forEach((event) => {
        socket.off(event, wrappedHandlers[event])
      })
    }
  }, [isAuthenticated])

  return socketInstance
}

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
