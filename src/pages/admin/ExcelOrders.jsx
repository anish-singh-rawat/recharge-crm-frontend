import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Upload,
  Send,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Check,
  Edit2,
  RefreshCw,
  Info,
  DollarSign,
  Users,
  ShieldCheck,
  ChevronRight,
  X,
  Wallet,
  Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { partnerOrdersApi } from '@/api/partnerOrders'
import Card from '@/components/ui/Card'
import StatCard from '@/components/ui/StatCard'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Pagination from '@/components/ui/Pagination'
import { useSocket } from '@/hooks/useSocket'

const DEFAULT_MESSAGE_TEMPLATE =
  'Dear {partnerName}, this is a gentle reminder that your order #{orderId} dated {orderDate} of {orderAmount} has a pending due balance of {dueAmount} (Paid: {paidAmount}). Please clear the pending amount at your earliest convenience. Thank you! - RechPays'

export default function ExcelOrders() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  // Dedicated Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentModalOrder, setPaymentModalOrder] = useState(null)
  const [paymentModalAmount, setPaymentModalAmount] = useState('')

  // Inline editing states
  const [editingMobilePrm, setEditingMobilePrm] = useState(null)
  const [mobileInputVal, setMobileInputVal] = useState('')
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [paymentInputVal, setPaymentInputVal] = useState('')

  // Template & notification state
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])

  // Live Socket queue progress
  const [queueProgress, setQueueProgress] = useState(null)

  // Listen to background queue progress via Socket.IO
  useSocket({
    'partner-order:notification-progress': (data) => {
      setQueueProgress(data)
      if (data.type === 'completed') {
        toast.success(`Notification queue finished! Sent: ${data.sent}, Failed: ${data.failed}`)
        queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
        queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
      }
    },
  })

  // 1. Fetch Orders Query
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['partner-orders', { page, limit, search, status: statusFilter }],
    queryFn: () =>
      partnerOrdersApi
        .listOrders({ page, limit, search, status: statusFilter })
        .then((res) => res.data?.data || res.data || {}),
  })

  // 2. Fetch Summary Statistics
  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['partner-orders', 'summary'],
    queryFn: () =>
      partnerOrdersApi.getSummary().then((res) => res.data?.data || res.data || {}),
  })

  const orders = ordersData?.orders || []
  const pagination = ordersData?.pagination || { total: 0, page: 1, limit: 25, pages: 1 }
  const summary = summaryData || {
    totalOrders: 0,
    dueOrdersCount: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalDue: 0,
    totalPartners: 0,
    partnersWithMobile: 0,
    partnersMissingMobile: 0,
  }

  // 3. Upload Excel Mutation
  const importMutation = useMutation({
    mutationFn: (formData) => partnerOrdersApi.importExcel(formData),
    onSuccess: (res) => {
      const data = res.data?.data || {}
      toast.success(
        `Imported ${data.importedOrders || 0} orders! (${data.skippedDuplicates || 0} duplicates skipped)`
      )
      setIsImportModalOpen(false)
      setSelectedFile(null)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to import Excel file')
    },
  })

  // 4. Update Partner Mobile Mutation
  const mobileMutation = useMutation({
    mutationFn: ({ prmId, mobileNumber }) =>
      partnerOrdersApi.updatePartnerMobile(prmId, mobileNumber),
    onSuccess: (_, vars) => {
      toast.success(`Mobile number saved for Partner PRM ID ${vars.prmId}!`)
      setEditingMobilePrm(null)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update mobile number')
    },
  })

  // 5. Update Order Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: ({ id, paidAmount }) =>
      partnerOrdersApi.updateOrderPayment(id, paidAmount),
    onSuccess: () => {
      toast.success('Payment updated successfully!')
      setEditingPaymentId(null)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update payment')
    },
  })

  // 6. Send Payment Notifications Mutation
  const notifyMutation = useMutation({
    mutationFn: (payload) => partnerOrdersApi.sendNotifications(payload),
    onSuccess: (res) => {
      const data = res.data?.data || {}
      toast.success(
        `Started sending ${data.totalQueued} notifications (with random 5–10s delay)`
      )
      setIsNotifyModalOpen(false)
      setIsProgressModalOpen(true)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to send notifications')
    },
  })

  const handleFileUpload = (e) => {
    e.preventDefault()
    if (!selectedFile) {
      toast.error('Please select an Excel file first')
      return
    }
    const formData = new FormData()
    formData.append('file', selectedFile)
    importMutation.mutate(formData)
  }

  const handleSaveMobile = (prmId) => {
    const clean = mobileInputVal.trim().replace(/[^0-9]/g, '')
    if (clean && clean.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    mobileMutation.mutate({ prmId, mobileNumber: clean })
  }

  const handleSavePayment = (id) => {
    const num = parseFloat(paymentInputVal)
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    paymentMutation.mutate({ id, paidAmount: num })
  }

  const handleOpenPaymentModal = (order) => {
    setPaymentModalOrder(order)
    setPaymentModalAmount(order.paidAmount ? String(order.paidAmount) : '')
    setIsPaymentModalOpen(true)
  }

  const handleSaveModalPayment = (e) => {
    e?.preventDefault()
    if (!paymentModalOrder) return
    const num = parseFloat(paymentModalAmount)
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid amount')
      return
    }
    paymentMutation.mutate(
      { id: paymentModalOrder._id, paidAmount: num },
      {
        onSuccess: () => {
          setIsPaymentModalOpen(false)
          setPaymentModalOrder(null)
        },
      }
    )
  }

  // Eligible pending orders for notification
  const dueOrders = useMemo(() => {
    return orders.filter((o) => (o.dueAmount || 0) > 0)
  }, [orders])

  // Sample live template preview with mock or first row values
  const previewMessage = useMemo(() => {
    const sample = dueOrders[0] ||
      orders[0] || {
        partnerName: 'SONU WATCH&RADIO CO.',
        orderId: '2638140054',
        orderAmount: 5150,
        paidAmount: 4950,
        dueAmount: 200,
        orderDate: '02.09.2026',
        partnerPrmId: '661601101',
      }

    return messageTemplate
      .replace(/{partnerName}/g, sample.partnerName || 'Partner')
      .replace(/{orderId}/g, sample.orderId || '')
      .replace(/{orderAmount}/g, `₹${sample.orderAmount || 0}`)
      .replace(/{paidAmount}/g, `₹${sample.paidAmount || 0}`)
      .replace(/{dueAmount}/g, `₹${sample.dueAmount || 0}`)
      .replace(/{orderDate}/g, sample.orderDate || '')
      .replace(/{partnerPrmId}/g, sample.partnerPrmId || '')
  }, [messageTemplate, dueOrders, orders])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A] flex items-center gap-2">
            <FileSpreadsheet className="text-[#2563EB]" size={28} />
            Excel Order Imports
          </h1>
          <p className="text-sm text-[#94A3B8] mt-0.5">
            Import partner orders from Excel, manage customer mobile numbers, and dispatch WhatsApp due reminders
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {queueProgress && queueProgress.type !== 'completed' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsProgressModalOpen(true)}
              className="border-[#2563EB] text-[#2563EB] hover:bg-[#EFF6FF] flex items-center gap-1.5"
            >
              <RefreshCw size={14} className="animate-spin text-[#2563EB]" />
              Queue Active ({queueProgress.current}/{queueProgress.total})
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setSelectedOrderIds(dueOrders.map((o) => o._id))
              setIsNotifyModalOpen(true)
            }}
            disabled={summary.dueOrdersCount === 0}
            className="flex items-center gap-1.5 shadow-xs"
          >
            <Send size={14} />
            Send Payment Notification
            {summary.dueOrdersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[11px] bg-white/25 rounded-full font-mono">
                {summary.dueOrdersCount}
              </span>
            )}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 border-[#CBD5E1]"
          >
            <Upload size={14} />
            Import Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders"
          value={summary.totalOrders.toLocaleString()}
          subtitle={`${summary.totalPartners} Distinct Partners`}
          icon={<FileSpreadsheet size={20} />}
          iconBg="bg-[#EFF6FF]"
          iconColor="text-[#2563EB]"
        />

        <StatCard
          title="Total Order Value"
          value={`₹${summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Imported Volume"
          icon={<DollarSign size={20} />}
          iconBg="bg-[#F0FDF4]"
          iconColor="text-[#16A34A]"
        />

        <StatCard
          title="Total Paid"
          value={`₹${summary.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Recovered Payments"
          icon={<CheckCircle2 size={20} />}
          iconBg="bg-[#DCFCE7]"
          iconColor="text-[#16A34A]"
        />

        <StatCard
          title="Total Due Amount"
          value={`₹${summary.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${summary.dueOrdersCount} Orders Pending Due`}
          icon={<AlertCircle size={20} />}
          iconBg="bg-[#FEE2E2]"
          iconColor="text-[#DC2626]"
        />
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden shadow-xs border-[#E2E8F0]">
        {/* Filter Bar */}
        <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
              <input
                type="text"
                placeholder="Search by Order ID, Partner Name, PRM ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-[#2563EB] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                All Orders
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('due')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                  statusFilter === 'due'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#DC2626]'
                }`}
              >
                Pending Dues
                {summary.dueOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('paid')
                  setPage(1)
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === 'paid'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#16A34A]'
                }`}
              >
                Fully Paid
              </button>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                refetchOrders()
                refetchSummary()
              }}
              className="p-1.5"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={isFetchingOrders ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Order Date</th>
                <th className="py-3 px-3">Order Time</th>
                <th className="py-3 px-3">Partner Name</th>
                <th className="py-3 px-3">Partner PRM ID</th>
                <th className="py-3 px-3 text-right">Order Amount</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Due Amount</th>
                <th className="py-3 px-3">Customer Mobile</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-[#2563EB]" size={24} />
                      <span>Loading imported orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileSpreadsheet className="text-[#CBD5E1]" size={36} />
                      <p className="font-semibold text-sm text-[#0F172A]">No Orders Found</p>
                      <p className="text-xs text-[#64748B] max-w-sm">
                        Click &quot;Import Excel&quot; to upload your spreadsheet. Only the 6 designated columns will be parsed and saved.
                      </p>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsImportModalOpen(true)}
                        className="mt-2"
                      >
                        <Upload size={14} className="mr-1.5" />
                        Import Excel Now
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const isEditingMobile = editingMobilePrm === order.partnerPrmId
                  const isEditingPayment = editingPaymentId === order._id
                  const isDue = (order.dueAmount || 0) > 0

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* 1. Order ID */}
                      <td className="py-3 px-3 font-mono font-medium text-[#0F172A]">
                        {order.orderId}
                      </td>

                      {/* 2. Order Date */}
                      <td className="py-3 px-3 text-[#475569]">
                        {order.orderDate || '—'}
                      </td>

                      {/* 3. Order Time */}
                      <td className="py-3 px-3 text-[#475569] font-mono">
                        {order.orderTime || '—'}
                      </td>

                      {/* 4. Partner Name */}
                      <td className="py-3 px-3 font-medium text-[#0F172A] max-w-xs truncate" title={order.partnerName}>
                        {order.partnerName}
                      </td>

                      {/* 5. Partner PRM ID */}
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded bg-[#F1F5F9] font-mono text-[11px] text-[#475569] border border-[#E2E8F0]">
                          {order.partnerPrmId}
                        </span>
                      </td>

                      {/* 6. Order Amount */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-[#0F172A]">
                        ₹{order.orderAmount.toFixed(2)}
                      </td>

                      {/* Paid Amount (Editable inline) */}
                      <td className="py-3 px-3 text-right font-mono">
                        {isEditingPayment ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={paymentInputVal}
                              onChange={(e) => setPaymentInputVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSavePayment(order._id)
                                if (e.key === 'Escape') setEditingPaymentId(null)
                              }}
                              className="w-20 px-2 py-1 text-xs border border-[#2563EB] rounded focus:outline-none text-right font-mono"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSavePayment(order._id)}
                              disabled={paymentMutation.isPending}
                              className="p-1 text-[#16A34A] hover:bg-[#DCFCE7] rounded"
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPaymentId(null)}
                              className="p-1 text-[#DC2626] hover:bg-[#FEE2E2] rounded"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (order.paidAmount || 0) > 0 ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[#16A34A] font-semibold">
                              ₹{(order.paidAmount).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPaymentId(order._id)
                                setPaymentInputVal(String(order.paidAmount))
                              }}
                              className="text-[#94A3B8] hover:text-[#2563EB] p-0.5 rounded transition-colors"
                              title="Edit Paid Amount"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(order)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-dashed border-[#CBD5E1] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors font-sans"
                          >
                            <Plus size={10} />
                            Add Paid
                          </button>
                        )}
                      </td>

                      {/* Due Amount */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        {isDue ? (
                          <span className="text-[#DC2626]">
                            ₹{order.dueAmount.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[#16A34A]">₹0.00</span>
                        )}
                      </td>

                      {/* Customer Mobile (Editable & Persistent per PRM ID) */}
                      <td className="py-3 px-3">
                        {isEditingMobile ? (
                          <div className="flex items-center gap-1 max-w-[180px]">
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-[#94A3B8] font-bold">
                                +91
                              </span>
                              <input
                                type="tel"
                                maxLength={10}
                                placeholder="9876543210"
                                value={mobileInputVal}
                                onChange={(e) => setMobileInputVal(e.target.value)}
                                className="w-full pl-8 pr-1 py-1 text-xs border border-[#2563EB] rounded font-mono focus:outline-none"
                                autoFocus
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleSaveMobile(order.partnerPrmId)}
                              disabled={mobileMutation.isPending}
                              className="p-1 text-[#16A34A] hover:bg-[#DCFCE7] rounded"
                              title="Save mobile for this PRM ID"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingMobilePrm(null)}
                              className="p-1 text-[#DC2626] hover:bg-[#FEE2E2] rounded"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : order.partnerMobile ? (
                          <div className="flex items-center gap-1.5 group">
                            <Smartphone size={13} className="text-[#16A34A] shrink-0" />
                            <span className="font-mono text-xs text-[#0F172A]">
                              +91 {order.partnerMobile}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMobilePrm(order.partnerPrmId)
                                setMobileInputVal(order.partnerMobile)
                              }}
                              className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#2563EB] transition-opacity p-0.5"
                              title="Edit mobile for this PRM ID"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 max-w-[160px]">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMobilePrm(order.partnerPrmId)
                                setMobileInputVal('')
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-dashed border-[#CBD5E1] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                            >
                              <Smartphone size={11} />
                              + Add Mobile
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        {order.paymentStatus === 'paid' ? (
                          <Badge variant="success">Paid</Badge>
                        ) : order.paymentStatus === 'partially_paid' ? (
                          <Badge variant="warning">Partial</Badge>
                        ) : (
                          <Badge variant="danger">Pending</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenPaymentModal(order)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] border border-[#BFDBFE] text-[11px] font-semibold transition-colors"
                          title="Edit Payment Amount"
                        >
                          <Wallet size={12} />
                          Edit Pay
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between">
            <span className="text-xs text-[#64748B]">
              Showing {orders.length} of {pagination.total} orders
            </span>
            <Pagination
              currentPage={page}
              totalPages={pagination.pages}
              onPageChange={setPage}
            />
          </div>
        )}
      </Card>

      {/* ========================================================= */}
      {/* 0. EDIT PAYMENT MODAL */}
      {/* ========================================================= */}
      <Modal
        open={isPaymentModalOpen}
        onClose={() => {
          if (!paymentMutation.isPending) {
            setIsPaymentModalOpen(false)
            setPaymentModalOrder(null)
          }
        }}
        title="Update Payment Amount"
        size="sm"
      >
        {paymentModalOrder && (
          <form onSubmit={handleSaveModalPayment} className="space-y-4">
            {/* Order Info */}
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Order ID</span>
                <span className="font-mono font-semibold text-[#0F172A]">{paymentModalOrder.orderId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Partner</span>
                <span className="font-medium text-[#0F172A] truncate max-w-[180px]" title={paymentModalOrder.partnerName}>{paymentModalOrder.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Order Amount</span>
                <span className="font-mono font-bold text-[#0F172A]">₹{paymentModalOrder.orderAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[#E2E8F0] pt-1.5 mt-1">
                <span className="text-[#64748B]">Current Paid</span>
                <span className="font-mono font-semibold text-[#16A34A]">₹{(paymentModalOrder.paidAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Current Due</span>
                <span className={`font-mono font-bold ${(paymentModalOrder.dueAmount || 0) > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                  ₹{(paymentModalOrder.dueAmount || 0).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div>
              <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Quick Presets</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalAmount(String(paymentModalOrder.orderAmount || 0))}
                  className="flex flex-col items-center px-2 py-2 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#16A34A] hover:bg-[#BBF7D0] transition-colors"
                >
                  <CheckCircle2 size={15} />
                  <span className="text-[10px] font-bold mt-1">Full Paid</span>
                  <span className="text-[9px] font-mono">₹{(paymentModalOrder.orderAmount || 0).toFixed(0)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModalAmount(String(Math.floor((paymentModalOrder.orderAmount || 0) / 2)))}
                  className="flex flex-col items-center px-2 py-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] hover:bg-[#FDE68A] transition-colors"
                >
                  <AlertCircle size={15} />
                  <span className="text-[10px] font-bold mt-1">Half Paid</span>
                  <span className="text-[9px] font-mono">₹{Math.floor((paymentModalOrder.orderAmount || 0) / 2)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentModalAmount('0')}
                  className="flex flex-col items-center px-2 py-2 rounded-lg bg-[#FEE2E2] border border-[#FECACA] text-[#DC2626] hover:bg-[#FECACA] transition-colors"
                >
                  <X size={15} />
                  <span className="text-[10px] font-bold mt-1">Unpaid</span>
                  <span className="text-[9px] font-mono">₹0</span>
                </button>
              </div>
            </div>

            {/* Custom Amount Input */}
            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                Enter Custom Paid Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₹</span>
                <input
                  type="number"
                  min="0"
                  max={paymentModalOrder.orderAmount}
                  step="any"
                  value={paymentModalAmount}
                  onChange={(e) => setPaymentModalAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {/* Live remaining due preview */}
              {paymentModalAmount !== '' && !isNaN(parseFloat(paymentModalAmount)) && (
                <div className="mt-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between text-xs">
                  <span className="text-[#64748B]">Remaining Due after save:</span>
                  <span className={`font-mono font-bold ${Math.max(0, (paymentModalOrder.orderAmount || 0) - parseFloat(paymentModalAmount || 0)) > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                    ₹{Math.max(0, (paymentModalOrder.orderAmount || 0) - parseFloat(paymentModalAmount || 0)).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsPaymentModalOpen(false)
                  setPaymentModalOrder(null)
                }}
                disabled={paymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={paymentMutation.isPending || paymentModalAmount === ''}
                className="flex items-center gap-1.5"
              >
                {paymentMutation.isPending ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Wallet size={13} />
                    Save Payment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* 1. IMPORT EXCEL MODAL */}
      {/* ========================================================= */}
      <Modal
        open={isImportModalOpen}

        onClose={() => {
          if (!importMutation.isPending) {
            setIsImportModalOpen(false)
            setSelectedFile(null)
          }
        }}
        title="Import Excel Orders"
        size="md"
      >
        <form onSubmit={handleFileUpload} className="space-y-4">
          <div className="p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs text-[#1E40AF] flex items-start gap-2.5">
            <Info size={16} className="shrink-0 mt-0.5 text-[#2563EB]" />
            <div>
              <p className="font-semibold text-[#1E3A8A]">Strict Column Filter Active</p>
              <p className="mt-0.5 text-[#1E40AF]">
                Only the following <b>6 columns</b> will be extracted and saved in the database:
              </p>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5 font-mono text-[11px] text-[#1D4ED8]">
                <span>• Order ID</span>
                <span>• Order Time</span>
                <span>• Order Date</span>
                <span>• Partner Name</span>
                <span>• Order Amount</span>
                <span>• Partner PRM ID</span>
              </div>
              <p className="mt-1 text-[11px] text-[#475569]">
                All other columns (Parent PRM, RPOS Ref, Transfer details, FOS) are automatically ignored.
              </p>
            </div>
          </div>

          <div>
            <input
              id="excel-file-upload-input"
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setSelectedFile(e.target.files[0])
                }
              }}
              className="hidden"
            />

            <label
              htmlFor="excel-file-upload-input"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (e.dataTransfer.files?.[0]) {
                  setSelectedFile(e.dataTransfer.files[0])
                }
              }}
              className="border-2 border-dashed border-[#CBD5E1] hover:border-[#2563EB] bg-[#F8FAFC] hover:bg-[#EFF6FF]/30 rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 block"
            >
              <div className="w-12 h-12 rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                <Upload size={24} />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="font-bold text-sm text-[#0F172A] flex items-center justify-center gap-1.5">
                    <CheckCircle2 size={16} className="text-[#16A34A]" />
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-[#64748B]">
                    {(selectedFile.size / 1024).toFixed(1)} KB • Ready to upload
                  </p>
                  <span className="inline-block text-xs text-[#2563EB] font-medium underline mt-1">
                    Click to choose a different file
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="font-semibold text-sm text-[#0F172A]">
                    Click to browse or drag & drop Excel sheet
                  </p>
                  <p className="text-xs text-[#94A3B8]">Supports .xlsx, .xls, .csv up to 25MB</p>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#2563EB] text-white rounded-md text-xs font-medium hover:bg-[#1D4ED8]">
                    <Upload size={12} />
                    Browse Files
                  </span>
                </div>
              )}
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsImportModalOpen(false)
                setSelectedFile(null)
              }}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!selectedFile || importMutation.isPending}
              className="flex items-center gap-1.5"
            >
              {importMutation.isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Importing Orders...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload & Process
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ========================================================= */}
      {/* 2. SEND PAYMENT NOTIFICATIONS MODAL (PREVIEW & EDIT) */}
      {/* ========================================================= */}
      <Modal
        open={isNotifyModalOpen}
        onClose={() => {
          if (!notifyMutation.isPending) {
            setIsNotifyModalOpen(false)
          }
        }}
        title="Send WhatsApp Payment Notifications"
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-[#FEF3C7] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-start gap-2">
            <Clock size={16} className="shrink-0 mt-0.5 text-[#D97706]" />
            <div>
              <p className="font-semibold">Sequential Anti-Ban Queue Protection</p>
              <p className="mt-0.5">
                Messages will be sent one-by-one with a <b>random delay of 5–10 seconds</b> between
                each recipient to protect your WhatsApp account from rate limiting.
              </p>
            </div>
          </div>

          {/* Template Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-[#0F172A]">
                Customize Message Template
              </label>
              <button
                type="button"
                onClick={() => setMessageTemplate(DEFAULT_MESSAGE_TEMPLATE)}
                className="text-[11px] text-[#2563EB] hover:underline"
              >
                Reset Default
              </button>
            </div>

            <textarea
              rows={4}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-3 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none font-sans"
              placeholder="Enter message template..."
            />

            {/* Placeholder Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                '{partnerName}',
                '{orderId}',
                '{orderAmount}',
                '{paidAmount}',
                '{dueAmount}',
                '{orderDate}',
                '{partnerPrmId}',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMessageTemplate((prev) => prev + ` ${tag}`)}
                  className="px-2 py-0.5 text-[10px] font-mono bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] rounded border border-[#E2E8F0]"
                  title={`Insert ${tag}`}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>

          {/* WhatsApp Chat Preview Bubble */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
              Live WhatsApp Preview
            </label>
            <div className="bg-[#EFEAE2] p-4 rounded-xl border border-[#CBD5E1] relative">
              <div className="max-w-md bg-white p-3 rounded-lg shadow-sm text-xs text-[#0F172A] space-y-1.5 relative rounded-tl-none border border-[#E2E8F0]">
                <p className="whitespace-pre-wrap">{previewMessage}</p>
                <div className="flex justify-end items-center gap-1 text-[10px] text-[#94A3B8]">
                  <span>Just now</span>
                  <Check size={12} className="text-[#2563EB]" />
                </div>
              </div>
            </div>
          </div>

          {/* Recipient summary */}
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[#0F172A]">Recipient Summary</p>
              <p className="text-[#64748B] text-[11px] mt-0.5">
                Total Orders with Due: <b>{summary.dueOrdersCount}</b> • Total Due:{' '}
                <b className="text-[#DC2626]">₹{summary.totalDue.toFixed(2)}</b>
              </p>
              {summary.partnersMissingMobile > 0 && (
                <p className="text-[#DC2626] text-[11px] mt-0.5">
                  ⚠️ Note: {summary.partnersMissingMobile} partners have no mobile number and will be skipped.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsNotifyModalOpen(false)}
              disabled={notifyMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                notifyMutation.mutate({
                  template: messageTemplate,
                  orderIds: selectedOrderIds.length > 0 ? selectedOrderIds : undefined,
                })
              }}
              disabled={notifyMutation.isPending}
              className="flex items-center gap-1.5"
            >
              <Send size={14} />
              {notifyMutation.isPending ? 'Queuing Messages...' : 'Start Sending Queue'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================= */}
      {/* 3. LIVE QUEUE PROGRESS MODAL */}
      {/* ========================================================= */}
      <Modal
        open={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        title="WhatsApp Notification Queue Progress"
        size="md"
      >
        <div className="space-y-4 text-center py-2">
          {queueProgress ? (
            <>
              {queueProgress.type === 'completed' ? (
                <div className="w-16 h-16 mx-auto rounded-full bg-[#DCFCE7] flex items-center justify-center text-[#16A34A]">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto rounded-full bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
                  <RefreshCw size={32} className="animate-spin text-[#2563EB]" />
                </div>
              )}

              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  {queueProgress.type === 'completed'
                    ? 'All Notifications Sent!'
                    : `Sending Notification ${queueProgress.current || 1} of ${queueProgress.total || 0}`}
                </h3>
                <p className="text-xs text-[#64748B] mt-1">
                  {queueProgress.type === 'cooldown'
                    ? `Anti-ban cooldown: Waiting ${((queueProgress.cooldownMs || 5000) / 1000).toFixed(1)}s before next customer...`
                    : queueProgress.item
                    ? `Dispatching to ${queueProgress.item.partnerName} (${queueProgress.item.mobile})...`
                    : 'Processing batch...'}
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-[#E2E8F0] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#2563EB] h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${
                      queueProgress.total
                        ? ((queueProgress.sent + (queueProgress.failed || 0)) /
                            queueProgress.total) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-2 p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-xs">
                <div>
                  <p className="text-[#94A3B8] text-[11px]">Total</p>
                  <p className="font-bold text-[#0F172A] font-mono">{queueProgress.total || 0}</p>
                </div>
                <div>
                  <p className="text-[#16A34A] text-[11px]">Sent</p>
                  <p className="font-bold text-[#16A34A] font-mono">{queueProgress.sent || 0}</p>
                </div>
                <div>
                  <p className="text-[#DC2626] text-[11px]">Failed</p>
                  <p className="font-bold text-[#DC2626] font-mono">{queueProgress.failed || 0}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="py-6 space-y-2">
              <RefreshCw size={24} className="animate-spin text-[#2563EB] mx-auto" />
              <p className="text-xs text-[#64748B]">Waiting for queue heartbeat...</p>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsProgressModalOpen(false)}
            >
              Close Window
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
