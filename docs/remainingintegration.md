# Remaining API Integration Guide

APIs present in the backend but not covered in `docs/integration.md`.

---

## Base URL

```
Development:  http://localhost:8080/api/v1
Production:   https://your-domain.com/api/v1
```

---

## 1. Health Endpoints (detailed)

The integration doc lists the three health routes but omits their full response shapes.

### GET /ping

**Auth:** None  
**Purpose:** Liveness probe — confirm the server process is running.

Response:
```json
{
  "success": true,
  "message": "pong",
  "data": { "timestamp": "2026-08-02T10:00:00.000Z" }
}
```

### GET /health

**Auth:** None  
**Purpose:** Readiness probe with DB connectivity and memory stats. Returns HTTP 503 if DB is disconnected.

Response:
```json
{
  "success": true,
  "message": "Service is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-08-02T10:00:00.000Z",
    "uptime": 3600.5,
    "environment": "development",
    "database": {
      "status": "CONNECTED",
      "readyState": 1,
      "host": "localhost",
      "name": "rechargecrmdb"
    },
    "memory": {
      "heapUsed": "45MB",
      "heapTotal": "64MB",
      "rss": "80MB"
    }
  }
}
```

**Use on frontend:** Poll this endpoint on app start. If `status` is `DOWN`, show a maintenance/error page.

---

### GET /version

**Auth:** None  
**Purpose:** Returns app name, version, and Node.js runtime info.

Response:
```json
{
  "success": true,
  "message": "Version info",
  "data": {
    "name": "RechargeCRM",
    "version": "1.0.0",
    "nodeVersion": "v20.11.0",
    "environment": "development",
    "timestamp": "2026-08-02T10:00:00.000Z"
  }
}
```

---

## 2. Users — Missing Detail

### GET /users

**Auth:** Bearer — Admin / Super Admin (`USER_LIST` permission)  
**Purpose:** Paginated list of all users. Supports filtering by role, status, and text search.

Query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |
| `role` | string | Filter: `retailer`, `admin`, `super_admin` |
| `isActive` | boolean | Filter by active status |
| `search` | string | Search name, email, or phone |
| `startDate` | ISO date | Created after |
| `endDate` | ISO date | Created before |

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "name": "Rahul Sharma",
      "email": "rahul@example.com",
      "phone": "9876543210",
      "role": "retailer",
      "isActive": true,
      "isBlocked": false,
      "businessName": "Sharma Telecom",
      "commissionRate": 0.02,
      "wallet": "WALLET_ID",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 50, "totalPages": 3, "hasNext": true, "hasPrev": false }
}
```

**Use on frontend:** Admin user management table. Combine `role=retailer` filter for the retailer list page.

---

### POST /users

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Admin creates a new user (retailer or admin). Same logic as `/auth/register` but called by an admin on behalf of someone else.

Request body:
```json
{
  "name": "Priya Patel",
  "email": "priya@example.com",
  "phone": "9123456789",
  "password": "Welcome@123",
  "role": "retailer",
  "businessName": "Patel Recharge",
  "commissionRate": 0.02
}
```

Response `data`: `{ "user": { ...userObject } }`  
HTTP: `201 Created`

---

### PUT /users/:id

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Update any user's name, business name, commission rate, active status, or custom permissions.

Request body (all fields optional):
```json
{
  "name": "Updated Name",
  "businessName": "New Shop Name",
  "commissionRate": 0.03,
  "isActive": true,
  "permissions": ["recharge:initiate", "wallet:read"]
}
```

Response `data`: `{ "user": { ...updatedUserObject } }`

---

### DELETE /users/:id

**Auth:** Bearer — Super Admin only  
**Purpose:** Soft-delete a user. The user's record is marked inactive, not removed from the database.

Response:
```json
{ "success": true, "message": "User deleted successfully", "data": {} }
```

**Use on frontend:** Show in user detail page under a danger zone section. Requires confirmation modal. Only render for `super_admin` role.

---

## 3. Wallet — Missing Detail

### GET /wallet/me

**Auth:** Bearer — Retailer (`WALLET_READ` permission)  
**Purpose:** Fetch own wallet balance and status.

Response `data`:
```json
{
  "wallet": {
    "_id": "...",
    "user": "USER_ID",
    "balance": 1500.00,
    "totalCredited": 5000.00,
    "totalDebited": 3500.00,
    "status": "ACTIVE",
    "limit": 100000,
    "currency": "INR",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

Wallet status values: `ACTIVE` | `FROZEN` | `SUSPENDED` | `CLOSED`

**Use on frontend:** Show balance in retailer sidebar/header. Refresh on `wallet:update` Socket.IO event.

---

### GET /wallet/me/statement

**Auth:** Bearer — Retailer (`WALLET_STATEMENT` permission)  
**Purpose:** Paginated transaction history for own wallet.

Query params: `page`, `limit`, `startDate`, `endDate`

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "wallet": "WALLET_ID",
      "type": "CREDIT",
      "amount": 1000,
      "balanceBefore": 500,
      "balanceAfter": 1500,
      "description": "Manual top-up",
      "remarks": "Admin credited",
      "referenceId": null,
      "performedBy": "ADMIN_USER_ID",
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 35, "totalPages": 2, "hasNext": true, "hasPrev": false }
}
```

Transaction type values: `CREDIT` | `DEBIT` | `REFUND` | `REVERSAL` | `COMMISSION` | `SETTLEMENT`

**Use on frontend:** Wallet statement / passbook page for retailers.

---

### POST /wallet/:userId/debit

**Auth:** Bearer — Admin / Super Admin (`WALLET_DEBIT` permission)  
**Purpose:** Manually debit an amount from a retailer's wallet. Used for charge-backs or penalty deductions.

Request body:
```json
{
  "amount": 500,
  "description": "Chargeback for failed transaction",
  "remarks": "Reference TXN123456"
}
```

Field rules:
- `amount`: required, min 1, max 1000000
- `description`: required, max 500 chars
- `remarks`: optional, max 500 chars

Response `data`: `{ "wallet": { ...updatedWallet }, "transaction": { ...ledgerEntry } }`

---

### GET /wallet/ledger

**Auth:** Bearer — Admin / Super Admin (`WALLET_LEDGER` permission)  
**Purpose:** All wallet transactions across all users. Used for financial reconciliation.

Query params: `page`, `limit`, `startDate`, `endDate`

Response `data`: paginated list of wallet transaction objects (same shape as statement items above, with a populated `wallet` field pointing to the user).

**Use on frontend:** Admin finance/ledger page.

---

### GET /wallet/:userId

**Auth:** Bearer — Admin / Super Admin (`WALLET_READ` permission)  
**Purpose:** Get a specific retailer's wallet balance and status.

Response `data`: `{ "wallet": { ...walletObject } }` — same shape as `/wallet/me`.

---

### GET /wallet/:userId/statement

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Transaction history for a specific user's wallet. Same shape as `/wallet/me/statement`.

Query params: `page`, `limit`, `startDate`, `endDate`

---

### PATCH /wallet/:userId/unfreeze

**Auth:** Bearer — Admin / Super Admin (`WALLET_UNFREEZE` permission)  
**Purpose:** Restore a frozen wallet back to `ACTIVE` status.

Request body (optional):
```json
{ "reason": "Issue resolved" }
```

Response `data`: `{ "wallet": { ...updatedWallet } }`

**Use on frontend:** Unfreeze button on wallet detail page. Only show when wallet status is `FROZEN`.

---

## 4. Recharge — Missing Detail

### GET /recharge/all

**Auth:** Bearer — Admin / Super Admin (`RECHARGE_LIST` permission)  
**Purpose:** Paginated list of all recharge transactions across all retailers.

Query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `status` | string | Filter by status |
| `type` | string | Filter by recharge type |
| `operatorId` | MongoId | Filter by operator |
| `userId` | MongoId | Filter by retailer |
| `startDate` | ISO date | From date |
| `endDate` | ISO date | To date |

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "txnId": "TXN17856...",
      "user": { "_id": "...", "name": "Rahul Sharma", "phone": "9876543210" },
      "mobileNumber": "9000000001",
      "amount": 199,
      "operator": { "_id": "...", "name": "Airtel", "code": "AIRTEL" },
      "circle": { "_id": "...", "name": "Maharashtra", "code": "MH" },
      "type": "MOBILE_PREPAID",
      "status": "SUCCESS",
      "providerTxnId": "PROV123",
      "commission": 3.98,
      "commissionRate": 0.02,
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 200, "totalPages": 10, "hasNext": true, "hasPrev": false }
}
```

**Use on frontend:** Admin transactions table with status/date/operator filter controls.

---

### GET /recharge/admin/status/:txnId

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Get full status of any transaction by `txnId`. Unlike `/recharge/status/:txnId` (retailer version), this is not restricted to own transactions.

Response `data`: `{ "transaction": { ...fullTransactionObject } }`

---

### POST /recharge/:txnId/retry

**Auth:** Bearer — Admin / Super Admin (`RECHARGE_RETRY` permission)  
**Purpose:** Manually retry a failed or timed-out recharge. Only applicable when status is `FAILED` or `TIMEOUT`.

Request body: none required  
Response `data`: `{ "transaction": { ...updatedTransaction } }`

**Use on frontend:** Retry button on the admin transaction detail page. Only show when `status === 'FAILED' || status === 'TIMEOUT'`.

---

## 5. Operators, Circles & Plans — Missing Detail

### GET /operators/active

**Auth:** Bearer — Any authenticated user  
**Purpose:** Returns only active operators. Accepts optional `type` query param to filter by recharge type. This is the endpoint to call when building the recharge form operator dropdown.

Query param: `type` (optional) — one of the recharge type values

Response `data`:
```json
{
  "operators": [
    {
      "_id": "...",
      "name": "Airtel",
      "code": "AIRTEL",
      "type": "MOBILE_PREPAID",
      "minAmount": 10,
      "maxAmount": 5000,
      "commission": 2
    }
  ]
}
```

---

### POST /operators

**Auth:** Bearer — Admin / Super Admin (`OPERATOR_CREATE` permission)  
**Purpose:** Create a new operator in the local database.

Request body:
```json
{
  "name": "Airtel",
  "code": "AIRTEL",
  "type": "MOBILE_PREPAID",
  "providerCode": "AIRTEL",
  "minAmount": 10,
  "maxAmount": 5000,
  "commission": 2,
  "isActive": true
}
```

Field rules:
- `name`: required, max 100 chars
- `code`: required, alphanumeric, auto-uppercased
- `type`: required, must be a valid recharge type
- `commission`: optional, 0–100 (percentage)

Response `data`: `{ "operator": { ...operatorObject } }` — HTTP `201 Created`

---

### PUT /operators/:id

