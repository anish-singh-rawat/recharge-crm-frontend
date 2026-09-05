import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Send,
  Smartphone,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Sparkles,
  Wifi,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { whatsappApi } from '@/api/whatsapp'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useIsReady } from '@/hooks/useIsReady'
import { getAccessToken } from '@/lib/axios'
import { useSocket } from '@/hooks/useSocket'

const QR_CYCLE_SECONDS = 50
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rechpays.in/api/v1'

export default function WhatsApp() {
  const queryClient = useQueryClient()
  const ready = useIsReady()

  const [mobileNumber, setMobileNumber] = useState('')
  const [messageText, setMessageText] = useState('')
  const [timeLeft, setTimeLeft] = useState(QR_CYCLE_SECONDS)
  const isAutoRegenerating = useRef(false)

  // Stage state machine from wpp-connection AddDevice: 'idle' | 'qr' | 'scanning' | 'connected'
  const [stage, setStage] = useState('idle')
  const stageRef = useRef('idle')
  const qrWasShownRef = useRef(false)

  // SSE real-time state
  const [sseStatus, setSseStatus] = useState(null)
  const [sseQr, setSseQr] = useState(null)
  const [sseQrGeneratedAt, setSseQrGeneratedAt] = useState(null)
  const [sseUserPhone, setSseUserPhone] = useState(null)
  const eventSourceRef = useRef(null)

  // Centralized real-time status handler (from Socket.IO, SSE, or Polling)
  const handleIncomingStatus = useCallback((data) => {
    if (!data) return
    const status = data.status
    const qr = data.qr
    const isReady = data.isReady
    const phone = data.userPhone

    if (status) setSseStatus(status)
    if (qr !== undefined) setSseQr(qr)
    if (data.qrGeneratedAt !== undefined) setSseQrGeneratedAt(data.qrGeneratedAt)
    if (phone !== undefined) setSseUserPhone(phone)

    if (isReady || status === 'connected') {
      stageRef.current = 'connected'
      setStage('connected')
      return
    }

    if (status === 'qr_ready' || qr) {
      qrWasShownRef.current = true
      if (stageRef.current !== 'scanning') {
        stageRef.current = 'qr'
        setStage('qr')
      }
      return
    }

    // Exact condition from wpp-connection AddDevice.jsx (lines 108 & 125):
    // if ((status === 'connecting' || status.startsWith('loading')) && qrWasShownRef.current) -> stage = 'scanning'
    if ((status === 'connecting' || (status && String(status).startsWith('loading'))) && qrWasShownRef.current) {
      stageRef.current = 'scanning'
      setStage('scanning')
      return
    }

    if (status === 'disconnected') {
      qrWasShownRef.current = false
      stageRef.current = 'idle'
      setStage('idle')
      return
    }
  }, [])

  // Socket.IO real-time updates for instant 0ms latency
  useSocket({
    'whatsapp:status': (data) => {
      handleIncomingStatus(data)
      queryClient.setQueryData(['whatsapp', 'status'], (old) => {
        if (!old) return old
        return {
          ...old,
          data: {
            ...(old.data || {}),
            data: { ...(old.data?.data || {}), ...data },
          },
        }
      })
    },
    'whatsapp:qr': (data) => {
      handleIncomingStatus(data)
    },
    'whatsapp:connected': (data) => {
      handleIncomingStatus(data)
    },
  })

  // Connect SSE stream for real-time updates
  useEffect(() => {
    if (!ready) return

    const connectSSE = () => {
      const token = getAccessToken() || ''
      const refreshToken = localStorage.getItem('refreshToken') || ''
      if (!token && !refreshToken) return

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      const url = `${BASE_URL}/whatsapp/stream?token=${encodeURIComponent(token)}&refreshToken=${encodeURIComponent(refreshToken)}`
      const es = new EventSource(url, { withCredentials: true })
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          const data = parsed.data || parsed
          handleIncomingStatus(data)

          queryClient.setQueryData(['whatsapp', 'status'], (old) => {
            if (!old) return old
            return {
              ...old,
              data: {
                ...(old.data || {}),
                data: {
                  ...(old.data?.data || {}),
                  ...data,
                },
              },
            }
          })
        } catch {}
      }

      es.onerror = () => {
        es.close()
        eventSourceRef.current = null
        // Reconnect after 5s
        setTimeout(() => {
          if (!eventSourceRef.current) connectSSE()
        }, 5000)
      }
    }

    connectSSE()

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [ready, queryClient, handleIncomingStatus])

  // Fallback polling (slower, for when SSE is down)
  const { data: statusData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: () => whatsappApi.getStatus(),
    select: (res) => res.data?.data || res.data || {},
    enabled: ready,
    refetchInterval: (data) => {
      if (data?.status === 'qr_ready' || data?.status === 'connecting' || data?.status === 'launching') {
        return 2000
      }
      return 6000
    },
  })

  // Sync status from polling query
  useEffect(() => {
    if (statusData) {
      handleIncomingStatus(statusData)
    }
  }, [statusData, handleIncomingStatus])

  // Merge SSE + polling data (SSE takes priority)
  const mergedStatus = sseStatus || statusData?.status || 'disconnected'
  const isConnected = mergedStatus === 'connected' || (statusData?.isReady && mergedStatus !== 'disconnected')
  const qrImage = sseQr !== null ? sseQr : statusData?.qr
  const userPhone = sseUserPhone !== null ? sseUserPhone : statusData?.userPhone
  const qrGeneratedAt = sseQrGeneratedAt !== null ? sseQrGeneratedAt : statusData?.qrGeneratedAt

  // Exact scanning detection matching wpp-connection AddDevice
  const isScanning = stage === 'scanning' || ((mergedStatus === 'connecting' || (mergedStatus && String(mergedStatus).startsWith('loading'))) && qrWasShownRef.current)

  // Connect / Initial QR mutation
  const connectMutation = useMutation({
    mutationFn: () => whatsappApi.connect(),
    onSuccess: (res) => {
      const data = res.data?.data || res.data || {}
      handleIncomingStatus(data)
      toast.success('WhatsApp QR generated! Scan now.')
      setTimeLeft(QR_CYCLE_SECONDS)
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to initialize WhatsApp connection')
    },
  })

  // Manual / Auto Regenerate QR mutation
  const regenerateMutation = useMutation({
    mutationFn: () => whatsappApi.regenerateQR(),
    onMutate: () => {
      stageRef.current = 'idle'
      setStage('idle')
      qrWasShownRef.current = false
    },
    onSuccess: (res) => {
      const data = res.data?.data || res.data || {}
      handleIncomingStatus(data)
      toast.success('Fresh WhatsApp QR code ready!')
      setTimeLeft(QR_CYCLE_SECONDS)
      isAutoRegenerating.current = false
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] })
    },
    onError: (err) => {
      isAutoRegenerating.current = false
      toast.error(err.response?.data?.message || 'Failed to regenerate QR code')
    },
  })

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => whatsappApi.disconnect(),
    onSuccess: () => {
      toast.success('WhatsApp disconnected and unlinked from your phone!')
      setTimeLeft(QR_CYCLE_SECONDS)
      qrWasShownRef.current = false
      stageRef.current = 'idle'
      setStage('idle')
      setSseStatus(null)
      setSseQr(null)
      setSseQrGeneratedAt(null)
      setSseUserPhone(null)
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to disconnect WhatsApp')
    },
  })

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: (payload) => whatsappApi.sendMessage(payload),
    onSuccess: () => {
      toast.success('WhatsApp message sent successfully!')
      setMessageText('')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to send message')
    },
  })

  // Reset countdown timer when new QR image is received
  useEffect(() => {
    if (qrImage) {
      if (qrGeneratedAt) {
        const elapsed = Math.floor((Date.now() - qrGeneratedAt) / 1000)
        const remaining = Math.max(0, QR_CYCLE_SECONDS - elapsed)
        setTimeLeft(remaining)
      } else {
        setTimeLeft(QR_CYCLE_SECONDS)
      }
      isAutoRegenerating.current = false
    }
  }, [qrImage, qrGeneratedAt])

  // Live countdown timer & Auto-regenerate trigger on expiry
  useEffect(() => {
    if (!qrImage || isConnected || mergedStatus !== 'qr_ready') return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (!isAutoRegenerating.current && !regenerateMutation.isPending) {
            isAutoRegenerating.current = true
            regenerateMutation.mutate()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [qrImage, isConnected, mergedStatus, regenerateMutation])

  const handleSendMessage = (e) => {
    e.preventDefault()
    const cleanNumber = mobileNumber.trim().replace(/[^0-9]/g, '')
    if (!cleanNumber) {
      toast.error('Please enter a valid mobile number')
      return
    }
    if (!messageText.trim()) {
      toast.error('Please enter a message')
      return
    }

    sendMutation.mutate({
      number: cleanNumber,
      message: messageText.trim(),
    })
  }

  const applyTemplate = (text) => {
    setMessageText(text)
  }

  const isBusy =
    connectMutation.isPending ||
    regenerateMutation.isPending ||
    mergedStatus === 'launching'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <MessageSquare className="text-[#2563EB]" size={26} />
            WhatsApp Management
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Connect your WhatsApp Web to send recharge updates and customer alerts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isConnected ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to disconnect WhatsApp? This will unlink this device from your phone.')) {
                  disconnectMutation.mutate()
                }
              }}
              disabled={disconnectMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Power size={14} />
              {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={isBusy}
              className="flex items-center gap-1.5 border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]"
            >
              <RefreshCw size={14} className={isBusy ? 'animate-spin' : ''} />
              {isBusy ? 'Generating...' : 'Refresh QR'}
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Banner */}
      <Card className="py-3 px-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isConnected
                  ? 'bg-[#DCFCE7] text-[#16A34A]'
                  : isScanning
                  ? 'bg-[#EFF6FF] text-[#2563EB]'
                  : qrImage
                  ? 'bg-[#FEF3C7] text-[#D97706]'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {isConnected ? (
                <CheckCircle2 size={20} />
              ) : isScanning ? (
                <RefreshCw size={20} className="animate-spin text-[#2563EB]" />
              ) : qrImage ? (
                <QrCode size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#0F172A]">
                  {isConnected
                    ? 'WhatsApp Connected'
                    : isScanning
                    ? 'Connecting to WhatsApp...'
                    : qrImage
                    ? 'Scan QR Code to Connect'
                    : 'WhatsApp Not Connected'}
                </span>

                {isConnected ? (
                  <Badge variant="success">Online</Badge>
                ) : isScanning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse-dot" />
                    Connecting…
                  </span>
                ) : qrImage ? (
                  <Badge variant="warning">Scan QR</Badge>
                ) : (
                  <Badge variant="secondary">Offline</Badge>
                )}
              </div>

              <p className="text-xs text-[#64748B] mt-0.5">
                {isConnected
                  ? `Linked: +${userPhone || 'Active'} • Ready to send messages`
                  : isScanning
                  ? 'QR code scanned! Completing secure handshake...'
                  : qrImage
                  ? `QR active • Auto-refreshes in ${timeLeft}s`
                  : 'Click "Refresh QR" to generate a code for your phone'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Steps Indicator (When Not Connected) */}
      {!isConnected && (
        <div className="steps mb-4 max-w-xl mx-auto">
          {['Create', 'Scan QR', 'Connected'].map((s, i) => {
            const stepIndex = isConnected ? 2 : 1
            const isDone = stepIndex > i
            const isActive = stepIndex === i
            return (
              <div key={s} className={`step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
                <div className="step-circle">
                  {isDone ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <div className="step-label">{s}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* QR Code / Scanning Section */}
      {!isConnected && (
        isScanning ? (
          /* Connecting / Scanning Card in Application's Primary Blue theme */
          <Card className="max-w-xl mx-auto p-0 overflow-hidden border-[#BFDBFE] shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F1F5F9] bg-[#F8FAFC]">
              <div className="flex items-center gap-2 font-bold text-[#0F172A] text-sm">
                <Wifi size={18} className="text-[#2563EB]" />
                <span>Connecting to WhatsApp</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse-dot" />
                Connecting…
              </span>
            </div>

            <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
              {/* Application Blue theme circular ring loader */}
              <div className="relative w-24 h-24 my-1">
                <svg className="w-24 h-24 absolute top-0 left-0" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="42" fill="none" stroke="#DBEAFE" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="42"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="264"
                    strokeDashoffset="66"
                    className="origin-center animate-wa-spin"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                    <Smartphone size={24} className="text-[#2563EB]" />
                  </div>
                </div>
              </div>

              {/* Status text */}
              <div className="space-y-1">
                <h4 className="font-bold text-[#0F172A] text-base">
                  QR Code Scanned Successfully
                </h4>
                <p className="text-xs text-[#64748B] max-w-sm">
                  Connecting to WhatsApp… Keep the app open on your phone.
                </p>
                {mergedStatus && String(mergedStatus).startsWith('loading') && (
                  <p className="text-[#2563EB] text-xs font-semibold mt-2">
                    Loading… {String(mergedStatus).match(/\d+/)?.[0] ?? ''}%
                  </p>
                )}
              </div>

              {/* Blue theme progress bouncing dots */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#2563EB]"
                    style={{ animation: `bounce-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 max-w-4xl mx-auto">
            <div className="md:col-span-6 flex justify-center">
              <Card className="flex flex-col items-center justify-center p-6 text-center w-full max-w-sm">
                <div className="flex items-center justify-between w-full mb-3 px-1">
                  <h3 className="font-bold text-[#0F172A] text-sm">
                    Scan with WhatsApp
                  </h3>
                  {qrImage && (
                    <button
                      type="button"
                      onClick={() => regenerateMutation.mutate()}
                      disabled={isBusy}
                      className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1"
                      title="Generate new QR"
                    >
                      <RefreshCw size={12} className={isBusy ? 'animate-spin' : ''} />
                      New QR
                    </button>
                  )}
                </div>

                {qrImage ? (
                  <div className="space-y-3 w-full flex flex-col items-center">
                    <div className="p-3 bg-white border-2 border-[#2563EB]/20 rounded-2xl shadow-xs inline-block relative">
                      <img
                        src={qrImage}
                        alt="WhatsApp QR Code"
                        className="w-52 h-52 rounded-lg object-contain"
                      />

                      {isBusy && (
                        <div className="absolute inset-0 bg-white/85 rounded-2xl flex flex-col items-center justify-center backdrop-blur-xs">
                          <RefreshCw className="animate-spin text-[#2563EB]" size={26} />
                          <span className="text-xs font-semibold text-[#0F172A] mt-2">
                            Updating QR...
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="w-52 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span className="flex items-center gap-1 font-medium text-[#2563EB]">
                          <Clock size={11} />
                          {timeLeft > 0 ? `Expires in ${timeLeft}s` : 'Refreshing...'}
                        </span>
                        <span className="text-[10px] text-[#94A3B8]">Auto-updates</span>
                      </div>

                      <div className="w-full bg-[#E2E8F0] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#2563EB] h-full transition-all duration-1000 ease-linear rounded-full"
                          style={{ width: `${(timeLeft / QR_CYCLE_SECONDS) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
                    {isBusy ? (
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="animate-spin text-[#2563EB]" size={26} />
                        <p className="text-xs text-[#64748B]">Generating QR...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-center">
                        <QrCode size={32} className="text-[#94A3B8]" />
                        <p className="text-xs text-[#64748B]">No active QR</p>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => connectMutation.mutate()}
                          className="mt-1"
                        >
                          Generate QR
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>

            <div className="md:col-span-6 flex">
              <Card className="w-full flex flex-col justify-center">
                <CardHeader title="How to Connect" />
                <div className="space-y-3.5 text-xs text-[#334155] mt-2">
                  <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">Open WhatsApp</p>
                      <p className="text-xs text-[#64748B]">Open WhatsApp on your mobile phone</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">Linked Devices</p>
                      <p className="text-xs text-[#64748B]">
                        Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                    <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-[#0F172A]">Scan QR Code</p>
                      <p className="text-xs text-[#64748B]">
                        Tap <b>Link a Device</b> and point camera at the QR on the left
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )
      )}

      {/* Send WhatsApp Message Section */}
      <Card>
        <CardHeader
          title="Send WhatsApp Message"
          action={
            !isConnected && (
              <span className="text-xs text-[#DC2626] font-medium flex items-center gap-1">
                <AlertCircle size={13} />
                Connect WhatsApp above to send
              </span>
            )
          }
        />

        <form onSubmit={handleSendMessage} className="space-y-4 mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Customer Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B]">
                  +91
                </span>
                <input
                  type="tel"
                  placeholder="9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  disabled={!isConnected || sendMutation.isPending}
                  className="w-full pl-12 pr-3 py-2 text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F1F5F9] disabled:cursor-not-allowed font-mono"
                  required
                />
              </div>
              <p className="text-[11px] text-[#94A3B8] mt-1">
                Enter 10-digit Indian mobile number
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                Quick Message Templates
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      'Hello! Your recharge of ₹299 for mobile number 98XXXXXXXX was SUCCESSFUL. Ref ID: RC98765. Thank you!'
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-md transition-colors"
                >
                  ⚡ Recharge Success
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      'Dear Customer, your wallet has been credited with ₹500.00. Current Balance: ₹1,250.00. - RechargeCRM'
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-md transition-colors"
                >
                  💰 Wallet Credit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyTemplate(
                      'Your recharge request could not be completed. The amount has been refunded to your wallet. Please retry.'
                    )
                  }
                  className="px-2.5 py-1 text-xs bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded-md transition-colors"
                >
                  ⚠️ Recharge Failed
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Message Body
              </label>
              <span className="text-[11px] text-[#94A3B8]">
                {messageText.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              placeholder="Type your message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={!isConnected || sendMutation.isPending}
              className="w-full p-3 text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F1F5F9] disabled:cursor-not-allowed resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setMobileNumber('')
                setMessageText('')
              }}
              disabled={sendMutation.isPending}
            >
              Clear
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!isConnected || sendMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Send size={14} className={sendMutation.isPending ? 'animate-spin' : ''} />
              {sendMutation.isPending ? 'Sending...' : 'Send Message'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
