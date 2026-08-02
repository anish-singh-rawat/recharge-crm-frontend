const ROLE_PERMISSIONS = {
  retailer: [
    'auth:login', 'auth:logout', 'auth:refresh', 'auth:change_password',
    'auth:forgot_password', 'wallet:read', 'wallet:statement', 'wallet:ledger',
    'recharge:initiate', 'recharge:read', 'recharge:list', 'recharge:status',
    'operator:read', 'operator:list', 'circle:read', 'circle:list',
    'plan:read', 'plan:list', 'notification:read', 'report:recharge', 'report:wallet',
  ],
  admin: [
    'auth:login', 'auth:logout', 'auth:refresh', 'auth:change_password',
    'auth:forgot_password', 'wallet:read', 'wallet:statement', 'wallet:ledger',
    'recharge:initiate', 'recharge:read', 'recharge:list', 'recharge:status',
    'operator:read', 'operator:list', 'circle:read', 'circle:list',
    'plan:read', 'plan:list', 'notification:read', 'report:recharge', 'report:wallet',
    'retailer:create', 'retailer:read', 'retailer:update', 'retailer:delete', 'retailer:list',
    'user:read', 'user:list', 'user:block', 'user:unblock',
    'wallet:credit', 'wallet:debit', 'wallet:freeze', 'wallet:unfreeze',
    'recharge:retry', 'recharge:refund',
    'operator:create', 'operator:update', 'circle:create', 'circle:update',
    'plan:create', 'plan:update',
    'report:sales', 'report:commission',
    'notification:create', 'notification:broadcast',
    'api_key:create', 'api_key:read', 'api_key:revoke', 'api_key:list',
    'settings:read',
    'log:activity', 'log:audit', 'log:api', 'log:webhook',
    'provider:read', 'provider:balance',
  ],
  super_admin: ['*'],
}

export const can = (user, permission) => {
  if (!user) return false
  const role = user.role || ''
  const rolePerms = ROLE_PERMISSIONS[role] || []
  if (rolePerms.includes('*')) return true
  const userPerms = user.permissions || []
  return rolePerms.includes(permission) || userPerms.includes(permission)
}
