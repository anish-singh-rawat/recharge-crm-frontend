# Recharge CRM Backend — Frontend Integration Guide

## Source of Truth

**Postman Collection:** `docs/postman/RechargeCRM.postman_collection.json`

Import this file into Postman to get every endpoint with correct request bodies, auto-capture scripts, and collection variables pre-wired.

Live interactive Swagger UI (when server is running): `https://api.rechpays.in/api-docs`

---

## Base URL

```
Development:  https://api.rechpays.in/api/v1
Production:   https://your-domain.com/api/v1
```

---

## Authentication

The backend uses **JWT Bearer tokens** with **refresh token rotation**.

### Flow

1. `POST /auth/login` → receive `accessToken` (15 min TTL) + `refreshToken` (7 day TTL)
2. Attach to all protected requests: `Authorization: Bearer <accessToken>`
3. When access token expires → `POST /auth/refresh-token` with `refreshToken` → receive new token pair
4. On logout → `POST /auth/logout`

### Headers required on every protected request

```
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Alternative: API Key auth

```
X-API-Key: <apiKey>
Content-Type: application/json
```

---

## User Roles

| Role | Value | Access Level |
|------|-------|-------------|
| Super Admin | `super_admin` | Full access to everything |
| Admin | `admin` | Manage retailers, wallets, recharge, reports |
| Retailer | `retailer` | Recharge, wallet balance, own transactions |

---

## Standard Response Format

Every endpoint returns this exact shape:

### Success
```json
{
  "success": true,
  "message": "Human-readable message",
  "data": { }
}
```

### Paginated Success
```json
{
  "success": true,
  "message": "...",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [
    { "field": "email", "message": "Email is required", "value": "" }
  ]
}
```

---

## All Endpoints

### Health (no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ping` | Server liveness check |
| GET | `/health` | Health check with DB status |
| GET | `/version` | API version info |

---

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | None | Register new user/retailer |
| POST | `/auth/login` | None | Login → returns token pair |
| POST | `/auth/refresh-token` | None | Rotate tokens |
| POST | `/auth/forgot-password` | None | Send reset email |
| POST | `/auth/reset-password` | None | Reset with token from email |
| POST | `/auth/logout` | Bearer | Revoke current session |
| POST | `/auth/logout-all` | Bearer | Revoke all sessions |
| GET | `/auth/profile` | Bearer | Get own profile |
| PUT | `/auth/profile` | Bearer | Update own profile |
| PATCH | `/auth/profile/avatar` | Bearer | Upload avatar (multipart/form-data) |
| POST | `/auth/change-password` | Bearer | Change password |
| GET | `/auth/sessions` | Bearer | List active sessions |
| GET | `/auth/login-history` | Bearer | Last 20 logins |

#### POST /auth/register
```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "Secret@123",
  "confirmPassword": "Secret@123",
  "role": "retailer",
  "businessName": "Sharma Telecom",
  "commissionRate": 0.02
}
```

#### POST /auth/login
```json
{
  "identifier": "9876543210",
  "password": "Secret@123",
  "deviceId": "device-unique-id",
  "deviceName": "Chrome Browser",
  "deviceType": "desktop"
}
```
Response `data`:
```json
{
  "user": { "_id": "...", "name": "...", "email": "...", "phone": "...", "role": "retailer", "wallet": "..." },
  "accessToken": "eyJ...",
  "refreshToken": "eyJ..."
}
```

#### POST /auth/refresh-token
```json
{ "refreshToken": "eyJ..." }
```

#### POST /auth/forgot-password
```json
{ "email": "rahul@example.com" }
```

#### POST /auth/reset-password
```json
{
  "token": "TOKEN_FROM_EMAIL_LINK",
  "password": "NewSecret@123",
  "confirmPassword": "NewSecret@123"
}
```

#### POST /auth/change-password
```json
{
  "currentPassword": "Secret@123",
  "newPassword": "NewSecret@123",
  "confirmNewPassword": "NewSecret@123"
}
```

#### PUT /auth/profile
```json
{
  "name": "Updated Name",
  "businessName": "My Shop",
  "gstNumber": "27AAPFU0939F1ZV",
  "panNumber": "AAPFU0939F",
  "address": {
    "street": "123 Main St",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001"
  }
}
```

---

### Users (Admin / Super Admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/users?page=1&limit=20&role=retailer&search=rahul` | List users |
| POST | `/users` | Create user/retailer |
| GET | `/users/:id` | Get user by ID |
| PUT | `/users/:id` | Update user |
| DELETE | `/users/:id` | Soft-delete user (Super Admin) |
| PATCH | `/users/:id/block` | Block user |
| PATCH | `/users/:id/unblock` | Unblock user |

