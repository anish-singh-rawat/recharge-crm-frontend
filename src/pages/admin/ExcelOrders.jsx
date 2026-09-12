import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileSpreadsheet,
  Upload,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Smartphone,
  Check,
  Edit2,
  RefreshCw,
  Info,
  DollarSign,
  X,
  Wallet,
  Plus,
  CheckSquare2,
  Square,
  BadgeCheck,
  Trash2,
  Calendar,
  Download,
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
import { formatDateTime } from '@/utils/format'
import { exportToExcel } from '@/utils/exportExcel'

export function formatOrderTime(rawTime) {
  if (!rawTime && rawTime !== 0) return '—'
  const str = String(rawTime).trim()
  if (!str) return '—'

  // If already contains colons like "04:12:07 AM" or "15:13:13"
  if (str.includes(':')) {
    const match = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i)
    if (match) {
      let [_, h, m, s, period] = match
      s = s || '00'
      if (!period) {
        let hour = parseInt(h, 10)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        hour = hour % 12 || 12
        return `${hour}:${m}:${s} ${ampm}`
      }
      return `${parseInt(h, 10)}:${m}:${s} ${period.toUpperCase()}`
    }
    return str
  }

  // Pure digits: e.g. 41207 -> 4:12:07 AM, 151313 -> 3:13:13 PM
  if (/^\d+$/.test(str)) {
    const padded = str.padStart(6, '0')
    if (padded.length === 6) {
      const hour24 = parseInt(padded.slice(0, 2), 10)
      const min = padded.slice(2, 4)
      const sec = padded.slice(4, 6)

      if (hour24 >= 0 && hour24 < 24 && parseInt(min, 10) < 60 && parseInt(sec, 10) < 60) {
        const ampm = hour24 >= 12 ? 'PM' : 'AM'
        const displayHour = hour24 % 12 || 12
        return `${displayHour}:${min}:${sec} ${ampm}`
      }
    }
  }

  return str
}

const DEFAULT_MESSAGE_TEMPLATE =
  'Dear {partnerName}, this is a gentle reminder that your order #{orderId} dated {orderDate} of {orderAmount} has a pending due balance of {dueAmount} (Paid: {paidAmount}). Please clear the pending amount at your earliest convenience. Thank you! - RechPays'