**Auth:** Bearer — Admin / Super Admin (`OPERATOR_UPDATE` permission)  
**Purpose:** Update an existing operator's details.

Request body (all optional):
```json
{
  "name": "Airtel Updated",
  "providerCode": "AIRTEL2",
  "minAmount": 20,
  "maxAmount": 4000,
  "commission": 2.5,
  "isActive": true
}
```

---

### DELETE /operators/:id

**Auth:** Bearer — Admin / Super Admin (`OPERATOR_DELETE` permission)  
**Purpose:** Soft-deactivate an operator (sets `isActive: false`). Does not delete the record.

Response: `{ "success": true, "message": "Operator deactivated successfully", "data": {} }`

---

### POST /operators/circles

**Auth:** Bearer — Admin / Super Admin (`CIRCLE_CREATE` permission)  
**Purpose:** Create a telecom circle (geographic zone).

Request body:
```json
{
  "name": "Maharashtra",
  "code": "MH",
  "providerCode": "MH",
  "isActive": true
}
```

Field rules: `name` and `code` required; `code` must be alphanumeric, auto-uppercased.

Response `data`: `{ "circle": { ...circleObject } }` — HTTP `201 Created`

---

### GET /operators/circles/:id

**Auth:** Bearer — Any  
**Purpose:** Get a single circle by its MongoDB ID.

Response `data`: `{ "circle": { "_id": "...", "name": "Maharashtra", "code": "MH", "isActive": true } }`

---

### PUT /operators/circles/:id

**Auth:** Bearer — Admin / Super Admin (`CIRCLE_UPDATE` permission)  
**Purpose:** Update a circle's name, providerCode, or active status.

Request body (all optional):
```json
{ "name": "Updated Name", "providerCode": "MH2", "isActive": false }
```

---

### POST /operators/plans

**Auth:** Bearer — Admin / Super Admin (`PLAN_CREATE` permission)  
**Purpose:** Create a recharge plan linked to an operator and circle.

Request body:
```json
{
  "operator": "OPERATOR_MONGO_ID",
  "circle": "CIRCLE_MONGO_ID",
  "amount": 239,
  "talktime": 239,
  "validity": "28 days",
  "description": "Unlimited calls + 1.5GB/day",
  "dataAmount": "42GB",
  "planType": "DATA",
  "isActive": true,
  "isPopular": false
}
```

Response `data`: `{ "plan": { ...planObject } }` — HTTP `201 Created`

---

### PUT /operators/plans/:id

**Auth:** Bearer — Admin / Super Admin (`PLAN_UPDATE` permission)  
**Purpose:** Update an existing plan.

Request body (all optional):
```json
{
  "amount": 249,
  "validity": "30 days",
  "description": "Updated plan",
  "isActive": true,
  "isPopular": true
}
```

---

### DELETE /operators/plans/:id

**Auth:** Bearer — Admin / Super Admin (`PLAN_DELETE` permission)  
**Purpose:** Soft-deactivate a plan.

Response: `{ "success": true, "message": "Plan deactivated successfully", "data": {} }`

---

### GET /operators/plans

**Auth:** Bearer — Any (`PLAN_LIST` permission)  
**Purpose:** Paginated plans list. Supports filtering by operator, circle, amount range, and active status.

Query params:

| Param | Type | Description |
|---|---|---|
| `operator` | MongoId | Filter by operator |
| `circle` | MongoId | Filter by circle |
| `isActive` | boolean | Filter by active status |
| `minAmount` | number | Min plan amount |
| `maxAmount` | number | Max plan amount |
| `page` | number | Page |
| `limit` | number | Items per page |

---

## 6. Reports — Missing Detail

### GET /reports/dashboard

**Auth:** Bearer — Any role  
**Purpose:** Role-scoped dashboard statistics. Retailers only see their own data; admins see system-wide data.

Response `data` (retailer):
```json
{
  "today": {
    "totalTransactions": 5,
    "totalAmount": 995,
    "successCount": 4,
    "failedCount": 1
  },
  "allTime": {
    "totalTransactions": 320,
    "totalAmount": 64000,
    "totalCommission": 1280
  },
  "statusBreakdown": [
    { "_id": "SUCCESS", "count": 300, "amount": 60000 },
    { "_id": "FAILED", "count": 20, "amount": 4000 }
  ]
}
```

Response `data` (admin) adds:
```json
{
  "totalUsers": 45,
  "totalRetailers": 40,
  "activeWallets": 38,
  "totalWalletBalance": 150000
}
```

**Use on frontend:** Stat cards at the top of the dashboard page. Check `req.user.role` at render time to show/hide admin-only stats.

---

### GET /reports/recharge/my

**Auth:** Bearer — Retailer (`REPORT_RECHARGE` permission)  
**Purpose:** Retailer's own recharge report with filters.

Query params: `page`, `limit`, `startDate`, `endDate`, `status`, `type`, `operatorId`

Response `data`: Paginated list of own recharge transactions.

**Use on frontend:** Retailer "My Reports" page with date-range picker and status filter.

---

### GET /reports/wallet/my

**Auth:** Bearer — Retailer (`REPORT_WALLET` permission)  
**Purpose:** Retailer's own wallet transaction report.

Query params: `page`, `limit`, `startDate`, `endDate`, `type` (CREDIT/DEBIT/REFUND/REVERSAL/COMMISSION/SETTLEMENT)

Response `data`: Paginated wallet transactions for own account only.

---

### GET /reports/sales

**Auth:** Bearer — Admin / Super Admin (`REPORT_SALES` permission)  
**Purpose:** Full sales report with summary totals and paginated transaction list.

Query params: `page`, `limit`, `startDate`, `endDate`, `userId`, `groupBy` (day/week/month)

Response `data`:
```json
{
  "summary": {
    "totalTransactions": 1200,
    "totalAmount": 240000,
    "totalSuccess": 1150,
    "totalFailed": 50,
    "totalCommission": 4800
  },
  "items": [ ...rechargeTransactions ],
  "pagination": { ... }
}
```

**Use on frontend:** Admin sales report page with date range, CSV export trigger.

---

### GET /reports/sales/by-day

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Daily aggregated sales totals. Used for line/bar charts on admin dashboard.

Query params: `startDate`, `endDate`

Response `data`:
```json
{
  "report": [
    { "_id": "2026-08-01", "count": 45, "amount": 9000, "successCount": 43 },
    { "_id": "2026-08-02", "count": 52, "amount": 10400, "successCount": 51 }
  ]
}
```

**Use on frontend:** Line chart showing daily sales trend on admin dashboard.

---

### GET /reports/sales/by-operator

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Sales grouped by operator. Used for pie/bar chart on admin dashboard.

Query params: `startDate`, `endDate`

Response `data`:
```json
{
  "report": [
    { "_id": "AIRTEL_OPERATOR_ID", "operatorName": "Airtel", "count": 320, "amount": 64000 },
    { "_id": "JIO_OPERATOR_ID", "operatorName": "Jio", "count": 280, "amount": 55000 }
  ]
}
```

---

### GET /reports/recharge

**Auth:** Bearer — Admin / Super Admin (`REPORT_RECHARGE` permission)  
**Purpose:** Admin-level recharge report with full filtering across all retailers.

Query params: `page`, `limit`, `startDate`, `endDate`, `status`, `type`, `operatorId`, `userId`

---

### GET /reports/wallet

**Auth:** Bearer — Admin / Super Admin (`REPORT_WALLET` permission)  
**Purpose:** Wallet transaction report across all users.

Query params: `page`, `limit`, `startDate`, `endDate`, `userId`, `type`

---

### GET /reports/commission

**Auth:** Bearer — Admin / Super Admin (`REPORT_COMMISSION` permission)  
**Purpose:** Commission earned per retailer. Used for settlement calculations.

Query params: `page`, `limit`, `startDate`, `endDate`, `userId`

Response `data`:
```json
{
  "report": [
    {
      "retailer": { "_id": "...", "name": "Rahul Sharma", "phone": "9876543210" },
      "totalTransactions": 120,
      "totalAmount": 24000,
      "totalCommission": 480,
      "commissionRate": 0.02
    }
  ]
}
```

**Use on frontend:** Admin commission report page. Shows each retailer's earned commission for a given date range.

---

## 7. API Keys — Missing Detail

### GET /api-keys

**Auth:** Bearer — Any role (`API_KEY_LIST` permission)  
**Purpose:** List all API keys belonging to the current user. Does not return the raw key value — only metadata.