#### PATCH /users/:id/block
```json
{ "reason": "Suspicious activity" }
```

---

### Wallet

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wallet/me` | Retailer | Own wallet balance |
| GET | `/wallet/me/statement?page=1&startDate=2025-01-01` | Retailer | Own transaction statement |
| GET | `/wallet/ledger?page=1` | Admin | All wallet transactions |
| GET | `/wallet/:userId` | Admin | User wallet by ID |
| GET | `/wallet/:userId/statement` | Admin | User statement |
| POST | `/wallet/:userId/credit` | Admin | Credit wallet |
| POST | `/wallet/:userId/debit` | Admin | Debit wallet |
| PATCH | `/wallet/:userId/freeze` | Admin | Freeze wallet |
| PATCH | `/wallet/:userId/unfreeze` | Admin | Unfreeze wallet |

#### POST /wallet/:userId/credit
```json
{
  "amount": 1000,
  "description": "Manual top-up",
  "remarks": "Customer request"
}
```

#### PATCH /wallet/:userId/freeze
```json
{ "reason": "Suspected fraud" }
```

Wallet status values: `ACTIVE` | `FROZEN` | `SUSPENDED` | `CLOSED`

---

### Recharge

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/recharge` | Retailer | Initiate recharge |
| GET | `/recharge/my?page=1&status=SUCCESS` | Retailer | Own transactions |
| GET | `/recharge/status/:txnId` | Retailer | Check own transaction status |
| GET | `/recharge/all?page=1&userId=...` | Admin | All transactions |
| GET | `/recharge/admin/status/:txnId` | Admin | Any transaction status |
| POST | `/recharge/:txnId/retry` | Admin | Retry failed recharge |
| POST | `/recharge/:txnId/refund` | Admin | Manual refund |

#### POST /recharge
```json
{
  "mobileNumber": "9876543210",
  "amount": 199,
  "operatorId": "MONGO_OBJECT_ID",
  "circleId": "MONGO_OBJECT_ID",
  "type": "MOBILE_PREPAID"
}
```

Recharge types: `MOBILE_PREPAID` | `MOBILE_POSTPAID` | `DTH` | `BROADBAND` | `LANDLINE` | `ELECTRICITY` | `GAS` | `WATER` | `FASTAG` | `INSURANCE` | `LPG` | `CABLE_TV`

Transaction statuses: `INITIATED` | `PENDING` | `PROCESSING` | `SUCCESS` | `FAILED` | `REFUNDED` | `REVERSED` | `TIMEOUT`

#### POST /recharge/:txnId/refund
```json
{ "reason": "Customer requested refund after failed delivery" }
```

---

### Operators, Circles & Plans

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/operators/active?type=MOBILE_PREPAID` | Any | Active operators (for recharge form) |
| GET | `/operators?page=1` | Any | All operators paginated |
| POST | `/operators` | Admin | Create operator |
| GET | `/operators/:id` | Any | Get operator |
| PUT | `/operators/:id` | Admin | Update operator |
| DELETE | `/operators/:id` | Admin | Deactivate operator |
| GET | `/operators/circles/all` | Any | All active circles |
| POST | `/operators/circles` | Admin | Create circle |
| GET | `/operators/circles/:id` | Any | Get circle |
| PUT | `/operators/circles/:id` | Admin | Update circle |
| GET | `/operators/plans?operator=ID&circle=ID` | Any | List plans |
| GET | `/operators/plans/by-operator?operatorId=ID&circleId=ID` | Any | Plans for recharge form |
| POST | `/operators/plans` | Admin | Create plan |
| GET | `/operators/plans/:id` | Any | Get plan |
| PUT | `/operators/plans/:id` | Admin | Update plan |
| DELETE | `/operators/plans/:id` | Admin | Deactivate plan |

#### POST /operators
```json
{
  "name": "Airtel",
  "code": "AIRTEL",
  "type": "MOBILE_PREPAID",
  "providerCode": "AIRTEL",
  "minAmount": 10,
  "maxAmount": 5000,
  "commission": 2
}
```

---

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications/my?page=1&isRead=false` | Any | My notifications + unreadCount |
| PATCH | `/notifications/my/read-all` | Any | Mark all as read |
| PATCH | `/notifications/my/:id/read` | Any | Mark one as read |
| GET | `/notifications?page=1` | Admin | All notifications |
| POST | `/notifications` | Admin | Send to specific user |
| POST | `/notifications/broadcast` | Admin | Broadcast to all/role |
| DELETE | `/notifications/:id` | Admin | Delete notification |

