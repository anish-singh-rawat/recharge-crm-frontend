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
} from 'lucide-react'
import toast from 'react-hot-toast'
import { whatsappApi } from '@/api/whatsapp'
import Card, { CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { useIsReady } from '@/hooks/useIsReady'
import { getAccessToken } from '@/lib/axios'

const QR_CYCLE_SECONDS = 50
const BASE_URL = import.meta.env.VITE_API_URL || 'https://api.rechpays.in/api/v1'

export default function WhatsApp() {
  const queryClient = useQueryClient()
  const ready = useIsReady()

  const [mobileNumber, setMobileNumber] = useState('')
  const [messageText, setMessageText] = useState('')
  const [timeLeft, setTimeLeft] = useState(QR_CYCLE_SECONDS)
  const isAutoRegenerating = useRef(false)

  // SSE real-time state
  const [sseStatus, setSseStatus] = useState(null)
  const [sseQr, setSseQr] = useState(null)
  const [sseQrGeneratedAt, setSseQrGeneratedAt] = useState(null)
  const [sseUserPhone, setSseUserPhone] = useState(null)
  const eventSourceRef = useRef(null)

  // Connect SSE stream for real-time updates
  useEffect(() => {
    if (!ready) return

    const connectSSE = () => {
      const token = getAccessToken()
      if (!token) return

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      const url = `${BASE_URL}/whatsapp/stream?token=${encodeURIComponent(token)}`
      const es = new EventSource(url)
      eventSourceRef.current = es

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data)
          const data = parsed.data || parsed

          if (data.status) setSseStatus(data.status)
          if (data.qr !== undefined) setSseQr(data.qr)
          if (data.qrGeneratedAt !== undefined) setSseQrGeneratedAt(data.qrGeneratedAt)
          if (data.userPhone !== undefined) setSseUserPhone(data.userPhone)

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
  }, [ready, queryClient])

  // Fallback polling (slower, for when SSE is down)
  const { data: statusData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['whatsapp', 'status'],
    queryFn: () => whatsappApi.getStatus(),
    select: (res) => res.data?.data || res.data || {},
    enabled: ready,
    refetchInterval: (data) => {
      if (data?.status === 'qr_ready' || data?.status === 'connecting' || data?.status === 'launching') {
        return 4000
      }
      return 15000
    },
  })

  // Merge SSE + polling data (SSE takes priority)
  const mergedStatus = sseStatus || statusData?.status || 'disconnected'
  const isConnected = mergedStatus === 'connected' || (statusData?.isReady && mergedStatus !== 'disconnected')
  const qrImage = sseQr !== null ? sseQr : statusData?.qr
  const userPhone = sseUserPhone !== null ? sseUserPhone : statusData?.userPhone
  const qrGeneratedAt = sseQrGeneratedAt !== null ? sseQrGeneratedAt : statusData?.qrGeneratedAt

  // Connect / Initial QR mutation
  const connectMutation = useMutation({
    mutationFn: () => whatsappApi.connect(),
    onSuccess: () => {
      toast.success('WhatsApp initialized. Scan the QR code.')
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
    onSuccess: () => {
      toast.success('Fresh WhatsApp QR code generated!')
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
      toast.success('WhatsApp disconnected successfully.')
      setTimeLeft(QR_CYCLE_SECONDS)
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
            Real-time WhatsApp Web QR connection and direct customer messaging
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin text-[#2563EB]' : ''} />
            Refresh Status
          </Button>

          {!isConnected && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={isBusy}
              className="flex items-center gap-1.5 border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF]"
              title="Manually generate a fresh new QR code right now"
            >
              <Sparkles size={14} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
              {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate QR'}
            </Button>
          )}

          {isConnected ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to disconnect and clear the WhatsApp session?')) {
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
              variant="primary"
              size="sm"
              onClick={() => connectMutation.mutate()}
              disabled={isBusy}
              className="flex items-center gap-1.5"
            >
              <QrCode size={14} />
              {isBusy ? 'Starting...' : 'Connect WhatsApp'}
            </Button>
          )}
        </div>
      </div>

      {/* Status Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isConnected
                    ? 'bg-[#DCFCE7] text-[#16A34A]'
                    : mergedStatus === 'qr_ready'
                    ? 'bg-[#FEF3C7] text-[#D97706]'
                    : mergedStatus === 'connecting'
                    ? 'bg-[#DBEAFE] text-[#2563EB]'
                    : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 size={24} />
                ) : mergedStatus === 'qr_ready' ? (
                  <QrCode size={24} className="animate-pulse" />
                ) : mergedStatus === 'connecting' ? (
                  <RefreshCw size={24} className="animate-spin" />
                ) : (
                  <AlertCircle size={24} />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[#0F172A]">
                    WhatsApp Connection Status
                  </h3>
                  {isConnected && (
                    <Badge variant="success" className="capitalize">
                      Connected
                    </Badge>
                  )}
                  {mergedStatus === 'qr_ready' && (
                    <Badge variant="warning" className="capitalize">
                      QR Ready — Scan Now
                    </Badge>
                  )}
                  {mergedStatus === 'connecting' && (
                    <Badge variant="info" className="capitalize">
                      Connecting...
                    </Badge>
                  )}
                  {mergedStatus === 'launching' && (
                    <Badge variant="info" className="capitalize">
                      Launching...
                    </Badge>
                  )}
                  {mergedStatus === 'disconnected' && (
                    <Badge variant="secondary" className="capitalize">
                      Disconnected
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-[#64748B] mt-1">
                  {isConnected
                    ? `Linked phone: +${userPhone || 'Active'} • Ready to send messages`
                    : mergedStatus === 'qr_ready'
                    ? 'Real-time QR code is active. Point your camera to link.'
                    : mergedStatus === 'connecting'
                    ? 'Establishing secure connection with WhatsApp Web...'
                    : mergedStatus === 'launching'
                    ? 'Initializing WhatsApp connection...'
                    : 'WhatsApp is not connected. Click "Connect WhatsApp" or "Regenerate QR" to link.'}
                </p>
              </div>
            </div>

            {isConnected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] border border-[#86EFAC] rounded-lg shrink-0">
                <ShieldCheck size={16} className="text-[#16A34A]" />
                <span className="text-xs font-medium text-[#16A34A]">Auto-Session Maintained</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Session Details" />
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Auto-Regenerate:</span>
              <span className="font-semibold text-[#16A34A]">Active (Every 50s)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Persistent Auth:</span>
              <span className="font-semibold text-[#16A34A]">Enabled</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Live Updates:</span>
              <span className="font-semibold text-[#16A34A]">SSE Connected</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#F1F5F9]">
              <span className="text-[#64748B]">Anti-Ban Shield:</span>
              <span className="font-semibold text-[#16A34A] flex items-center gap-1">
                <ShieldCheck size={12} /> Active
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#64748B]">Access:</span>
              <span className="font-semibold text-[#0F172A]">Admin & Super Admin</span>
            </div>
          </div>
        </Card>
      </div>

      {/* QR Code Section (if not connected) */}
      {!isConnected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <div className="flex items-center justify-between w-full mb-3 px-1">
                <h3 className="font-bold text-[#0F172A] text-sm">Scan WhatsApp QR</h3>
                {qrImage && (
                  <button
                    type="button"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={isBusy}
                    className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium flex items-center gap-1"
                    title="Click to generate a new QR immediately"
                  >
                    <Sparkles size={12} />
                    Regenerate Now
                  </button>
                )}
              </div>

              {qrImage ? (
                <div className="space-y-3 w-full flex flex-col items-center">
                  <div className="p-3 bg-white border-2 border-[#2563EB]/30 rounded-2xl shadow-sm inline-block relative group">
                    <img
                      src={qrImage}
                      alt="WhatsApp QR Code"
                      className="w-56 h-56 rounded-lg object-contain"
                    />

                    {/* Overlay when regenerating */}
                    {isBusy && (
                      <div className="absolute inset-0 bg-white/80 rounded-2xl flex flex-col items-center justify-center backdrop-blur-xs">
                        <RefreshCw className="animate-spin text-[#2563EB]" size={28} />
                        <span className="text-xs font-semibold text-[#0F172A] mt-2">
                          Generating fresh QR...
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Countdown bar */}
                  <div className="w-56 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                      <span className="flex items-center gap-1 font-medium text-[#2563EB]">
                        <Clock size={12} />
                        {timeLeft > 0 ? `Expires in ${timeLeft}s` : 'Refreshing new QR...'}
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

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => regenerateMutation.mutate()}
                    disabled={isBusy}
                    className="w-56 mt-1 flex items-center justify-center gap-1.5 text-xs text-[#2563EB] border-[#BFDBFE]"
                  >
                    <Sparkles size={13} className={regenerateMutation.isPending ? 'animate-spin' : ''} />
                    {regenerateMutation.isPending ? 'Regenerating...' : 'Regenerate QR Code'}
                  </Button>
                </div>
              ) : (
                <div className="w-56 h-56 rounded-2xl border-2 border-dashed border-[#CBD5E1] flex flex-col items-center justify-center p-4 bg-[#F8FAFC]">
                  {isBusy ? (
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="animate-spin text-[#2563EB]" size={28} />
                      <p className="text-xs text-[#64748B]">Generating Real-Time QR...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center">
                      <QrCode size={36} className="text-[#94A3B8]" />
                      <p className="text-xs text-[#64748B]">QR code inactive</p>
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

          <div className="lg:col-span-7">
            <Card className="h-full flex flex-col justify-center">
              <CardHeader title="How to Connect WhatsApp" />
              <div className="space-y-4 text-xs sm:text-sm text-[#334155] mt-2">
                <div className="flex items-start gap-3 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Open WhatsApp</p>
                    <p className="text-xs text-[#64748B]">Open WhatsApp on your mobile phone.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Go to Linked Devices</p>
                    <p className="text-xs text-[#64748B]">
                      Tap <b>Menu (⋮)</b> or <b>Settings</b> &gt; <b>Linked Devices</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
                  <div className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F172A]">Link a Device</p>
                    <p className="text-xs text-[#64748B]">
                      Tap <b>Link a Device</b> and scan the QR code on the left.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1D4ED8]">
                  <Info size={16} className="shrink-0 text-[#2563EB]" />
                  <span>
                    The QR code automatically refreshes every 50 seconds. You can also click <b>Regenerate QR</b> at any moment.
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Send Message Section */}
      <Card>
        <CardHeader
          title="Send One-to-One WhatsApp Message"
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
                Enter 10-digit Indian mobile number or with country code
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
              placeholder="Type your WhatsApp message here..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={!isConnected || sendMutation.isPending}
              className="w-full p-3 text-sm border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:bg-[#F1F5F9] disabled:cursor-not-allowed resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              {sendMutation.isPending ? 'Sending...' : 'Send WhatsApp Message'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Anti-Ban & Account Safety Guidelines */}
      <Card className="border-[#BBF7D0] bg-[#F0FDF4]/40">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="text-[#16A34A]" size={20} />
          <h3 className="text-sm font-bold text-[#14532D]">
            Anti-Ban Protection Engine & Safety Recommendations
          </h3>
        </div>
        <p className="text-xs text-[#166534] mb-3">
          Our backend engine automatically protects your WhatsApp account using human simulation algorithms:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
          <div className="p-2.5 bg-white/80 rounded-lg border border-[#DCFCE7]">
            <span className="font-semibold text-[#14532D] block mb-0.5">🖥️ Official Client Emulation</span>
            <p className="text-[#166534]">
              Spoofs genuine macOS Desktop WhatsApp identity. WhatsApp servers cannot detect custom third-party bot signatures.
            </p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-lg border border-[#DCFCE7]">
            <span className="font-semibold text-[#14532D] block mb-0.5">✍️ Human Typing Simulation</span>
            <p className="text-[#166534]">
              Subscribes to recipient presence and shows &quot;typing...&quot; for a natural 1.5s–3.5s before message delivery.
            </p>
          </div>
          <div className="p-2.5 bg-white/80 rounded-lg border border-[#DCFCE7]">
            <span className="font-semibold text-[#14532D] block mb-0.5">⏱️ Flood Rate-Limiter Queue</span>
            <p className="text-[#166534]">
              Sequential outbox queue with randomized 2.5s–4.5s delays between consecutive messages to prevent bulk spam bans.
            </p>
          </div>
        </div>

        <div className="p-3 bg-[#FEF3C7]/60 border border-[#FDE68A] rounded-lg text-xs text-[#92400E] space-y-1">
          <p className="font-semibold flex items-center gap-1">
            <AlertCircle size={14} /> WhatsApp Policy Best Practices to Avoid Account Restriction:
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-[11.5px]">
            <li><b>Contact Saving:</b> Ask customers to save your WhatsApp number in their contacts. WhatsApp rarely blocks numbers that recipients have saved.</li>
            <li><b>Warm Up New Numbers:</b> If connecting a fresh number, start with only 10–20 messages per day for the first week before increasing volume.</li>
            <li><b>Avoid Mass Broadcast Spam:</b> Do not blast identical messages to hundreds of unsaved numbers within minutes.</li>
            <li><b>Quality Content:</b> Avoid spam keywords (e.g. &quot;Lottery&quot;, &quot;100% Free cash&quot;, etc.) that trigger WhatsApp user reports.</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