Response `data`:
```json
{
  "keys": [
    {
      "_id": "...",
      "name": "Production Key",
      "prefix": "crm_",
      "permissions": ["recharge:initiate", "recharge:read", "wallet:read"],
      "allowedIps": [],
      "isActive": true,
      "expiresAt": null,
      "lastUsedAt": "2026-08-01T09:00:00.000Z",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### GET /api-keys/:id

**Auth:** Bearer — Any  
**Purpose:** Get metadata for a single API key by its MongoDB ID. Raw key is never returned after creation.

Response `data`: `{ "key": { ...apiKeyObject } }`

---

### PATCH /api-keys/:id/revoke

**Auth:** Bearer — Any (`API_KEY_REVOKE` permission)  
**Purpose:** Permanently revoke an API key. The key will be rejected on all future requests.

Request body (optional):
```json
{ "reason": "Key exposed in public repo" }
```

Response `data`: `{ "key": { ...revokedKeyObject } }`

**Use on frontend:** Revoke button on the API keys table. Show a confirmation modal. Once revoked it cannot be un-revoked — user must create a new key.

---

## 8. Settings — Missing Detail

### GET /settings/public

**Auth:** None  
**Purpose:** Returns publicly accessible settings such as maintenance mode and support contact. Call this before app initialization.

Response `data`:
```json
{
  "settings": {
    "app.maintenanceMode": false,
    "app.supportEmail": "support@rechargecrmapp.com",
    "wallet.minRechargeAmount": 10,
    "wallet.maxRechargeAmount": 10000
  }
}
```

**Use on frontend:** Check `app.maintenanceMode` on app boot. Show maintenance page if `true`. The server also returns HTTP 503 for all API calls during maintenance.

---

### GET /settings

**Auth:** Bearer — Admin / Super Admin (`SETTINGS_READ` permission)  
**Purpose:** Paginated list of all system settings.

Query params: `page`, `limit`

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "key": "wallet.commissionRate",
      "value": 0.02,
      "description": "Default commission rate for recharge",
      "isPublic": false,
      "updatedBy": "ADMIN_USER_ID",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### GET /settings/:key

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Get a single setting by its dot-notation key.

Example: `GET /settings/wallet.commissionRate`

Response `data`: `{ "setting": { ...settingObject } }`

---

### PUT /settings/:key

**Auth:** Bearer — Admin / Super Admin (`SETTINGS_UPDATE` permission)  
**Purpose:** Update a single setting value.

Request body:
```json
{
  "value": 0.03,
  "description": "Updated commission rate"
}
```

`description` is optional. `value` can be any JSON-compatible type (string, number, boolean, object).

Response `data`: `{ "setting": { ...updatedSettingObject } }`

**Common keys to update from admin UI:**

| Key | Type | Description |
|---|---|---|
| `app.maintenanceMode` | boolean | Toggle maintenance mode |
| `app.supportEmail` | string | Support contact email |
| `wallet.commissionRate` | number | Default commission (0–1) |
| `wallet.minRechargeAmount` | number | Minimum recharge in ₹ |
| `wallet.maxRechargeAmount` | number | Maximum recharge in ₹ |

---

### POST /settings/bulk

**Auth:** Bearer — Super Admin only (`SETTINGS_UPDATE` permission)  
**Purpose:** Update multiple settings in one request.

Request body:
```json
{
  "settings": [
    { "key": "wallet.commissionRate", "value": 0.025 },
    { "key": "wallet.minRechargeAmount", "value": 20 },
    { "key": "app.maintenanceMode", "value": false }
  ]
}
```

Response `data`: `{ "results": [ ...arrayOfUpdatedSettings ] }`

**Use on frontend:** Settings page with a "Save All" button. Only render for `super_admin` role.

---

## 9. Provider — Missing Detail

All provider routes require `Admin` or `Super Admin` role.

### GET /provider

**Auth:** Bearer — Admin / Super Admin (`PROVIDER_READ` permission)  
**Purpose:** List all registered recharge providers stored in the local DB (currently only MRobotics).

Response `data`:
```json
{
  "providers": [
    {
      "_id": "...",
      "name": "MRobotics",
      "code": "MROBOTICS",
      "isActive": true,
      "lastBalance": 50000,
      "lastBalanceCheckedAt": "2026-08-02T08:00:00.000Z"
    }
  ]
}
```

---

### GET /provider/balance

**Auth:** Bearer — Admin / Super Admin (`PROVIDER_BALANCE` permission)  
**Purpose:** Fetches the live current balance from MRobotics API (real-time external call) and updates the local cache.

Response `data`:
```json
{ "balance": 48500.50, "currency": "INR" }
```

**Use on frontend:** Admin dashboard provider balance card. Add a "Refresh" button since this is a live API call.

---

### GET /provider/operators

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Fetch operator list directly from MRobotics API (not the local DB). Used for syncing/importing operators.

Query param: `type` (optional) — recharge type filter

Response `data`: `{ "operators": [ ...mroboticsOperatorObjects ] }`

---

### GET /provider/circles

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Fetch circle/zone list directly from MRobotics API.

Response `data`: `{ "circles": [ ...mroboticsCircleObjects ] }`

---

### GET /provider/plans

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Fetch plans for a specific operator+circle combination directly from MRobotics.

Query params:
- `operatorCode`: MRobotics operator code (e.g., `AIRTEL`)
- `circleCode`: MRobotics circle code (e.g., `MH`)

Response `data`: `{ "plans": [ ...mroboticsPlanObjects ] }`

---

### GET /provider/detect-operator

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** Detect which operator a mobile number belongs to via MRobotics API.

Query param: `mobile` — 10-digit Indian mobile number

Response `data`:
```json
{
  "mobile": "9876543210",
  "operator": "Airtel",
  "operatorCode": "AIRTEL",
  "circle": "Maharashtra",
  "circleCode": "MH"
}
```

**Use on frontend:** Auto-detect operator when retailer enters mobile number in the recharge form. Call after the mobile field loses focus (onBlur) when the number is exactly 10 digits.

---

## 10. Logs — Missing Detail

All log routes require `Admin` or `Super Admin` role.

### GET /logs/activity

**Auth:** Bearer — Admin / Super Admin (`LOG_ACTIVITY` permission)  
**Purpose:** Paginated user activity log — tracks who did what (login, logout, recharge initiated, etc.).

Query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `userId` | MongoId | Filter by user |
| `action` | string | Filter by action type |
| `module` | string | Filter by module (e.g., `recharge`, `wallet`, `auth`) |
| `startDate` | ISO date | From date |
| `endDate` | ISO date | To date |

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "user": { "_id": "...", "name": "Rahul Sharma" },
      "action": "RECHARGE_INITIATED",
      "module": "recharge",
      "description": "Recharge of ₹199 for 9000000001",
      "metadata": { "txnId": "TXN...", "amount": 199 },
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

**Use on frontend:** Admin logs page with user and module filter dropdowns.

---

### GET /logs/audit

**Auth:** Bearer — Admin / Super Admin (`LOG_AUDIT` permission)  
**Purpose:** Tracks sensitive admin operations — user blocks, wallet credits, setting changes, etc.

Query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `performedBy` | MongoId | Filter by admin who performed action |
| `action` | string | Action filter |
| `severity` | string | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `startDate` | ISO date | From date |
| `endDate` | ISO date | To date |

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "performedBy": { "_id": "...", "name": "Admin User" },
      "action": "USER_BLOCKED",
      "target": "TARGET_USER_ID",
      "targetModel": "User",
      "severity": "HIGH",
      "description": "Blocked user for suspicious activity",
      "before": { "isBlocked": false },
      "after": { "isBlocked": true },
      "createdAt": "2026-08-01T11:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

Severity values: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

**Use on frontend:** Admin audit trail page. Color-code rows by severity.

---

### GET /logs/webhooks

**Auth:** Bearer — Admin / Super Admin (`LOG_WEBHOOK` permission)  
**Purpose:** Log of all incoming webhook calls from MRobotics — useful for debugging recharge status sync issues.

Query params:

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `provider` | string | Filter by provider (e.g., `MROBOTICS`) |
| `isProcessed` | boolean | Filter by processing status |
| `startDate` | ISO date | From date |
| `endDate` | ISO date | To date |

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "provider": "MROBOTICS",
      "payload": { "txnId": "TXN...", "status": "SUCCESS" },
      "isProcessed": true,
      "processedAt": "2026-08-01T10:05:00.000Z",
      "error": null,
      "createdAt": "2026-08-01T10:04:55.000Z"
    }
  ],
  "pagination": { ... }
}
```

**Use on frontend:** Admin webhook log page. Filter `isProcessed=false` to surface failed webhook processing.

---

## 11. Notifications — Missing Detail

### GET /notifications/my

**Auth:** Bearer — Any role (`NOTIFICATION_READ` permission)  
**Purpose:** Paginated list of notifications for the current user, with an `unreadCount` field at the root of `data`.

Query params: `page`, `limit`, `isRead` (true/false)

Response `data`:
```json
{
  "items": [
    {
      "_id": "...",
      "title": "Recharge Successful",
      "message": "₹199 recharge for 9000000001 was successful.",
      "type": "SUCCESS",
      "isRead": false,
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1, "hasNext": false, "hasPrev": false },
  "unreadCount": 3
}
```

**Use on frontend:** Notification bell icon with badge showing `unreadCount`. Dropdown/panel listing `items`. Load `isRead=false` by default for the badge.

---

### PATCH /notifications/my/:id/read

**Auth:** Bearer — Any  
**Purpose:** Mark a single notification as read.

Response `data`: `{ "notification": { ...notificationObject, "isRead": true } }`

---

### PATCH /notifications/my/read-all

**Auth:** Bearer — Any  
**Purpose:** Mark all of the current user's notifications as read.

Response: `{ "success": true, "message": "All notifications marked as read", "data": {} }`

**Use on frontend:** "Mark all as read" button in the notification panel. After success, set `unreadCount` to 0 in local state.

---

### GET /notifications

**Auth:** Bearer — Admin / Super Admin  
**Purpose:** All notifications across all users, paginated.

Query params: `page`, `limit`, `isRead`

---

### POST /notifications

**Auth:** Bearer — Admin / Super Admin (`NOTIFICATION_CREATE` permission)  
**Purpose:** Send a notification to a specific user.

Request body:
```json
{
  "userId": "USER_MONGO_ID",
  "title": "Wallet Credited",
  "message": "₹1000 has been credited to your wallet.",
  "type": "SUCCESS",
  "channel": "IN_APP"
}
```

Field rules:
- `userId`: required, valid MongoDB ID
- `title`: required, max 200 chars
- `message`: required, max 1000 chars
- `type`: optional — `INFO` | `SUCCESS` | `WARNING` | `ERROR` | `ALERT`
- `channel`: optional — `IN_APP` | `EMAIL` | `SMS`

Response `data`: `{ "notification": { ...notificationObject } }` — HTTP `201 Created`

---

### DELETE /notifications/:id

**Auth:** Bearer — Admin / Super Admin (`NOTIFICATION_DELETE` permission)  
**Purpose:** Permanently delete a notification record.

Response: `{ "success": true, "message": "Notification deleted", "data": {} }`

---

## 12. Avatar — Static File Serving

**Not an API endpoint** — this is a static file URL that was missing from the original integration doc.

### GET /uploads/:filename

**Auth:** None (publicly accessible)  
**Purpose:** Serve uploaded avatar images directly from the server filesystem.

Example:
```
GET http://localhost:8080/uploads/1785678746786-76b0368c5230fc.jpeg
```

The `avatar` field returned by all user APIs (profile, user list, etc.) contains this full URL already. You do not need to construct it manually.

Example user object with avatar:
```json
{
  "_id": "...",
  "name": "Rahul Sharma",
  "avatar": "http://localhost:8080/uploads/1785678746786-76b0368c5230fc.jpeg"
}
```

In production, the URL base changes automatically based on `APP_URL` env var:
```
https://your-domain.com/uploads/1785678746786-76b0368c5230fc.jpeg
```

**Use on frontend:** Drop the avatar URL directly into an `<img src>` or `next/image` `src`. No Authorization header required.

Accepted formats: `image/jpeg`, `image/png`, `image/webp`  
Max file size: 5MB (configurable via `MAX_FILE_SIZE_MB` env var)

---

## Summary of All Missing APIs