Response for `GET /notifications/my` includes `unreadCount` at root level:
```json
{
  "data": {
    "items": [...],
    "pagination": {...},
    "unreadCount": 5
  }
}
```

#### POST /notifications/broadcast
```json
{
  "title": "Maintenance Tonight",
  "message": "Scheduled downtime 2AM–4AM",
  "type": "WARNING",
  "roles": ["retailer"]
}
```

Notification types: `INFO` | `SUCCESS` | `WARNING` | `ERROR` | `ALERT`

---

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/reports/dashboard` | Any | Dashboard stats (scoped to role) |
| GET | `/reports/recharge/my?startDate=...` | Retailer | Own recharge report |
| GET | `/reports/wallet/my?startDate=...` | Retailer | Own wallet report |
| GET | `/reports/sales?startDate=...&endDate=...` | Admin | Full sales report + summary |
| GET | `/reports/sales/by-day?startDate=...` | Admin | Daily sales chart data |
| GET | `/reports/sales/by-operator` | Admin | Sales grouped by operator |
| GET | `/reports/recharge?page=1&status=FAILED` | Admin | Recharge report |
| GET | `/reports/wallet?page=1&userId=...` | Admin | Wallet report |
| GET | `/reports/commission?userId=...` | Admin | Commission report per retailer |

Dashboard response `data`:
```json
{
  "today": { "totalTransactions": 12, "totalAmount": 2400, "successCount": 11 },
  "allTime": { "totalTransactions": 450, "totalAmount": 89000, "totalCommission": 1780 },
  "statusBreakdown": [{ "_id": "SUCCESS", "count": 420, "amount": 84000 }]
}
```

---

### API Keys

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api-keys` | List own API keys |
| POST | `/api-keys` | Create — `rawKey` returned once only |
| GET | `/api-keys/:id` | Get by ID |
| PATCH | `/api-keys/:id/revoke` | Revoke |

#### POST /api-keys
```json
{
  "name": "Production Key",
  "permissions": ["recharge:initiate", "recharge:read", "wallet:read"],
  "allowedIps": [],
  "expiresAt": null
}
```
Response includes `rawKey` — **display it to the user immediately, it is never retrievable again**.

---

### Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings/public` | None | Public settings (no auth) |
| GET | `/settings?page=1` | Admin | All settings |
| GET | `/settings/:key` | Admin | Get by key |
| PUT | `/settings/:key` | Admin | Update value |
| POST | `/settings/bulk` | Super Admin | Bulk update |

Common setting keys: `app.maintenanceMode`, `wallet.commissionRate`, `wallet.minRechargeAmount`, `wallet.maxRechargeAmount`, `app.supportEmail`

---

### Provider (Admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/provider` | List providers |
| GET | `/provider/balance` | MRobotics live balance |
| GET | `/provider/operators` | Operators from MRobotics |
| GET | `/provider/circles` | Circles from MRobotics |
| GET | `/provider/plans?operatorCode=AIRTEL&circleCode=MH` | Plans from MRobotics |
| GET | `/provider/detect-operator?mobile=9876543210` | Detect operator for mobile |

---

### Logs (Admin only)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/logs/activity?page=1&userId=...&module=recharge` | Activity logs |
| GET | `/logs/audit?page=1&severity=HIGH` | Audit logs |
| GET | `/logs/webhooks?page=1&isProcessed=false` | Webhook logs |

---

### Webhooks (MRobotics → Backend)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/mrobotics` | Signature | Recharge status callback |

Header: `X-MRobotics-Signature: <hmac_sha256_signature>`

---

## Real-time (Socket.IO)

