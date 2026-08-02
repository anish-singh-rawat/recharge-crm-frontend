import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0'
  return new Intl.NumberFormat('en-IN').format(num)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy')
  } catch {
    return '—'
  }
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return '—'
  }
}

export const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '—'
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return '—'
  }
}

export const truncate = (str, length = 20) => {
  if (!str) return ''
  return str.length > length ? str.slice(0, length) + '...' : str
}

export const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.slice(0, 2) + '******' + phone.slice(-2)
}

export const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export const extractError = (error) => {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }
  if (error?.response?.data?.errors?.length) {
    return error.response.data.errors.map((e) => e.message).join(', ')
  }
  if (error?.message) return error.message
  return 'Something went wrong'
}

export const extractFieldErrors = (error) => {
  const errors = error?.response?.data?.errors
  if (!errors?.length) return {}
  return errors.reduce((acc, e) => {
    if (e.field) acc[e.field] = e.message
    return acc
  }, {})
}