| # | Method | Path | Auth | Category |
|---|--------|------|------|----------|
| 1 | GET | `/ping` | None | Health |
| 2 | GET | `/health` | None | Health |
| 3 | GET | `/version` | None | Health |
| 4 | GET | `/users` | Admin | Users |
| 5 | POST | `/users` | Admin | Users |
| 6 | PUT | `/users/:id` | Admin | Users |
| 7 | DELETE | `/users/:id` | Super Admin | Users |
| 8 | GET | `/wallet/me` | Retailer | Wallet |
| 9 | GET | `/wallet/me/statement` | Retailer | Wallet |
| 10 | POST | `/wallet/:userId/debit` | Admin | Wallet |
| 11 | GET | `/wallet/ledger` | Admin | Wallet |
| 12 | GET | `/wallet/:userId` | Admin | Wallet |
| 13 | GET | `/wallet/:userId/statement` | Admin | Wallet |
| 14 | PATCH | `/wallet/:userId/unfreeze` | Admin | Wallet |
| 15 | GET | `/recharge/all` | Admin | Recharge |
| 16 | GET | `/recharge/admin/status/:txnId` | Admin | Recharge |
| 17 | POST | `/recharge/:txnId/retry` | Admin | Recharge |
| 18 | GET | `/operators/active` | Any | Operators |
| 19 | POST | `/operators` | Admin | Operators |
| 20 | PUT | `/operators/:id` | Admin | Operators |
| 21 | DELETE | `/operators/:id` | Admin | Operators |
| 22 | POST | `/operators/circles` | Admin | Circles |
| 23 | GET | `/operators/circles/:id` | Any | Circles |
| 24 | PUT | `/operators/circles/:id` | Admin | Circles |
| 25 | GET | `/operators/plans` | Any | Plans |
| 26 | POST | `/operators/plans` | Admin | Plans |
| 27 | PUT | `/operators/plans/:id` | Admin | Plans |
| 28 | DELETE | `/operators/plans/:id` | Admin | Plans |
| 29 | GET | `/reports/dashboard` | Any | Reports |
| 30 | GET | `/reports/recharge/my` | Retailer | Reports |
| 31 | GET | `/reports/wallet/my` | Retailer | Reports |
| 32 | GET | `/reports/sales` | Admin | Reports |
| 33 | GET | `/reports/sales/by-day` | Admin | Reports |
| 34 | GET | `/reports/sales/by-operator` | Admin | Reports |
| 35 | GET | `/reports/recharge` | Admin | Reports |
| 36 | GET | `/reports/wallet` | Admin | Reports |
| 37 | GET | `/reports/commission` | Admin | Reports |
| 38 | GET | `/api-keys` | Any | API Keys |
| 39 | GET | `/api-keys/:id` | Any | API Keys |
| 40 | PATCH | `/api-keys/:id/revoke` | Any | API Keys |
| 41 | GET | `/settings/public` | None | Settings |
| 42 | GET | `/settings` | Admin | Settings |
| 43 | GET | `/settings/:key` | Admin | Settings |
| 44 | PUT | `/settings/:key` | Admin | Settings |
| 45 | POST | `/settings/bulk` | Super Admin | Settings |
| 46 | GET | `/provider` | Admin | Provider |
| 47 | GET | `/provider/balance` | Admin | Provider |
| 48 | GET | `/provider/operators` | Admin | Provider |
| 49 | GET | `/provider/circles` | Admin | Provider |
| 50 | GET | `/provider/plans` | Admin | Provider |
| 51 | GET | `/provider/detect-operator` | Admin | Provider |
| 52 | GET | `/logs/activity` | Admin | Logs |
| 53 | GET | `/logs/audit` | Admin | Logs |
| 54 | GET | `/logs/webhooks` | Admin | Logs |
| 55 | GET | `/notifications/my` | Any | Notifications |
| 56 | PATCH | `/notifications/my/:id/read` | Any | Notifications |
| 57 | PATCH | `/notifications/my/read-all` | Any | Notifications |
| 58 | GET | `/notifications` | Admin | Notifications |
| 59 | POST | `/notifications` | Admin | Notifications |
| 60 | DELETE | `/notifications/:id` | Admin | Notifications |
| 61 | GET | `/uploads/:filename` | None | Static Files |


---

## 13. Webhook — Full Detail

The webhook route is mounted separately at `/api/v1/webhooks`, **before** JSON body parsing and before the maintenance middleware, so it always receives calls even during maintenance mode.

### POST /api/v1/webhooks/mrobotics

**Auth:** HMAC signature verification via `X-MRobotics-Signature` header (in production). In development the signature check is skipped.  
**Purpose:** Receives real-time recharge status updates from MRobotics. This is called by MRobotics, not by the frontend.

Request headers:
```
X-MRobotics-Signature: <hmac_sha256_hex_signature>
Content-Type: application/json
```

Response (always `200` — MRobotics expects a 200 to stop retrying):
```json
{ "success": true, "message": "Webhook received" }
```

Duplicate webhook response:
```json
{ "success": true, "message": "Duplicate webhook acknowledged" }
```

Invalid signature response (production only):
```
HTTP 401
{ "success": false, "message": "Invalid signature" }
```

**What the webhook processing does (backend-only, no frontend action needed):**
1. Verifies HMAC signature
2. Checks for duplicate payload (idempotent)
3. Looks up the transaction by `internalTxnId` or `providerTxnId`
4. Updates the transaction status in DB
5. If status is `FAILED`, auto-refunds the wallet
6. Creates an in-app notification for the retailer (Recharge Successful / Recharge Failed)
7. Processing happens **asynchronously** after the 200 response — MRobotics does not wait for DB operations

**Frontend integration note:** The frontend should not call this endpoint. To get status updates, listen on Socket.IO event `recharge:update`. The webhook processing is what triggers that event.

---

## 14. Socket.IO — Full Detail

The integration doc lists events but omits connection details, rooms, and the admin-only event.