export default function ExcelOrders() {
  const queryClient = useQueryClient()

  const [page, setPage] = useState(1)
  const [limit] = useState(25)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useRef(null)

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [paymentModalOrder, setPaymentModalOrder] = useState(null)
  const [paymentModalAmount, setPaymentModalAmount] = useState('')
  const [denominations, setDenominations] = useState({
    2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '',
    5: '', 2: '', 1: ''
  })

  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false)
  const [mobileModalOrder, setMobileModalOrder] = useState(null)
  const [mobileModalVal, setMobileModalVal] = useState('')

  const [checkedIds, setCheckedIds] = useState(new Set())
  const [editingPaymentId, setEditingPaymentId] = useState(null)
  const [paymentInputVal, setPaymentInputVal] = useState('')

  // Delete modal state
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)

  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_MESSAGE_TEMPLATE)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  const [queueProgress, setQueueProgress] = useState(null)

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


  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['partner-orders', { page, limit, search, status: statusFilter, startDate, endDate }],
    queryFn: () =>
      partnerOrdersApi
        .listOrders({ page, limit, search, status: statusFilter, startDate, endDate })
        .then((res) => res.data?.data || res.data || {}),
  })


  const { data: summaryData, refetch: refetchSummary } = useQuery({
    queryKey: ['partner-orders', 'summary', { startDate, endDate }],
    queryFn: () =>
      partnerOrdersApi
        .getSummary({ startDate: startDate || undefined, endDate: endDate || undefined })
        .then((res) => res.data?.data || res.data || {}),
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

  const mobileMutation = useMutation({
    mutationFn: ({ prmId, mobileNumber }) =>
      partnerOrdersApi.updatePartnerMobile(prmId, mobileNumber),
    onSuccess: (_, vars) => {
      toast.success(`Mobile number saved for Partner PRM ID ${vars.prmId}!`)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update mobile number')
    },
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id, paidAmount }) =>
      partnerOrdersApi.updateOrderPayment(id, paidAmount),
    onSuccess: (res) => {
      const msg = res.data?.message || res.message || 'Payment updated successfully!'
      toast.success(msg, { duration: 4000 })
      setEditingPaymentId(null)
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to update payment')
    },
  })

  const bulkMarkMutation = useMutation({
    mutationFn: (orderIds) => partnerOrdersApi.bulkMarkAsPaid(orderIds),
    onSuccess: (res) => {
      const data = res.data?.data || {}
      const msg = res.data?.message || res.message || `${data.updated || 0} order(s) marked as fully paid! ✅`
      toast.success(msg, { duration: 4500 })
      setCheckedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to mark orders as paid')
    },
  })

  // Single Delete Mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (id) => partnerOrdersApi.deleteOrder(id),
    onSuccess: (_, deletedId) => {
      toast.success('Order deleted successfully')
      setIsDeleteModalOpen(false)
      setDeleteTargetOrder(null)
      setCheckedIds((prev) => {
        const next = new Set(prev)
        next.delete(deletedId)
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete order')
    },
  })

  // Bulk Delete Mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (orderIds) => partnerOrdersApi.bulkDelete(orderIds),
    onSuccess: (res) => {
      const data = res.data?.data || {}
      toast.success(`${data.deletedCount || 0} order(s) deleted successfully!`)
      setIsBulkDeleteModalOpen(false)
      setCheckedIds(new Set())
      queryClient.invalidateQueries({ queryKey: ['partner-orders'] })
      queryClient.invalidateQueries({ queryKey: ['partner-orders', 'summary'] })
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to delete selected orders')
    },
  })

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

  const handleOpenMobileModal = (order) => {
    setMobileModalOrder(order)
    setMobileModalVal(order.partnerMobile || '')
    setIsMobileModalOpen(true)
  }

  const handleSaveMobileModal = (e) => {
    e?.preventDefault()
    if (!mobileModalOrder) return
    const clean = mobileModalVal.trim().replace(/[^0-9]/g, '')
    if (clean && clean.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }
    mobileMutation.mutate(
      { prmId: mobileModalOrder.partnerPrmId, mobileNumber: clean },
      {
        onSuccess: () => {
          setIsMobileModalOpen(false)
          setMobileModalOrder(null)
        },
      }
    )
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
    setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
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

  const toggleRow = (id) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllRows = () => {
    if (checkedIds.size === orders.length && orders.length > 0) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(orders.map((o) => o._id)))
    }
  }

  const handlePromptDeleteOrder = (order) => {
    setDeleteTargetOrder(order)
    setIsDeleteModalOpen(true)
  }

  const handleConfirmDeleteOrder = () => {
    if (!deleteTargetOrder) return
    deleteOrderMutation.mutate(deleteTargetOrder._id)
  }

  const handleConfirmBulkDelete = () => {
    if (checkedIds.size === 0) return
    bulkDeleteMutation.mutate([...checkedIds])
  }

  const allChecked = orders.length > 0 && checkedIds.size === orders.length
  const someChecked = checkedIds.size > 0 && checkedIds.size < orders.length

  const dueOrders = useMemo(() => {
    return orders.filter((o) => (o.dueAmount || 0) > 0)
  }, [orders])

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
      .replace(/{orderTime}/g, formatOrderTime(sample.orderTime) || '')
      .replace(/{partnerPrmId}/g, sample.partnerPrmId || '')
      .replace(/{paymentStatus}/g, sample.paymentStatus || ((sample.dueAmount || 0) > 0 ? 'due' : 'paid'))
  }, [messageTemplate, dueOrders, orders])

  const handleClearDateFilter = () => {
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const res = await partnerOrdersApi.listOrders({
        search,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        isExport: true,
        limit: 100000,
      })
      const allOrders = res.data?.data?.orders || []
      if (allOrders.length === 0) {
        toast.error('No orders found for the selected filters.')
        return
      }

      const headers = [
        'Order ID',
        'Order Date',
        'Order Time',
        'Partner Name',
        'Partner PRM ID',
        'Customer Mobile',
        'Order Amount (₹)',
        'Net Payable (₹)',
        'Paid Amount (₹)',
        'Due Amount (₹)',
        'Payment Status',
        'Created Date & Time',
      ]

      const rows = allOrders.map((o) => {
        const netPayable = Math.round(((o.orderAmount || 0) / 1.03) * 100) / 100
        const createdAt = o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : ''
        return [
          o.orderId || '',
          o.orderDate || '',
          formatOrderTime(o.orderTime),
          o.partnerName || '',
          o.partnerPrmId || '',
          o.partnerMobile || '',
          Number((o.orderAmount || 0).toFixed(2)),
          Number(netPayable.toFixed(2)),
          Number((o.paidAmount || 0).toFixed(2)),
          Number((o.dueAmount || 0).toFixed(2)),
          o.paymentStatus || '',
          createdAt,
        ]
      })

      const dateTag =
        startDate && endDate
          ? `_${startDate}_to_${endDate}`
          : startDate
          ? `_from_${startDate}`
          : endDate
          ? `_until_${endDate}`
          : ''
      const filename = `excel_orders${dateTag}_${new Date().toISOString().slice(0, 10)}.xlsx`

      exportToExcel([headers, ...rows], filename)
      toast.success(`Exported ${allOrders.length} orders to Excel!`)
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to export Excel')
    } finally {
      setIsExporting(false)
    }
  }

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

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-1.5 border-[#16A34A] text-[#16A34A] hover:bg-[#F0FDF4]"
          >
            {isExporting ? (
              <><RefreshCw size={14} className="animate-spin" /> Exporting...</>
            ) : (
              <><Download size={14} /> Export Excel</>
            )}
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
        <div className="p-4 border-b border-[#F1F5F9] bg-[#F8FAFC] flex flex-col gap-3">
          {/* Row 1: Search + Status + Refresh */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

          {/* Row 2: Date Range Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#64748B] font-medium">
              <Calendar size={14} className="text-[#2563EB]" />
              Filter by Created Date:
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <label className="text-[11px] text-[#94A3B8] font-medium whitespace-nowrap">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setPage(1)
                  }}
                  className="text-xs bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A]"
                />
              </div>
              <div className="flex items-center gap-1">
                <label className="text-[11px] text-[#94A3B8] font-medium whitespace-nowrap">To</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setPage(1)
                  }}
                  className="text-xs bg-white border border-[#CBD5E1] rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#2563EB] text-[#0F172A]"
                />
              </div>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleClearDateFilter}
                  className="flex items-center gap-1 text-[11px] text-[#DC2626] hover:text-[#B91C1C] font-medium px-2 py-1 rounded-md bg-[#FEE2E2] hover:bg-[#FECACA] transition-colors"
                >
                  <X size={11} />
                  Clear Dates
                </button>
              )}
              {(startDate || endDate) && (
                <span className="text-[11px] text-[#2563EB] font-medium bg-[#EFF6FF] px-2 py-1 rounded-full">
                  {startDate && endDate
                    ? `${startDate} → ${endDate}`
                    : startDate
                    ? `From ${startDate}`
                    : `Until ${endDate}`}
                </span>
              )}
            </div>
          </div>
        </div>

        {checkedIds.size > 0 && (
          <div className="px-4 py-2.5 border-b border-[#BFDBFE] bg-[#EFF6FF] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare2 size={16} className="text-[#2563EB]" />
              <span className="text-xs font-semibold text-[#1E40AF]">
                {checkedIds.size} order{checkedIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setCheckedIds(new Set())}
                className="text-[11px] text-[#64748B] hover:text-[#0F172A] underline mr-1"
              >
                Clear Selection
              </button>
              <Button
                variant="primary"
                size="sm"
                disabled={bulkMarkMutation.isPending || bulkDeleteMutation.isPending || notifyMutation.isPending}
                onClick={() => {
                  setSelectedOrderIds([...checkedIds])
                  setIsNotifyModalOpen(true)
                }}
                className="flex items-center gap-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] border-[#6D28D9]"
              >
                <Send size={13} />
                WhatsApp {checkedIds.size} Order{checkedIds.size > 1 ? 's' : ''}
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={bulkMarkMutation.isPending || bulkDeleteMutation.isPending}
                onClick={() => bulkMarkMutation.mutate([...checkedIds])}
                className="flex items-center gap-1.5 bg-[#16A34A] hover:bg-[#15803D] border-[#15803D]"
              >
                {bulkMarkMutation.isPending ? (
                  <><RefreshCw size={13} className="animate-spin" /> Marking Paid...</>
                ) : (
                  <><BadgeCheck size={14} /> Mark {checkedIds.size} as Paid</>
                )}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={bulkMarkMutation.isPending || bulkDeleteMutation.isPending}
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] border-[#B91C1C] text-white"
              >
                {bulkDeleteMutation.isPending ? (
                  <><RefreshCw size={13} className="animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={14} /> Delete {checkedIds.size} Selected</>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#64748B] font-semibold uppercase tracking-wider">
                <th className="py-3 px-3 w-10">
                  <button
                    type="button"
                    onClick={toggleAllRows}
                    className="flex items-center justify-center text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                    title={allChecked ? 'Deselect All' : 'Select All'}
                  >
                    {allChecked ? (
                      <CheckSquare2 size={16} />
                    ) : someChecked ? (
                      <CheckSquare2 size={16} className="opacity-50" />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Order ID</th>
                <th className="py-3 px-3">Order Date</th>
                <th className="py-3 px-3">Order Time</th>
                <th className="py-3 px-3">Partner Name</th>
                <th className="py-3 px-3">Partner PRM ID</th>
                <th className="py-3 px-3 text-right">Order Amount</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Due Amount</th>
                <th className="py-3 px-3">Customer Mobile</th>
                <th className="py-3 px-3">Created Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-[#334155]">
              {isLoadingOrders ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-[#2563EB]" size={24} />
                      <span>Loading imported orders...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-[#94A3B8]">
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
                  const isEditingPayment = editingPaymentId === order._id
                  const isDue = (order.dueAmount || 0) > 0
                  const isChecked = checkedIds.has(order._id)

                  return (
                    <tr
                      key={order._id}
                      className={`hover:bg-[#F8FAFC] transition-colors ${isChecked ? 'bg-[#EFF6FF]' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => toggleRow(order._id)}
                          className={`flex items-center justify-center transition-colors ${
                            isChecked ? 'text-[#2563EB]' : 'text-[#CBD5E1] hover:text-[#94A3B8]'
                          }`}
                        >
                          {isChecked ? <CheckSquare2 size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      {/* 1. Order ID */}
                      <td className="py-3 px-3 font-mono font-medium text-[#0F172A]">
                        {order.orderId}
                      </td>

                      {/* 2. Order Date */}
                      <td className="py-3 px-3 text-[#475569]">
                        {order.orderDate || '—'}
                      </td>

                      {/* 3. Order Time */}
                      <td className="py-3 px-3 text-[#475569] font-mono whitespace-nowrap">
                        {formatOrderTime(order.orderTime)}
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
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="text-right">
                              <span className="text-[#16A34A] font-semibold">
                                ₹{(order.paidAmount).toFixed(2)}
                              </span>
                              <div
                                className="text-[10px] text-[#2563EB] hover:text-[#1D4ED8] font-sans leading-tight mt-0.5 cursor-pointer hover:underline flex items-center justify-end gap-0.5"
                                onClick={() => handleOpenPaymentModal(order)}
                                title="Click to view complete payment receiving history"
                              >
                                <span>🕐</span>
                                <span className="whitespace-nowrap font-medium">
                                  {(order.paymentHistory || []).length > 1
                                    ? `${order.paymentHistory.length} payments`
                                    : (order.paymentHistory || []).length === 1
                                    ? formatDateTime(order.paymentHistory[0].receivedAt)
                                    : formatDateTime(order.updatedAt || order.createdAt)}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(order)}
                              className="text-[#94A3B8] hover:text-[#2563EB] p-0.5 rounded transition-colors"
                              title="Edit Paid Amount & View History"
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

                      {/* Customer Mobile — popup modal */}
                      <td className="py-3 px-3">
                        {order.partnerMobile ? (
                          <div className="flex items-center gap-1.5 group">
                            <Smartphone size={13} className="text-[#16A34A] shrink-0" />
                            <span className="font-mono text-xs text-[#0F172A]">
                              +91 {order.partnerMobile}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenMobileModal(order)}
                              className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-[#2563EB] transition-opacity p-0.5"
                              title="Edit mobile for this PRM ID"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenMobileModal(order)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded border border-dashed border-[#CBD5E1] text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                          >
                            <Smartphone size={11} />
                            + Add Mobile
                          </button>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-3 text-[#64748B] whitespace-nowrap text-xs">
                        {formatDateTime(order.createdAt)}
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
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenPaymentModal(order)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                              (order.paidAmount || 0) > 0
                                ? 'bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] border-[#BBF7D0]'
                                : 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] border-[#BFDBFE]'
                            }`}
                            title="View Payment History & Edit Amount"
                          >
                            <Wallet size={12} />
                            {(order.paidAmount || 0) > 0 ? 'Pay & History' : 'Edit Pay'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteOrder(order)}
                            className="inline-flex items-center justify-center p-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] border border-[#FECACA] text-[11px] transition-colors"
                            title="Delete this order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          pagination={{
            page,
            limit,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || pagination.pages || 1,
          }}
          onPageChange={setPage}
        />
      </Card>

      {/* ========================================================= */}
      {/* DELETE SINGLE ORDER MODAL */}
      {/* ========================================================= */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => {
          if (!deleteOrderMutation.isPending) {
            setIsDeleteModalOpen(false)
            setDeleteTargetOrder(null)
          }
        }}
        title="Delete Order"
        size="sm"
      >
        {deleteTargetOrder && (
          <div className="space-y-4">
            <p className="text-sm text-[#475569]">
              Are you sure you want to delete order <span className="font-mono font-bold text-[#0F172A]">#{deleteTargetOrder.orderId}</span> for partner <span className="font-semibold text-[#0F172A]">{deleteTargetOrder.partnerName}</span>?
            </p>
            <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B] space-y-1">
              <div className="flex justify-between">
                <span>Order Amount:</span>
                <span className="font-mono font-bold">₹{deleteTargetOrder.orderAmount?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Due Amount:</span>
                <span className="font-mono font-bold">₹{deleteTargetOrder.dueAmount?.toFixed(2)}</span>
              </div>
              <p className="pt-1 text-[11px] text-[#DC2626]">
                ⚠️ This transaction will be permanently removed from the system.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setDeleteTargetOrder(null)
                }}
                disabled={deleteOrderMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDeleteOrder}
                disabled={deleteOrderMutation.isPending}
                className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] border-[#B91C1C] text-white"
              >
                {deleteOrderMutation.isPending ? (
                  <><RefreshCw size={13} className="animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={13} /> Delete Order</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================= */}
      {/* BULK DELETE ORDERS MODAL */}
      {/* ========================================================= */}
      <Modal
        open={isBulkDeleteModalOpen}
        onClose={() => {
          if (!bulkDeleteMutation.isPending) {
            setIsBulkDeleteModalOpen(false)
          }
        }}
        title="Delete Selected Orders"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#475569]">
            Are you sure you want to permanently delete <span className="font-bold text-[#DC2626]">{checkedIds.size}</span> selected order(s)?
          </p>
          <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#991B1B]">
            ⚠️ This action cannot be undone. All selected transactions will be permanently deleted from the database.
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              disabled={bulkDeleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="flex items-center gap-1.5 bg-[#DC2626] hover:bg-[#B91C1C] border-[#B91C1C] text-white"
            >
              {bulkDeleteMutation.isPending ? (
                <><RefreshCw size={13} className="animate-spin" /> Deleting {checkedIds.size} Orders...</>
              ) : (
                <><Trash2 size={13} /> Delete {checkedIds.size} Orders</>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isMobileModalOpen}
        onClose={() => {
          if (!mobileMutation.isPending) {
            setIsMobileModalOpen(false)
            setMobileModalOrder(null)
          }
        }}
        title="Add / Update Customer Mobile"
        size="sm"
      >
        {mobileModalOrder && (
          <form onSubmit={handleSaveMobileModal} className="space-y-4">
            <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Partner Name</span>
                <span className="font-medium text-[#0F172A] truncate max-w-[180px]">{mobileModalOrder.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">PRM ID</span>
                <span className="font-mono font-semibold text-[#0F172A]">{mobileModalOrder.partnerPrmId}</span>
              </div>
              {mobileModalOrder.partnerMobile && (
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Current Mobile</span>
                  <span className="font-mono text-[#16A34A] font-semibold">+91 {mobileModalOrder.partnerMobile}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                {mobileModalOrder.partnerMobile ? 'Update Mobile Number' : 'Enter Mobile Number'}
              </label>
              <p className="text-[11px] text-[#64748B] mb-2">
                This number will be saved for all orders of PRM ID <b>{mobileModalOrder.partnerPrmId}</b>.
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobileModalVal}
                  onChange={(e) => setMobileModalVal(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full pl-12 pr-3 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsMobileModalOpen(false)
                  setMobileModalOrder(null)
                }}
                disabled={mobileMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={mobileMutation.isPending || mobileModalVal.trim().length === 0}
                className="flex items-center gap-1.5"
              >
                {mobileMutation.isPending ? (
                  <><RefreshCw size={13} className="animate-spin" /> Saving...</>
                ) : (
                  <><Smartphone size={13} /> Save Mobile</>
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={isPaymentModalOpen}
        onClose={() => {
          if (!paymentMutation.isPending) {
            setIsPaymentModalOpen(false)
            setPaymentModalOrder(null)
          }
        }}
        title={paymentModalOrder?.paidAmount > 0 ? "Payment & Receiving History" : "Record Payment Amount"}
        size="md"
      >
        {paymentModalOrder && (() => {
          const NOTES = [2000, 500, 200, 100, 50, 20, 10]
          const COINS = [5, 2, 1]
          const denomTotal = [...NOTES, ...COINS].reduce((sum, d) => {
            const cnt = parseInt(denominations[d] || '0', 10)
            return sum + (isNaN(cnt) ? 0 : cnt * d)
          }, 0)
          const hasDenomInput = [...NOTES, ...COINS].some((d) => parseInt(denominations[d] || '0', 10) > 0)
          const netPayable = Math.round(((paymentModalOrder.orderAmount || 0) / 1.03) * 100) / 100
          const currentPaidAmt = parseFloat(paymentModalAmount || '0') || 0
          const remDue = Math.max(0, Math.round((netPayable - currentPaidAmt) * 100) / 100)

          const rawHistory = paymentModalOrder.paymentHistory || []
          const historyList = rawHistory.length > 0
            ? rawHistory
            : ((paymentModalOrder.paidAmount || 0) > 0
                ? [{
                    receivedAmount: paymentModalOrder.paidAmount,
                    paidBefore: 0,
                    paidAfter: paymentModalOrder.paidAmount,
                    dueAfter: paymentModalOrder.dueAmount || 0,
                    receivedAt: paymentModalOrder.updatedAt || paymentModalOrder.createdAt,
                    note: 'Initial payment recorded',
                  }]
                : [])

          const handleDenomChange = (denom, val) => {
            const next = { ...denominations, [denom]: val }
            setDenominations(next)
            const total = [...NOTES, ...COINS].reduce((sum, d) => {
              const cnt = parseInt(next[d] || '0', 10)
              return sum + (isNaN(cnt) ? 0 : cnt * d)
            }, 0)
            if (total > 0) setPaymentModalAmount(String(total))
          }

          return (
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
                <div className="flex justify-between">
                  <span className="text-[#64748B]">Net Payable (excl. 3% interest)</span>
                  <span className="font-mono font-bold text-[#2563EB]">₹{netPayable.toFixed(2)}</span>
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

              {/* Payment History Timeline */}
              <div className="p-3 bg-white border border-[#CBD5E1] rounded-lg shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1.5">
                    <span>🕐 Payment Receiving History</span>
                  </p>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${historyList.length > 0 ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                    {historyList.length} record{historyList.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {historyList.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {[...historyList].reverse().map((h, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px]">
                        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${h.receivedAmount > 0 ? 'bg-[#16A34A]' : h.receivedAmount < 0 ? 'bg-[#DC2626]' : 'bg-[#94A3B8]'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className={`font-mono font-bold ${h.receivedAmount > 0 ? 'text-[#16A34A]' : h.receivedAmount < 0 ? 'text-[#DC2626]' : 'text-[#475569]'}`}>
                              {h.receivedAmount > 0 ? '+' : ''}₹{Math.abs(h.receivedAmount).toFixed(2)}
                            </span>
                            <span className="text-[#0F172A] font-medium text-[10px]">{formatDateTime(h.receivedAt)}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[#64748B]">
                            <span>Paid Total: <b className="text-[#0F172A]">₹{(h.paidAfter || 0).toFixed(2)}</b></span>
                            <span>•</span>
                            <span>Remaining Due: <b className={(h.dueAfter || 0) > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}>₹{(h.dueAfter || 0).toFixed(2)}</b></span>
                            {h.note && (
                              <>
                                <span>•</span>
                                <span className="italic text-[#64748B]">{h.note}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#64748B] italic py-1">
                    No payment received yet for this order. When you record a payment, the exact date, time, and received amount will appear here.
                  </p>
                )}
              </div>

              {/* ── Cash Denomination Calculator ─────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">💵 Cash Denominations</p>
                  {hasDenomInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
                        setPaymentModalAmount('')
                      }}
                      className="text-[10px] text-[#DC2626] hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {/* Notes */}
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Notes</p>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {NOTES.map((d) => (
                    <div key={d} className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-center font-bold text-[#475569] bg-[#F1F5F9] rounded px-1 py-0.5 border border-[#E2E8F0]">₹{d}</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={denominations[d]}
                        onChange={(e) => handleDenomChange(d, e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-xs font-mono border border-[#CBD5E1] rounded-md px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                      />
                      {parseInt(denominations[d] || '0', 10) > 0 && (
                        <span className="text-[9px] text-center text-[#7C3AED] font-mono font-semibold">
                          ₹{(parseInt(denominations[d]) * d).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Coins */}
                <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">Coins</p>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {COINS.map((d) => (
                    <div key={d} className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-center font-bold text-[#475569] bg-[#FEF3C7] rounded px-1 py-0.5 border border-[#FDE68A]">₹{d}</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={denominations[d]}
                        onChange={(e) => handleDenomChange(d, e.target.value)}
                        placeholder="0"
                        className="w-full text-center text-xs font-mono border border-[#CBD5E1] rounded-md px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]"
                      />
                      {parseInt(denominations[d] || '0', 10) > 0 && (
                        <span className="text-[9px] text-center text-[#D97706] font-mono font-semibold">
                          ₹{(parseInt(denominations[d]) * d).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ))}
                  {/* spacer */}
                  <div />
                </div>

                {/* Denomination Total Banner */}
                {hasDenomInput && (
                  <div className="flex items-center justify-between p-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={14} className="text-[#2563EB]" />
                      <span className="text-xs font-bold text-[#1E40AF]">Cash Total</span>
                    </div>
                    <span className="text-sm font-mono font-extrabold text-[#2563EB]">₹{denomTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider mb-2">Quick Presets</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const fullPayable = Math.round(((paymentModalOrder.orderAmount || 0) / 1.03) * 100) / 100
                      setPaymentModalAmount(String(fullPayable))
                      setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
                    }}
                    className="flex flex-col items-center px-2 py-2 rounded-lg bg-[#DCFCE7] border border-[#86EFAC] text-[#16A34A] hover:bg-[#BBF7D0] transition-colors"
                  >
                    <CheckCircle2 size={15} />
                    <span className="text-[10px] font-bold mt-1">Full Paid</span>
                    <span className="text-[9px] font-mono">₹{(Math.round(((paymentModalOrder.orderAmount || 0) / 1.03) * 100) / 100).toFixed(2)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const halfPayable = Math.round((((paymentModalOrder.orderAmount || 0) / 1.03) / 2) * 100) / 100
                      setPaymentModalAmount(String(halfPayable))
                      setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
                    }}
                    className="flex flex-col items-center px-2 py-2 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706] hover:bg-[#FDE68A] transition-colors"
                  >
                    <AlertCircle size={15} />
                    <span className="text-[10px] font-bold mt-1">Half Paid</span>
                    <span className="text-[9px] font-mono">₹{(Math.round((((paymentModalOrder.orderAmount || 0) / 1.03) / 2) * 100) / 100).toFixed(2)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalAmount('0')
                      setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
                    }}
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
                  Total Paid Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[#64748B]">₹</span>
                  <input
                    type="number"
                    min="0"
                    max={Math.round(((paymentModalOrder.orderAmount || 0) / 1.03) * 100) / 100}
                    step="any"
                    value={paymentModalAmount}
                    onChange={(e) => {
                      setPaymentModalAmount(e.target.value)
                      // Clear denom inputs when manually typing
                      setDenominations({ 2000: '', 500: '', 200: '', 100: '', 50: '', 20: '', 10: '', 5: '', 2: '', 1: '' })
                    }}
                    className="w-full pl-8 pr-3 py-2.5 text-sm font-mono border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                    placeholder="0.00"
                    autoFocus={!hasDenomInput}
                  />
                </div>

                {/* Live remaining due preview */}
                {paymentModalAmount !== '' && !isNaN(parseFloat(paymentModalAmount)) && (
                  <div className="mt-2 p-2 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex justify-between text-xs">
                    <span className="text-[#64748B]">Remaining Due after save:</span>
                    <span className={`font-mono font-bold ${remDue > 0 ? 'text-[#DC2626]' : 'text-[#16A34A]'}`}>
                      ₹{remDue.toFixed(2)}
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
          )
        })()}
      </Modal>


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
                '{paymentStatus}',
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
              {selectedOrderIds.length > 0 ? (
                <p className="text-[#64748B] text-[11px] mt-0.5">
                  Selected Orders: <b>{selectedOrderIds.length}</b>{' '}
                  <span className="text-[#7C3AED] font-medium">(custom selection)</span>
                </p>
              ) : (
                <p className="text-[#64748B] text-[11px] mt-0.5">
                  Total Orders with Due: <b>{summary.dueOrdersCount}</b> • Total Due:{' '}
                  <b className="text-[#DC2626]">₹{summary.totalDue.toFixed(2)}</b>
                </p>
              )}
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