Connect to the WebSocket server at the same base URL.

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.rechpays.in', {
  auth: { token: '<accessToken>' }
});
```

### Events the frontend should listen for

| Event | Payload | Description |
|-------|---------|-------------|
| `recharge:update` | `{ txnId, status, transaction }` | Recharge status changed (own) |
| `recharge:success` | `{ transaction }` | Recharge confirmed success |
| `recharge:failed` | `{ transaction }` | Recharge failed |
| `wallet:update` | `{ balance, transaction }` | Wallet balance changed |
| `wallet:frozen` | `{}` | Wallet frozen |
| `wallet:unfrozen` | `{}` | Wallet unfrozen |
| `notification:new` | `{ notification }` | New in-app notification |
| `notification:broadcast` | `{ notification }` | System-wide broadcast |

---

## Pagination Query Parameters

All list endpoints accept:

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `page` | 1 | — | Page number |
| `limit` | 20 | 100 | Items per page |
| `startDate` | — | — | ISO 8601 date filter |
| `endDate` | — | — | ISO 8601 date filter |
| `sortBy` | `createdAt` | — | Sort field |
| `sortOrder` | `desc` | — | `asc` or `desc` |

---

## Rate Limits

| Endpoint Group | Limit |
|---------------|-------|
| All routes | 100 req / 15 min per IP |
| `/auth/login`, `/auth/register` | 10 req / 15 min per IP |
| `/recharge` (POST) | 30 req / min per user |
| `/auth/forgot-password` | 3 req / hr per IP |

When exceeded: HTTP `429` with `{ "success": false, "message": "Too many requests..." }`

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / business rule violation |
| 401 | Not authenticated / token expired |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate email/phone) |
| 422 | Validation failed (field errors in `errors[]`) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |
| 503 | Maintenance mode active |

---

## Password Rules

Minimum 8 characters, must contain:
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character: `@$!%*?&`

---

## Phone Number Format

Indian mobile numbers only: 10 digits starting with 6, 7, 8, or 9.
Example: `9876543210`

---

## Key Frontend Implementation Notes

**Token storage:** Store `accessToken` in memory (not localStorage). Store `refreshToken` in an HttpOnly cookie (the backend sets this automatically on login) or in memory. Never store in localStorage.

**Auto-refresh:** Intercept 401 responses → call `POST /auth/refresh-token` → retry the original request with the new access token. If refresh also fails, redirect to login.

**Recharge form flow:**
1. Fetch active operators: `GET /operators/active?type=MOBILE_PREPAID`
2. Fetch circles: `GET /operators/circles/all`
3. Fetch plans for selected operator+circle: `GET /operators/plans/by-operator?operatorId=X&circleId=Y`
4. Submit: `POST /recharge`
5. Poll status via Socket.IO `recharge:update` event OR poll `GET /recharge/status/:txnId`

**Wallet balance refresh:** Listen to `wallet:update` Socket.IO event to update balance in real-time without polling.

**Notification badge:** Use `unreadCount` from `GET /notifications/my` response. Decrement on mark-read. Listen to `notification:new` Socket.IO event to increment badge without polling.

**Maintenance mode:** When `GET /settings/public` returns `app.maintenanceMode: true`, show a maintenance page. The backend also returns HTTP 503 for all API calls during maintenance.

---

## Seeding Initial Data

Before first use, run the seeder to create the super admin, roles, and default settings:

```
node src/jobs/seed.js
```

Default super admin credentials (change immediately after first login):
- Email: `admin@rechargecrmapp.com`
- Phone: `9000000000`
- Password: `Admin@12345`

---

## Environment Variables Required for Production

```
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=<64+ char random string>
JWT_REFRESH_SECRET=<64+ char random string>
WEBHOOK_SECRET=<32+ char random string>
API_KEY_ENCRYPTION_SECRET=<32 char string>
MROBOTICS_BASE_URL=https://api.mrobotics.in
MROBOTICS_API_KEY=<from MRobotics dashboard>
MROBOTICS_API_SECRET=<from MRobotics dashboard>
MROBOTICS_MEMBER_ID=<from MRobotics dashboard>
SMTP_HOST=<smtp host>
SMTP_USER=<email>
SMTP_PASS=<app password>
FRONTEND_URL=https://your-frontend-domain.com
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

---

## Postman Collection

File: `docs/postman/RechargeCRM.postman_collection.json`

Import into Postman. The collection:
- Auto-captures `accessToken`, `refreshToken`, `userId`, `txnId`, `operatorId`, `circleId`, `planId`, `apiKeyId` from responses
- All 60+ requests pre-configured with correct bodies and headers
- Set collection variable `baseUrl` to your server URL before running

---

*This document is the single source of truth for frontend integration.*
*Backend version: 1.0.0 | Node.js 20+ | Express 4 | MongoDB*


---

---

# Frontend Design & Feature Specification

---

## Tech Stack Recommendation

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14+ (App Router) |
| Language | JavaScript (no TypeScript) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Charts | Recharts |
| Icons | Lucide React |
| State Management | Zustand |
| Server State / Caching | TanStack Query (React Query) |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios with interceptors |
| Real-time | socket.io-client |
| Notifications (toast) | react-hot-toast |
| Date handling | date-fns |
| Table | TanStack Table |