### Connection

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});
```

The token can also be sent via the `Authorization` header:
```javascript
const socket = io('http://localhost:8080', {
  extraHeaders: { Authorization: `Bearer ${accessToken}` },
});
```

**Connection is rejected if:**
- No token is provided → error: `Authentication required`
- Token is invalid → error: `Invalid token`
- User is blocked or deactivated → error: `User account unavailable`

### Rooms

Every connected socket is automatically joined to:
- `user:<userId>` — personal room for this user
- `admins` — joined automatically for `admin` and `super_admin` roles only

### Client-emitted events

| Event | Payload | Description |
|---|---|---|
| `join:room` | `"user:<userId>"` | Manually join a user room (only `user:*` prefix allowed) |

### Server-emitted events (frontend listens)

| Event | Sent to | Payload | When triggered |
|---|---|---|---|
| `recharge:update` | `user:<userId>` | `{ txnId, status, transaction }` | Any status change on retailer's own transaction |
| `recharge:success` | `user:<userId>` | `{ transaction }` | Transaction reaches `SUCCESS` |
| `recharge:failed` | `user:<userId>` | `{ transaction }` | Transaction reaches `FAILED` |
| `wallet:update` | `user:<userId>` | `{ balance, transaction }` | Wallet balance changes (credit, debit, refund, commission) |
| `wallet:frozen` | `user:<userId>` | `{}` | Wallet is frozen by admin |
| `wallet:unfrozen` | `user:<userId>` | `{}` | Wallet is unfrozen by admin |
| `notification:new` | `user:<userId>` | `{ notification }` | A new notification is created for this user |
| `notification:broadcast` | all connected sockets | `{ notification }` | Admin broadcasts a system-wide notification |
| `recharge:update:all` | `admins` room | `{ userId, txnId, status }` | Any recharge status change system-wide (admin monitoring) |

### Ping / keepalive

Server sends a ping every `25s`, expects pong within `60s`. No frontend action required — socket.io client handles this automatically.

### Reconnection

Use socket.io client's built-in reconnection. On reconnect, the token in `auth` must still be valid. If the access token has expired, disconnect and reconnect after refreshing the token:

```javascript
socket.on('connect_error', (err) => {
  if (err.message === 'Invalid token') {
    refreshToken().then((newToken) => {
      socket.auth.token = newToken;
      socket.connect();
    });
  }
});
```

---

## 15. Background Cron Jobs

These run automatically on the server. No frontend API calls required — but the frontend must handle the side effects they produce (status changes, balance updates, notifications).

### 1. Retry Recharge Cron

**Schedule:** Every 5 minutes (`*/5 * * * *`, configurable via `CRON_RETRY_SCHEDULE`)  
**Timezone:** Asia/Kolkata

Picks up failed transactions that are marked `isRetryable: true` and have not exceeded `maxRetries`. Re-attempts the MRobotics recharge. On success, updates the status. On final failure, moves the transaction to dead-letter state and refunds the wallet.

**Frontend side effect:** The retailer receives a `recharge:update` socket event when the retry resolves, so the transaction status updates in real time without polling.

---

### 2. Pending Status Check Cron

**Schedule:** Every 10 minutes (`*/10 * * * *`, configurable via `CRON_PENDING_CHECK_SCHEDULE`)  
**Timezone:** Asia/Kolkata

Queries MRobotics for the current status of all transactions still in `PENDING` or `PROCESSING` state. Updates them if the status has changed. Auto-refunds on `FAILED`.

**Frontend side effect:** Same as retry cron — `recharge:update` socket event fires when a pending transaction gets resolved.

---

### 3. Commission Settlement Cron

**Schedule:** Daily at midnight (`0 0 * * *`, configurable via `CRON_SETTLEMENT_SCHEDULE`)  
**Timezone:** Asia/Kolkata

Finds all `SUCCESS` transactions where commission has not yet been credited to the retailer's wallet. Credits the commission and marks the transaction as settled.

**Frontend side effect:** The retailer receives a `wallet:update` socket event when commission is credited. Their balance increases without any action on their part.

---

### 4. Log Cleanup Cron

**Schedule:** Daily at 2 AM (`0 2 * * *`, configurable via `CRON_LOG_CLEANUP_SCHEDULE`)  
**Timezone:** Asia/Kolkata

Automatically deletes old log records to keep the database lean:

| Log type | Retention period |
|---|---|
| Activity logs | 90 days |
| API request logs | 30 days |
| Webhook logs (processed only) | 90 days |
| Audit logs | Never deleted |

**Frontend note:** The admin logs page will not return records older than these retention periods. Do not implement date filters that go beyond 90 days for activity/webhook logs.

---

## 16. Maintenance Mode Behaviour

The `maintenanceMiddleware` runs on every request **except** health checks and webhooks.

**Paths that bypass maintenance mode:**
- `GET /ping`
- `GET /health`
- `GET /version`
- `POST /api/v1/webhooks/*`

**All other routes** return HTTP `503` when maintenance mode is active:
```json
{
  "success": false,
  "message": "Service is temporarily under maintenance. Please try again later.",
  "errors": []
}
```

The maintenance state is cached in memory for **30 seconds** to avoid hitting the DB on every request. Toggling `app.maintenanceMode` via `PUT /settings/app.maintenanceMode` takes effect within 30 seconds.

**Frontend checklist:**
1. On app boot, call `GET /settings/public` and check `app.maintenanceMode`
2. Intercept all API responses for HTTP `503` — show a maintenance page immediately
3. `/ping` and `/health` remain available so you can poll to detect when the service comes back up

---

## 17. Authentication — Missing Detail

### Token storage & cookies

On login (`POST /auth/login`), the backend sets a `refreshToken` HttpOnly cookie automatically:
```
Set-Cookie: refreshToken=eyJ...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
```

When calling `POST /auth/refresh-token`, you can either:
- Send `{ "refreshToken": "eyJ..." }` in the request body, **or**
- Let the browser send the cookie automatically (if on the same origin)

The backend reads from `req.body.refreshToken || req.cookies.refreshToken`.

### Access token from cookie

The `authenticate` middleware also reads from `req.cookies.accessToken` as a fallback if no `Authorization` header is present:
```javascript
const token = extractBearerToken(req.headers.authorization) || req.cookies?.accessToken;
```

This means you can store the access token in a cookie and the backend will accept it automatically.

### Token invalidation rules

A token is rejected if **any** of the following are true:
- Token signature is invalid
- Token has expired (`TokenExpiredError` → `"Access token has expired"`)
- User no longer exists in DB
- User's `isActive` is `false`
- User's `isBlocked` is `true`
- User's `lockUntil` is in the future (temporary lockout)
- `passwordChangedAt` is after `iat` (token issued before last password change)

On any `401` error, call `POST /auth/refresh-token`. If that also returns `401`, redirect to login.

### Account lockout

After 5 consecutive failed login attempts (configurable via `MAX_LOGIN_ATTEMPTS`), the account is locked for 30 minutes (configurable via `ACCOUNT_LOCK_DURATION_MINUTES`). During lockout, the login endpoint returns:
```
HTTP 401 — "Account is temporarily locked due to failed login attempts"
```

**Frontend:** Show the lockout message and a countdown timer if `lockUntil` is available. Do not allow further login attempts until the timer expires.

---

## 18. Permission System — Complete Reference

Permissions are assigned by role automatically. Admins can also grant individual custom permissions to a user via `PUT /users/:id` with the `permissions` array.

### Permissions by role

#### retailer (default)
```
auth:login, auth:logout, auth:refresh, auth:change_password, auth:forgot_password
wallet:read, wallet:statement, wallet:ledger
recharge:initiate, recharge:read, recharge:list, recharge:status
operator:read, operator:list
circle:read, circle:list
plan:read, plan:list
notification:read
report:recharge, report:wallet
```

#### admin (includes all retailer permissions plus)
```
retailer:create, retailer:read, retailer:update, retailer:delete, retailer:list
user:read, user:list, user:block, user:unblock
wallet:credit, wallet:debit, wallet:freeze, wallet:unfreeze
recharge:retry, recharge:refund
operator:create, operator:update
circle:create, circle:update
plan:create, plan:update
report:sales, report:commission
notification:create, notification:broadcast
api_key:create, api_key:read, api_key:revoke, api_key:list
settings:read
log:activity, log:audit, log:api, log:webhook
provider:read, provider:balance
```

#### super_admin
All permissions above plus:
```
user:create, user:update, user:delete
operator:delete, circle:delete, plan:delete
notification:delete
settings:update
provider:update
```

### Custom permissions on a user

A retailer can be granted extra permissions individually:
```json
PUT /users/:id
{ "permissions": ["recharge:retry", "wallet:credit"] }
```

The effective permissions are `ROLE_PERMISSIONS[role]` **union** `user.permissions`.

**Frontend:** Use this to show/hide action buttons. Do not rely solely on role — check the actual permission. Recommended utility:

```javascript
const can = (user, permission) => {
  const rolePerms = ROLE_PERMISSIONS[user.role] ?? [];
  return rolePerms.includes(permission) || user.permissions.includes(permission);
};
```

---

## 19. Notification Events — Complete Reference

These are the system-generated notification events that the backend creates automatically (not via the admin UI). The `event` field in the notification object indicates what triggered it.

| Event | Triggered by | Notification type | Who receives it |
|---|---|---|---|
| `RECHARGE_SUCCESS` | Webhook / cron status update | `SUCCESS` | Retailer who initiated |
| `RECHARGE_FAILED` | Webhook / cron status update | `ERROR` | Retailer who initiated |
| `RECHARGE_REFUNDED` | Admin refund action | `INFO` | Retailer who initiated |
| `WALLET_CREDITED` | Admin credit action | `SUCCESS` | Wallet owner |
| `WALLET_DEBITED` | Admin debit action | `WARNING` | Wallet owner |
| `WALLET_FROZEN` | Admin freeze action | `ERROR` | Wallet owner |
| `WALLET_UNFROZEN` | Admin unfreeze action | `SUCCESS` | Wallet owner |
| `LOW_BALANCE` | System check | `WARNING` | Retailer |
| `LOGIN` | Successful login | `INFO` | The user |
| `LOGIN_FAILED` | Failed login attempt | `WARNING` | The user |
| `ACCOUNT_LOCKED` | Too many failed logins | `ERROR` | The user |
| `PASSWORD_CHANGED` | Change password success | `INFO` | The user |
| `PASSWORD_RESET` | Reset password success | `INFO` | The user |
| `PROFILE_UPDATED` | Profile update | `INFO` | The user |
| `API_KEY_CREATED` | New API key created | `INFO` | The user |
| `API_KEY_REVOKED` | API key revoked | `WARNING` | The user |
| `SYSTEM_ALERT` | Admin broadcast | `ALERT` | All users / role-targeted |

**Frontend:** Use the `event` field to render different icons or colours per notification type in the notification panel.

---

## 20. Wallet Transaction Types — Complete Reference

The `type` field on wallet ledger entries uses these values:

| Type | When it occurs |
|---|---|
| `CREDIT` | Admin manually credits wallet |
| `DEBIT` | Admin manually debits wallet, or recharge is charged |
| `REFUND` | Recharge failed → amount returned to wallet |
| `REVERSAL` | Manual reversal by admin |
| `COMMISSION` | Daily settlement credits earned commission |
| `SETTLEMENT` | Settlement transaction marker |
| `PENALTY` | Admin-applied penalty |
| `ADJUSTMENT` | Balance correction / admin adjustment |

Wallet transaction status values:

| Status | Meaning |
|---|---|
| `PENDING` | Transaction created, not yet confirmed |
| `COMPLETED` | Transaction successfully processed |
| `FAILED` | Transaction failed |
| `REVERSED` | Transaction reversed |

---

## 21. Recharge — Missing Field Detail

### GET /recharge/my and GET /recharge/all — Filter: mobileNumber

The integration doc does not mention the `mobileNumber` query filter. Both list endpoints accept:

```
GET /recharge/my?mobileNumber=9876543210
GET /recharge/all?mobileNumber=9876543210
```

Must be a valid 10-digit Indian number starting with 6–9.

### Recharge transaction object — full shape

```json
{
  "_id": "...",
  "txnId": "TXN17856...",
  "user": "USER_ID",
  "mobileNumber": "9876543210",
  "amount": 199,
  "operator": "OPERATOR_ID",
  "circle": "CIRCLE_ID",
  "type": "MOBILE_PREPAID",
  "status": "SUCCESS",
  "providerTxnId": "MROBOTICS_TXN_ID",
  "providerStatus": "SUCCESS",
  "providerMessage": "Recharge successful",
  "operatorRef": "AIRTEL_REF_123",
  "commission": 3.98,
  "commissionRate": 0.02,
  "isSettled": true,
  "isRetryable": false,
  "retryCount": 0,
  "maxRetries": 3,
  "ipAddress": "192.168.1.1",
  "requestId": "REQ-...",
  "correlationId": "CORR-...",
  "createdAt": "2026-08-01T10:00:00.000Z",
  "updatedAt": "2026-08-01T10:01:00.000Z"
}
```

### Terminal statuses (no further updates possible)
`SUCCESS` | `FAILED` | `REFUNDED` | `REVERSED`

### Retriable statuses (eligible for retry cron / manual retry)
`FAILED` | `TIMEOUT`

---

## 22. Swagger / API Docs Endpoint

**Auth:** None  
**Available when:** `SWAGGER_ENABLED=true` in `.env`

| Path | Description |
|---|---|
| `GET /api-docs` | Interactive Swagger UI |
| `GET /api-docs.json` | Raw OpenAPI JSON spec |

In development, set `SWAGGER_ENABLED=true` in `.env` to enable. In production, it is disabled by default.

**Frontend note:** You can point API testing tools at `/api-docs.json` to import the full OpenAPI spec.

---

## 23. Request ID Header

Every request receives a unique `X-Request-Id` header in the response. The backend also reads it from the incoming request if present — useful for correlating logs.

You can send it in requests:
```
X-Request-Id: your-unique-id-here
X-Correlation-Id: frontend-correlation-id
```

This is useful for support: when a user reports an issue, the frontend can log the `X-Request-Id` from the error response to correlate with backend logs.

---

## 24. CORS Configuration

Allowed origins are set via the `ALLOWED_ORIGINS` environment variable (comma-separated). The default is `http://localhost:5173`.

Allowed headers:
```
Content-Type
Authorization
X-API-Key
X-Request-Id
X-Correlation-Id
```

Allowed methods: `GET POST PUT PATCH DELETE OPTIONS`

Credentials (cookies) are allowed (`credentials: true`).

For production, set:
```
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://admin.your-domain.com
```

---

## 25. Error Response — Additional Cases

The integration doc covers standard errors but misses these specific cases.

### Validation error (HTTP 422)

Returned when request body fails field validation. The `errors` array contains one entry per invalid field:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please provide a valid email", "value": "notanemail" },
    { "field": "phone", "message": "Please provide a valid Indian mobile number", "value": "12345" }
  ]
}
```

### Maintenance mode (HTTP 503)

```json
{
  "success": false,
  "message": "Service is temporarily under maintenance. Please try again later.",
  "errors": []
}
```

### Wallet-specific errors (HTTP 400)

| Scenario | Message |
|---|---|
| Insufficient balance | `"Insufficient wallet balance"` |
| Wallet frozen | `"Wallet is frozen. Contact support."` |
| Wallet suspended | `"Wallet is suspended"` |
| Amount below minimum | `"Recharge amount is below the minimum allowed"` |
| Amount above maximum | `"Recharge amount exceeds the maximum allowed"` |

### Account lockout (HTTP 401)

```json
{
  "success": false,
  "message": "Account is temporarily locked due to failed login attempts",
  "errors": []
}
```

---

## 26. API Key Authentication — How It Works

As an alternative to JWT Bearer tokens, any endpoint that uses `authenticate` middleware also accepts an API key via the `X-API-Key` header.

```
X-API-Key: crm_<rawKey>
```

The API key grants the same permissions as the user it belongs to, restricted further to the `permissions` array set on the key itself. If a key has `allowedIps` set, requests from other IPs are rejected.

**Endpoints that support API key auth:** All protected endpoints (everything after `router.use(authenticate)`).

**Endpoints that do NOT support API key auth:** `/auth/login`, `/auth/register`, `/auth/refresh-token`, `/auth/forgot-password`, `/auth/reset-password`, `/settings/public`, health endpoints, webhooks.

---

## Final Summary — What Was Added in This File

| Section | What it covers |
|---|---|
| 1–12 | (original sections — 61 missing API endpoints) |
| 13 | Webhook endpoint — full signature verification, processing flow, duplicate handling |
| 14 | Socket.IO — full connection options, all rooms, all events including admin-only `recharge:update:all`, reconnection on expired token |
| 15 | All 4 background cron jobs — schedules, what they do, frontend side effects |
| 16 | Maintenance mode — which paths bypass it, 30s cache, frontend checklist |
| 17 | Authentication — cookie behaviour, fallback cookie auth, all 7 token rejection reasons, account lockout |
| 18 | Permission system — complete permission list per role, custom permissions, frontend `can()` utility |
| 19 | Notification events — all 17 system event types with trigger source and recipient |
| 20 | Wallet transaction types — all 8 types and 4 status values |
| 21 | Recharge — `mobileNumber` filter, full transaction object shape, terminal vs retriable statuses |
| 22 | Swagger endpoints — `/api-docs` and `/api-docs.json` |
| 23 | Request ID / Correlation ID headers |
| 24 | CORS configuration — allowed origins, headers, methods |
| 25 | Error responses — validation (422), maintenance (503), wallet errors, account lockout |
| 26 | API Key auth — how it works, which endpoints support it, IP restriction |


---

## 27. API Key Authentication — Complete Behaviour Detail

The existing section 26 covered the basics. This adds the full behaviour found in the middleware.

### How permissions work with API keys

When a request is authenticated via `X-API-Key`:

- If the API key has a non-empty `permissions` array → only those permissions are granted (restricted scope)
- If the API key has an empty `permissions` array → the full user role permissions apply (same as JWT auth)

This means you can create a scoped key for a retailer that only allows `recharge:initiate` and `wallet:read`, even though the retailer normally has 20+ permissions.

### Automatic usage tracking

Every API key request increments `usageCount` and updates `lastUsedAt` and `lastUsedIp` asynchronously. These fields are visible on `GET /api-keys/:id`.

### API key object shape (from GET /api-keys or GET /api-keys/:id)

```json
{
  "_id": "...",
  "user": "USER_ID",
  "name": "Production Key",
  "keyPrefix": "TXN1A2B3C",
  "permissions": ["recharge:initiate", "wallet:read"],
  "allowedIps": ["203.0.113.10"],
  "isActive": true,
  "expiresAt": null,
  "lastUsedAt": "2026-08-01T10:00:00.000Z",
  "lastUsedIp": "203.0.113.10",
  "usageCount": 142,
  "revokedAt": null,
  "revokedBy": null,
  "revokedReason": "",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

`keyHash` and `encryptedKey` are never returned. `rawKey` is only returned at creation time.

### Error cases specific to API key auth

| Scenario | HTTP | Message |
|---|---|---|
| Header missing | 401 | `"API key is required"` |
| Key not found / revoked | 401 | `"Invalid or revoked API key"` |
| Key expired | 401 | `"API key has expired"` |
| IP not in allowedIps | 403 | `"API key not allowed from this IP address"` |
| Owner user blocked/inactive | 401 | `"API key owner account is inactive or blocked"` |

---

## 28. Sessions — Full Detail

Sessions are server-side records tied to each refresh token. Each login creates a new session.

### GET /auth/sessions

**Auth:** Bearer  
**Purpose:** List all currently active, non-expired sessions for the logged-in user.

Response `data`:
```json
{
  "sessions": [
    {
      "_id": "...",
      "deviceId": "device-uuid",
      "deviceName": "Chrome Browser",
      "deviceType": "desktop",
      "platform": "",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "isActive": true,
      "expiresAt": "2026-08-09T10:00:00.000Z",
      "lastAccessedAt": "2026-08-02T10:00:00.000Z",
      "createdAt": "2026-08-02T10:00:00.000Z"
    }
  ]
}
```

**Use on frontend:** "Active Sessions" page in account security settings. Show device name, IP, and last accessed time. Allow the user to log out from individual sessions via `POST /auth/logout` with that session's refresh token, or `POST /auth/logout-all`.

---

### GET /auth/login-history

**Auth:** Bearer  
**Purpose:** Last 20 login records (including both active and revoked sessions) for the logged-in user. `refreshToken` and `refreshTokenHash` fields are excluded.

Response `data`:
```json
{
  "history": [
    {
      "_id": "...",
      "deviceId": "device-uuid",
      "deviceName": "Chrome Browser",
      "deviceType": "desktop",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "isActive": false,
      "revokedAt": "2026-08-01T20:00:00.000Z",
      "revokedReason": "logout",
      "expiresAt": "2026-08-09T10:00:00.000Z",
      "createdAt": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

`revokedReason` values: `logout` | `logout_all` | `token_rotation` | `password_reset` | `password_changed`

**Use on frontend:** "Login History" / security audit page. Highlight suspicious logins from unfamiliar IPs or device names.

---

### Session auto-rotation on token refresh

Every `POST /auth/refresh-token` call:
1. Revokes the old session (sets `revokedReason: "token_rotation"`)
2. Creates a new session with the new refresh token

This is one-time-use refresh token rotation. Store the new `refreshToken` from the response — the old one is permanently invalid.

### Session expiry

Sessions expire automatically via MongoDB TTL index after 7 days. Expired sessions are deleted from the DB by MongoDB, not by the application.

---

## 29. Email Notifications (Backend-Triggered)

The backend sends transactional emails automatically. These are not API endpoints — the frontend has no control over them, but the developer needs to know they exist and configure SMTP correctly.

| Trigger | Subject | Recipient | When |
|---|---|---|---|
| Registration (`POST /auth/register`) | `Welcome to RechargeCRM` | New user | On successful account creation |
| Forgot password (`POST /auth/forgot-password`) | `Password Reset Request — RechargeCRM` | User | On reset token generation |
| Account lockout (5 failed logins) | `Account Temporarily Locked — RechargeCRM` | User | When lockout threshold is hit |

### Password reset link format

The reset link sent in email points to:
```
<FRONTEND_URL>/reset-password?token=<rawOpaqueToken>
```

The frontend must extract the `token` query parameter and send it to `POST /auth/reset-password` as `{ "token": "...", "password": "...", "confirmPassword": "..." }`.

The token is a 32-byte random hex string, valid for **15 minutes**.

### SMTP env vars required

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=RechargeCRM
SMTP_FROM_EMAIL=noreply@rechargecrmapp.com
```

If SMTP is not configured, email sending fails silently (caught internally) — it does not break the API response.

---

## 30. Transaction ID Formats

All IDs generated by the backend follow fixed prefixes. The frontend can use these to validate and display IDs correctly.

| ID type | Prefix | Example | Used in |
|---|---|---|---|
| Recharge transaction | `TXN` | `TXN1A2B3C4D5E6F` | `txnId` on recharge objects |
| Wallet transaction | `WTX` | `WTX1A2B3C4D5E6F` | `txnId` on wallet statement items |
| Request ID | `REQ-` | `REQ-550e8400-e29b-41d4-a716` | `X-Request-Id` header |
| Correlation ID | `COR-` | `COR-550e8400-e29b-41d4-a716` | Internal tracking, webhook correlation |

These are opaque identifiers — never parse them for data. Use them only for display and as filter values.

---

## 31. User Object — Complete Field Reference

The full user object returned by all user-related APIs (profile, user list, etc.), after the `formatUser` transform:

```json
{
  "_id": "...",
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "role": "retailer",
  "roleRef": null,
  "permissions": [],
  "avatar": "http://localhost:8080/uploads/filename.jpg",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "country": "India"
  },
  "businessName": "Sharma Telecom",
  "gstNumber": "27AAPFU0939F1ZV",
  "panNumber": "AAPFU0939F",
  "isActive": true,
  "isEmailVerified": false,
  "isPhoneVerified": false,
  "isBlocked": false,
  "blockedReason": "",
  "blockedAt": null,
  "blockedBy": null,
  "loginAttempts": 0,
  "lockUntil": null,
  "lastLoginAt": "2026-08-01T10:00:00.000Z",
  "lastLoginIp": "192.168.1.1",
  "passwordChangedAt": "2026-01-01T00:00:00.000Z",
  "devices": [
    {
      "_id": "...",
      "deviceId": "device-uuid",
      "deviceName": "Chrome Browser",
      "deviceType": "desktop",
      "platform": "",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "lastLoginAt": "2026-08-01T10:00:00.000Z",
      "isActive": true
    }
  ],
  "createdBy": null,
  "parentId": null,
  "wallet": "WALLET_ID",
  "commissionRate": 0.02,
  "id": "...",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

**Fields never returned** (stripped by `toJSON` transform):
- `password`
- `refreshTokens`
- `passwordResetToken`, `passwordResetExpires`
- `emailVerificationToken`, `emailVerificationExpires`
- `aadhaarNumber`

**Note:** `id` (string) and `_id` (ObjectId) are both present because of Mongoose's `virtuals: true` in `toJSON`. Use `_id` for API calls; `id` is the virtual string equivalent.

---

## 32. Wallet Object — Complete Field Reference

```json
{
  "_id": "...",
  "user": "USER_ID",
  "balance": 1500.00,
  "pendingAmount": 0,
  "totalCredited": 5000.00,
  "totalDebited": 3500.00,
  "totalCommission": 80.00,
  "status": "ACTIVE",
  "walletLimit": 100000,
  "currency": "INR",
  "frozenAt": null,
  "frozenBy": null,
  "frozenReason": "",
  "lastTransactionAt": "2026-08-01T10:00:00.000Z",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

`pendingAmount` — amount reserved for in-flight recharges (currently in `PROCESSING` or `PENDING` status). The effective available balance is `balance - pendingAmount`.

`walletLimit` — the maximum balance the wallet can hold (default 100,000 INR). Crediting above this limit is blocked.

`totalCommission` — cumulative commission earned via settlement cron. This is the lifetime commission, not a period-specific figure.

**Use on frontend:** Display `balance` as the spendable amount. Show `totalCommission` on the earnings/commission summary card.

---

## 33. Notification Object — Complete Field Reference

```json
{
  "_id": "...",
  "user": "USER_ID",
  "title": "Recharge Successful",
  "message": "₹199 recharge for 9876543210 confirmed. Ref: AIRTEL_REF_123",
  "type": "SUCCESS",
  "channel": "IN_APP",
  "event": "RECHARGE_SUCCESS",
  "isRead": false,
  "readAt": null,
  "referenceId": "TXN1A2B3C4D5E6F",
  "referenceType": "RechargeTransaction",
  "metadata": {},
  "isBroadcast": false,
  "expiresAt": null,
  "createdAt": "2026-08-01T10:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

`referenceId` — the `txnId` or `walletTxnId` the notification is about. Use this to deep-link to the relevant transaction detail page.

`referenceType` — `"RechargeTransaction"` | `"WalletTransaction"` | `null`

`isBroadcast` — `true` for system-wide broadcast notifications sent via `POST /notifications/broadcast`.

**Auto-expiry:** Notifications have a MongoDB TTL index set to **90 days**. They are deleted automatically after that — no manual cleanup needed.

**Notification channel values:** `IN_APP` | `EMAIL` | `SMS` | `PUSH` | `WEBHOOK`  
Currently only `IN_APP` is implemented. The others are reserved for future channels.

---

## 34. User Delete — Actual Behaviour

`DELETE /users/:id` does **not** remove the record from the database. It performs a soft delete:
1. Sets `isActive: false`
2. Mutates the email to `deleted_<timestamp>_<original_email>` (to free the unique email constraint for future re-registrations)

The user's wallet, transactions, and audit trail remain intact for financial records. The user can no longer log in.

**Frontend note:** After a successful delete, remove the user from the local list without a re-fetch — the API returns `{ "success": true, "message": "User deleted successfully", "data": {} }` with no user object.

---

## 35. User Block vs Deactivate vs Delete

These three operations affect a user differently:

| Operation | `isActive` | `isBlocked` | Email changed | Can login | Records kept |
|---|---|---|---|---|---|
| `PATCH /users/:id/block` | true | true | No | No | Yes |
| `PUT /users/:id` with `isActive: false` | false | false | No | No | Yes |
| `DELETE /users/:id` | false | false | Yes (prefixed) | No | Yes |

**Block** is reversible — use `PATCH /users/:id/unblock`.  
**Deactivate** (`isActive: false`) is reversible — use `PUT /users/:id` with `isActive: true`.  
**Delete** is not reversible via UI — the email is permanently mutated.

**Frontend:** The block/unblock action should be available to `admin` and `super_admin`. Delete should only be available to `super_admin`, behind a confirmation modal with typed confirmation (e.g. type the user's email to confirm).

---

## 36. Settings — isEditable Flag

Not all settings can be updated via the API. The Setting model has an `isEditable` boolean field. If `isEditable: false`, attempting `PUT /settings/:key` returns an error.

All 9 seeded settings are editable by default. Only settings manually created with `isEditable: false` in the DB would block updates.

### Complete list of seeded settings

| Key | Default value | Type | Public | Description |
|---|---|---|---|---|
| `wallet.defaultLimit` | 100000 | number | No | Default wallet limit for new users |
| `wallet.minRechargeAmount` | 10 | number | Yes | Minimum allowed recharge amount (₹) |
| `wallet.maxRechargeAmount` | 10000 | number | Yes | Maximum allowed recharge amount (₹) |
| `wallet.commissionRate` | 0.02 | number | No | Default commission rate (2%) |
| `recharge.retryEnabled` | true | boolean | No | Whether auto-retry cron is enabled |
| `recharge.maxRetries` | 3 | number | No | Maximum auto-retry attempts |
| `app.maintenanceMode` | false | boolean | Yes | Toggles maintenance mode |
| `app.supportEmail` | `support@rechargecrmapp.com` | string | Yes | Support email shown to users |
| `app.supportPhone` | `1800-xxx-xxxx` | string | Yes | Support phone shown to users |

`recharge.retryEnabled` and `recharge.maxRetries` are stored in settings but the retry cron currently reads from env vars (`RETRY_MAX_ATTEMPTS`). The settings values are available for an admin UI toggle but require wiring to the cron if you want runtime control.

---

## 37. Operator Object — Complete Field Reference

```json
{
  "_id": "...",
  "name": "Airtel",
  "code": "AIRTEL",
  "providerCode": "AIRTEL",
  "type": "MOBILE_PREPAID",
  "displayName": "Airtel Prepaid",
  "logo": null,
  "isActive": true,
  "minAmount": 10,
  "maxAmount": 5000,
  "commission": 2,
  "supportedCircles": ["CIRCLE_ID_1", "CIRCLE_ID_2"],
  "metadata": {},
  "sortOrder": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

`logo` — currently `null` for all operators (not implemented). Reserve a 40×40px image slot in the UI for future use.

`sortOrder` — use this to order the operator dropdown. Lower number = appears first.

`supportedCircles` — array of `CircleMaster` IDs. If populated, only these circles are valid for this operator. Currently not enforced by the recharge validator (circleId is optional).

`commission` — operator-level commission percentage (0–100). This may differ from the user's `commissionRate`. The recharge uses the user's `commissionRate` for wallet deductions, not this field.

---

## 38. Circle Object — Complete Field Reference

```json
{
  "_id": "...",
  "name": "Maharashtra",
  "code": "MH",
  "providerCode": "MH",
  "displayName": "",
  "isActive": true,
  "sortOrder": 0,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

---

## 39. Plan Object — Complete Field Reference

```json
{
  "_id": "...",
  "operator": "OPERATOR_ID",
  "circle": "CIRCLE_ID",
  "amount": 239,
  "talktime": 239,
  "validity": "28 days",
  "description": "Unlimited calls + 1.5GB/day",
  "smsCount": 100,
  "dataAmount": "42GB",
  "planType": "DATA",
  "isActive": true,
  "isPopular": false,
  "metadata": {},
  "expiresAt": null,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-08-01T10:00:00.000Z"
}
```

`planType` — free-form string, not an enum. Common values from MRobotics: `TOPUP`, `DATA`, `SMS`, `ROAMING`, `UNLIMITED`. Default is `TOPUP`.

`isPopular` — use this to show a "Popular" badge on plan cards in the recharge form.

`expiresAt` — if set, the plan is automatically hidden from the UI after this date. Currently not enforced server-side — filter on the frontend.

`smsCount` — number of free SMS included. `0` means no SMS benefit.

---

## 40. MRobotics Provider Status Code Mapping

When a recharge is processed, MRobotics returns numeric status codes. These are mapped to internal statuses. The frontend never sees the raw numeric codes — it always sees the internal status string. This table is for debugging only.

| MRobotics code | Meaning | Internal status |
|---|---|---|
| `1` | Success | `SUCCESS` |
| `2` | Pending | `PENDING` |
| `3` | Failed | `FAILED` |
| `4` | Refunded | `REFUNDED` |
| `5` | Duplicate (treated as success) | `SUCCESS` |
| `6` | Invalid request | `FAILED` |
| `7` | Timeout | `TIMEOUT` |
| `8` | Insufficient balance in MRobotics account | `FAILED` |

Code `5` (DUPLICATE) is mapped to `SUCCESS` because it means MRobotics already processed this transaction in a previous attempt.

### Provider errors that trigger automatic wallet refund

The wallet is automatically refunded when the final recharge status is `FAILED` in these cases:
1. Provider call fails entirely (network error, timeout)
2. Provider returns status `FAILED` or `INVALID` (`3` or `6`)
3. Retry cron exhausts all attempts and moves to dead letter
4. Webhook callback arrives with `FAILED` status

---

## 41. Recharge — Dead Letter State

A transaction enters dead letter state when it has been retried `maxRetries` times (default 3) and all attempts failed. Fields on the transaction:

```json
{
  "isInDeadLetter": true,
  "isRetryable": false,
  "status": "FAILED",
  "retryCount": 3,
  "maxRetries": 3
}
```

Dead letter transactions:
- Are **excluded** from the auto-retry cron
- Can still be manually retried by admin via `POST /recharge/:txnId/retry` (this bypasses the dead letter flag)
- The wallet has already been refunded at the point of dead letter entry

**Frontend:** Show a distinct "Dead Letter" badge or tooltip on these transactions in the admin view. The retry button should still be available for admins.

---

## 42. Recharge — getStatus Live Check

`GET /recharge/status/:txnId` and `GET /recharge/admin/status/:txnId` do more than a simple DB lookup. If the transaction is in `PENDING` or `PROCESSING` state, the backend calls MRobotics live to check the current status, updates the DB, and returns the updated status in the same response.

This means:
- The status you receive is always the most current available
- The response may be slightly slower for pending transactions (external API call)
- No need to implement client-side status polling — a single request is sufficient

**Frontend:** When the user checks a pending transaction, call this endpoint once. Show a loading spinner on the status field while the request is in flight. Do not poll repeatedly — use Socket.IO `recharge:update` instead for real-time updates.

---

## 43. Activity Log — What Gets Logged

The `logActivity` middleware is attached selectively to specific routes (not all routes). The following actions are tracked in the activity log:

These are the action strings that appear in the `action` field of activity log records:

```
LOGIN, LOGOUT, LOGIN_FAILED, TOKEN_REFRESH, PASSWORD_CHANGED,
PASSWORD_RESET_REQUESTED, PASSWORD_RESET_COMPLETED, ACCOUNT_LOCKED, ACCOUNT_UNLOCKED,
USER_CREATED, USER_UPDATED, USER_DELETED, USER_BLOCKED, USER_UNBLOCKED,
WALLET_CREDITED, WALLET_DEBITED, WALLET_FROZEN, WALLET_UNFROZEN, WALLET_SETTLED,
RECHARGE_INITIATED, RECHARGE_SUCCESS, RECHARGE_FAILED, RECHARGE_RETRY, RECHARGE_REFUNDED, RECHARGE_REVERSED,
SETTINGS_UPDATED, API_KEY_CREATED, API_KEY_REVOKED,
OPERATOR_CREATED, OPERATOR_UPDATED, OPERATOR_DELETED,
PLAN_CREATED, PLAN_UPDATED, PLAN_DELETED
```

Activity logs are only written when `body.success === true`. Failed requests are not logged to activity logs (they may appear in audit logs for sensitive actions).

**Retention:** 90 days (auto-deleted by MongoDB TTL).

**Frontend filter values for `GET /logs/activity?module=`:**
```
auth, user, wallet, recharge, settings, operator, plan
```

---

## 44. Audit Log — Retention and Sensitive Fields

Audit logs have a TTL of **365 days** (1 year). They are never deleted manually.

Unlike activity logs, audit logs capture `previousValue` and `newValue` (the before/after state of the changed record). These fields are marked `select: false` in the schema — they are not returned in paginated list results by default. They are stored but not exposed via the current `GET /logs/audit` endpoint.

Audit log `module` values used by the backend:
```
auth, user, wallet, recharge, settings, operator, plan
```

Audit severity scale:

| Severity | Used for |
|---|---|
| `LOW` | Logins, profile updates, read operations |
| `MEDIUM` | User creation, wallet credits/debits, settings updates, password changes |
| `HIGH` | User blocks, wallet freezes, password resets, account lockouts, recharge refunds |
| `CRITICAL` | User deletes |

**Frontend:** Colour-code the severity badge. `CRITICAL` should be red, `HIGH` amber, `MEDIUM` yellow, `LOW` grey.

---

## 45. Registration — What Happens Internally

When `POST /auth/register` succeeds, the backend performs these operations in a **single MongoDB transaction**:

1. Creates the `User` document
2. Creates a `Wallet` document linked to the user
3. Sets `user.wallet = wallet._id`
4. Commits the transaction

If any step fails, everything is rolled back. The user and wallet are always created together.

Additionally (outside the transaction, fire-and-forget):
- Sends a Welcome email to the new user
- Creates an audit log entry (`USER_CREATED`)

**Implication for frontend:** After a `201` response, the user object in `data.user` already has `wallet` populated with the wallet ID. You can immediately show the wallet balance (which will be `₹0`).

---


---

## 46. API Key Format

Every API key generated by this backend has a fixed format:

```
crm_<48-character-hex-string>
```

Example: `crm_a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4`

The `keyPrefix` stored on the key record is characters 5–12 of the raw key (the first 8 hex chars after `crm_`). This is safe to display in the UI as a key identifier without exposing the full key.

**Frontend:**
- On `POST /api-keys`, receive `rawKey` from the response, show it in a one-time modal with a copy button. Once the modal is closed, the key is gone forever.
- In the keys list, show `keyPrefix` as the key identifier (e.g. `crm_a1b2c3...`)
- Revoked keys have `isActive: false` and a non-null `revokedAt`

---

## 47. Settings — GET /settings/public Response Shape

This endpoint is documented in Section 8 but the exact response structure was missing. The backend returns **a flat key-value object**, not an array:

```json
{
  "success": true,
  "message": "Public settings retrieved",
  "data": {
    "settings": [
      { "key": "app.maintenanceMode", "value": false, "displayName": "Maintenance Mode", "group": "general", "dataType": "boolean" },
      { "key": "app.supportEmail", "value": "support@rechargecrmapp.com", "displayName": "Support Email", "group": "general", "dataType": "string" },
      { "key": "app.supportPhone", "value": "1800-xxx-xxxx", "displayName": "Support Phone", "group": "general", "dataType": "string" },
      { "key": "wallet.minRechargeAmount", "value": 10, "displayName": "Min Recharge Amount", "group": "wallet", "dataType": "number" },
      { "key": "wallet.maxRechargeAmount", "value": 10000, "displayName": "Max Recharge Amount", "group": "wallet", "dataType": "number" }
    ]
  }
}
```

`settings` is an **array** of setting objects (not a flat map). Iterate it to find the setting you need by `key`. The `dataType` field tells you how to parse `value`: `string`, `number`, `boolean`, `json`, `array`.

**Frontend:** To check maintenance mode:
```javascript
const maintenance = settings.find(s => s.key === 'app.maintenanceMode')?.value ?? false;
```

---

## 48. Settings — GET /settings (Admin) Response Shape

Returns paginated setting objects with additional admin-only fields:

```json
{
  "items": [
    {
      "_id": "...",
      "key": "wallet.commissionRate",
      "value": 0.02,
      "displayName": "Default Commission Rate",
      "description": "",
      "group": "wallet",
      "dataType": "number",
      "isPublic": false,
      "isEditable": true,
      "updatedBy": "ADMIN_USER_ID",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

**Frontend:** Group settings by `group` field for an organized settings page. Sections: `general`, `wallet`, `recharge`. Hide `isEditable: false` rows from the edit form.

---

## 49. Operator Conflict on Create

`POST /operators` returns `HTTP 409 Conflict` if an operator with the same `code` already exists:

```json
{
  "success": false,
  "message": "Operator with code 'AIRTEL' already exists",
  "errors": []
}
```

Same applies to `POST /operators/circles` — circle `code` must be unique.

**Frontend:** Show this as a field-level error on the `code` input, not a generic toast.

---

## 50. Search Support on List Endpoints

Several list endpoints support a `search` query param that performs a case-insensitive regex match across multiple fields. This is not documented per-endpoint above — here is the complete map:

| Endpoint | Search fields |
|---|---|
| `GET /users` | `name`, `email`, `phone`, `businessName` |
| `GET /operators` | `name`, `code` |
| `GET /recharge/my` | `mobileNumber`, `txnId`, `providerTxnId` |
| `GET /recharge/all` | `mobileNumber`, `txnId`, `providerTxnId` |
| `GET /reports/recharge` | `mobileNumber`, `txnId` |

Usage:
```
GET /users?search=rahul
GET /recharge/all?search=9876543210
```

---

## 51. Sort Support on All List Endpoints

All paginated list endpoints accept `sortBy` and `sortOrder` query params:

```
GET /recharge/all?sortBy=amount&sortOrder=asc
GET /users?sortBy=createdAt&sortOrder=desc
GET /reports/sales?sortBy=totalAmount&sortOrder=desc
```

`sortOrder` values: `asc` | `desc` (default: `desc`)  
`sortBy` default: `createdAt`

If `sortBy` is not provided, the default sort is `createdAt: -1` (newest first) for all list endpoints.

---

## 52. endDate Inclusive Behaviour

When filtering with `endDate`, the backend sets the time to `23:59:59.999` of that date:

```javascript
const end = new Date(endDate);
end.setHours(23, 59, 59, 999);
filter[field].$lte = end;
```

This means `endDate=2026-08-02` includes all records created on August 2nd up to the last millisecond. You do not need to pass `2026-08-02T23:59:59` from the frontend — just the date string is enough.

---

## 53. MongoDB Duplicate Key Error (HTTP 409)

If a duplicate key violation occurs at the database level (not caught at the service layer), the error handler returns:

```json
{
  "success": false,
  "message": "Duplicate value: 'rahul@example.com' already exists for email",
  "errors": []
}
```

This happens for: `email`, `phone`, `operator.code`, `circle.code`, `apiKey.keyHash`.

**Frontend:** Intercept `409` responses and show the message as a form-level or field-level error.

---

## 54. CastError — Invalid MongoDB ID (HTTP 400)

If a route param that expects a MongoDB ObjectId receives an invalid value, the error handler returns:

```json
{
  "success": false,
  "message": "Invalid value for field '_id': notanid",
  "errors": []
}
```

**Frontend:** Validate that any `:id` param in the URL is a 24-character hex string before making the request. This prevents unnecessary API calls.

---

## 55. Development-Only Error Detail

When `NODE_ENV=development`, error responses include `stack` and `name` fields:

```json
{
  "success": false,
  "message": "User not found",
  "errors": [],
  "stack": "NotFoundError: User not found\n    at ...",
  "name": "NotFoundError"
}
```

These fields are stripped in production. Do not rely on them in frontend logic.

---

## 56. API Request Logging Scope

Not all API requests are saved to the `ApiLog` collection — only:
- All requests that return HTTP 4xx or 5xx
- All requests to `/recharge/*` routes
- All requests to `/wallet/*` routes

All other routes (auth, users, settings, etc.) are only logged to the Winston file logger, not the DB.

This is relevant when using `GET /logs/activity` — you will see all actions. But there is no API endpoint to query `ApiLog` directly. It is internal only.

---

## 57. Plans Sorted by Amount Ascending

`GET /operators/plans/by-operator` returns plans sorted by `amount: 1` (lowest to highest price). This is intentional — the recharge plan selector should show cheapest plans first.

`GET /operators/plans` (admin list) also defaults to `amount: 1` sort.

---

## 58. Notification broadcast — roles filter behaviour

`POST /notifications/broadcast` with an empty `roles` array broadcasts to **all active users**:

```json
{ "title": "...", "message": "...", "roles": [] }
```

To target a specific role:
```json
{ "title": "...", "message": "...", "roles": ["retailer"] }
```

Multiple roles:
```json
{ "title": "...", "message": "...", "roles": ["admin", "retailer"] }
```

`isBroadcast: true` is set on every notification created by this endpoint, regardless of how many users it targeted.

---

## 59. Wallet Credit — Limit Guard

`POST /wallet/:userId/credit` will fail with HTTP 400 if the credit would push the wallet balance above its `walletLimit`:

```json
{
  "success": false,
  "message": "Credit would exceed wallet limit of ₹100000.00",
  "errors": []
}
```

Default `walletLimit` is ₹1,00,000 (set at wallet creation time from `wallet.defaultLimit` env var, default 100000).

**Frontend:** Show the current `walletLimit` and `balance` in the credit form so the admin knows the maximum creditable amount. Max creditable = `walletLimit - balance`.

---

## 60. Refund — assertRefundable Rules

`POST /recharge/:txnId/refund` fails with HTTP 400 if:

1. Transaction status is not `FAILED` or `SUCCESS`:
   ```json
   { "message": "Only FAILED or SUCCESS transactions can be refunded. Current status: PENDING" }
   ```

2. Transaction has already been refunded (`refundAmount > 0`):
   ```json
   { "message": "Transaction has already been refunded" }
   ```

**Frontend:** Show the refund button only when `status === 'FAILED' || status === 'SUCCESS'` AND `refundAmount === 0`.

---

## 61. Retry — assertRetryable Rules

`POST /recharge/:txnId/retry` fails with HTTP 400 if:

1. Transaction is in a non-retriable terminal status (e.g. `REFUNDED`, `REVERSED`, `SUCCESS`):
   ```json
   { "message": "Transaction in REFUNDED state cannot be retried" }
   ```

2. Retry count has reached max:
   ```json
   { "message": "Maximum retry attempts (3) reached" }
   ```

3. Transaction is in dead letter queue:
   ```json
   { "message": "Transaction is in dead letter queue" }
   ```

Note: Admin-initiated retry via the API **bypasses dead letter** — the service calls `assertRetryable` which does check `isInDeadLetter`. If you need to retry a dead-letter transaction, the dead letter flag must first be cleared in the DB manually.

**Frontend:** Show retry button for `status === 'FAILED' || status === 'TIMEOUT'` only. Disable it when `retryCount >= maxRetries` or `isInDeadLetter`.

---

## 62. Recharge — Retry Exponential Backoff Schedule

The auto-retry cron uses exponential backoff. The `nextRetryAt` field on the transaction shows when the next retry will run:

| Retry attempt | Delay from failure |
|---|---|
| 1st retry | 1 minute |
| 2nd retry | 2 minutes |
| 3rd retry | 4 minutes |

Base delay is 60 seconds, multiplied by `2^retryCount`. Maximum delay is capped at 30 minutes.

**Frontend:** Show `nextRetryAt` as "Next retry at HH:MM" on pending-retry transactions in the admin view.

---
