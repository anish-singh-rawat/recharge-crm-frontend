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
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      })
    }

    const socket = socketInstance

    const eventNames = [
      'recharge:update',
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