---

## Design Language

### Brand Identity

- **Product name:** RechPays
- **Tagline:** Fast. Reliable. Profitable.
- **Tone:** Professional, trustworthy, clean — like a fintech dashboard (not a consumer app)
- **Inspiration:** Razorpay Dashboard, Paytm for Business, Stripe Dashboard

---

## Color System

### Primary Palette

```
Primary Blue:      #2563EB   (brand, buttons, links, active states)
Primary Dark:      #1D4ED8   (hover on primary)
Primary Light:     #DBEAFE   (backgrounds, badges, highlights)

Accent Indigo:     #4F46E5   (secondary actions, gradients)
Accent Light:      #EEF2FF   (sidebar hover, tag backgrounds)
```

### Semantic Colors

```
Success Green:     #16A34A   (SUCCESS status, credited, active)
Success Light:     #DCFCE7   (success badges, row highlights)

Warning Amber:     #D97706   (PENDING, PROCESSING, low balance)
Warning Light:     #FEF3C7   (warning badges)

Danger Red:        #DC2626   (FAILED, TIMEOUT, blocked, frozen)
Danger Light:      #FEE2E2   (error badges, danger rows)

Info Teal:         #0891B2   (REFUNDED, REVERSED, informational)
Info Light:        #CFFAFE   (info badges)

Purple:            #7C3AED   (commission, premium features)
Purple Light:      #EDE9FE   (commission badges)
```

### Neutral Palette

```
Background:        #F8FAFC   (page background)
Surface:           #FFFFFF   (cards, modals, panels)
Border:            #E2E8F0   (dividers, input borders)
Border Dark:       #CBD5E1   (table borders, separators)

Text Primary:      #0F172A   (headings, important values)
Text Secondary:    #475569   (labels, subtitles, meta)
Text Muted:        #94A3B8   (placeholders, disabled)
Text Inverse:      #FFFFFF   (on dark backgrounds)

Sidebar BG:        #1E293B   (dark sidebar)
Sidebar Text:      #94A3B8   (inactive nav items)
Sidebar Active:    #FFFFFF   (active nav item text)
Sidebar Active BG: #2563EB   (active nav item background)
Sidebar Hover:     #334155   (hover state)
```

### Dark Mode (optional, secondary priority)

```
DM Background:     #0F172A
DM Surface:        #1E293B
DM Border:         #334155
DM Text Primary:   #F1F5F9
DM Text Secondary: #94A3B8
```

---

## Typography

```
Font Family:    Inter (Google Fonts)
Fallback:       -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif

Display:        32px / 700 weight  — page titles
H1:             24px / 700 weight  — section headings
H2:             20px / 600 weight  — card headings
H3:             16px / 600 weight  — subsection labels
Body:           14px / 400 weight  — general content
Body Small:     13px / 400 weight  — table cells, meta
Caption:        12px / 400 weight  — timestamps, footnotes
Label:          12px / 500 weight  — form labels, badges
Monospace:      'Fira Code', monospace — txnId, API keys, amounts
```

---

## Spacing & Layout

```
Base unit:     4px
Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px

Border radius:
  sm:   4px   (badges, tags)
  md:   8px   (inputs, buttons)
  lg:   12px  (cards)
  xl:   16px  (modals)
  full: 9999px (pills, avatars)

Shadow:
  card:   0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)
  modal:  0 20px 60px rgba(0,0,0,0.15)
  hover:  0 4px 12px rgba(37,99,235,0.15)

Container max-width: 1280px
Sidebar width: 240px (collapsed: 64px)
Top header height: 64px
```

---

## Responsive Breakpoints

```
Mobile:   < 640px    (sm)
Tablet:   640–1023px (md)
Desktop:  1024–1279px (lg)
Wide:     ≥ 1280px   (xl)
```

### Responsive Behavior Rules

- **Mobile:** Sidebar collapses to bottom tab bar (5 icons max). All tables become card lists. Modals become full-screen bottom sheets.
- **Tablet:** Sidebar becomes icon-only rail (64px). Tables scroll horizontally. 2-column grids.
- **Desktop:** Full sidebar (240px). Standard table layout. 3-4 column stat grids.
- All forms are single-column on mobile, 2-column on desktop.
- All stat cards stack to 2×2 on tablet, 4×1 on desktop.
- Recharge form is full-width on mobile, centered 480px card on desktop.
