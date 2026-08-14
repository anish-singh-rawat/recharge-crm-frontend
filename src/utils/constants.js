export const RECHARGE_TYPES = [
  { value: 'MOBILE_PREPAID', label: 'Mobile Prepaid' },
  { value: 'MOBILE_POSTPAID', label: 'Mobile Postpaid' },
]

export const TRANSACTION_STATUSES = [
  'INITIATED',
  'PENDING',
  'PROCESSING',
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'REVERSED',
  'TIMEOUT',
]

export const WALLET_STATUSES = ['ACTIVE', 'FROZEN', 'SUSPENDED', 'CLOSED']

export const NOTIFICATION_TYPES = ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ALERT']

export const USER_ROLES = [
  { value: 'retailer', label: 'Retailer' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
]

export const STATUS_COLORS = {
  SUCCESS: { bg: '#DCFCE7', text: '#16A34A' },
  FAILED: { bg: '#FEE2E2', text: '#DC2626' },
  TIMEOUT: { bg: '#FEE2E2', text: '#DC2626' },
  PENDING: { bg: '#FEF3C7', text: '#D97706' },
  PROCESSING: { bg: '#FEF3C7', text: '#D97706' },
  INITIATED: { bg: '#DBEAFE', text: '#2563EB' },
  REFUNDED: { bg: '#CFFAFE', text: '#0891B2' },
  REVERSED: { bg: '#CFFAFE', text: '#0891B2' },
  ACTIVE: { bg: '#DCFCE7', text: '#16A34A' },
  FROZEN: { bg: '#DBEAFE', text: '#2563EB' },
  SUSPENDED: { bg: '#FEE2E2', text: '#DC2626' },
  CLOSED: { bg: '#F1F5F9', text: '#475569' },
  INFO: { bg: '#DBEAFE', text: '#2563EB' },
  WARNING: { bg: '#FEF3C7', text: '#D97706' },
  ERROR: { bg: '#FEE2E2', text: '#DC2626' },
  ALERT: { bg: '#FEE2E2', text: '#DC2626' },
}

export const NOTIFICATION_TYPE_COLORS = {
  INFO: { bg: '#DBEAFE', text: '#2563EB' },
  SUCCESS: { bg: '#DCFCE7', text: '#16A34A' },
  WARNING: { bg: '#FEF3C7', text: '#D97706' },
  ERROR: { bg: '#FEE2E2', text: '#DC2626' },
  ALERT: { bg: '#FEE2E2', text: '#DC2626' },
}

export const PERMISSIONS = [
  'recharge:initiate',
  'recharge:read',
  'wallet:read',
  'wallet:credit',
  'wallet:debit',
  'users:read',
  'users:write',
  'reports:read',
]
