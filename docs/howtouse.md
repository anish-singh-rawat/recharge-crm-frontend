# RechargeCRM — How To Use

Ye application ek recharge management system hai jisme do type ke users hote hain — **Admin/Super Admin** aur **Retailer**. Niche step-by-step guide hai ki application ko kaise use karna hai.

---

## 1. Application Open Karo

Browser mein open karo:
```
http://localhost:5173
```

Agar already logged in nahi ho toh automatically `/login` page par redirect ho jaoge.

---

## 2. Login

**Route:** `http://localhost:5173/login`

- **Email ya Phone** field mein apna registered phone number ya email daalo
- **Password** daalo
- **Sign In** button click karo

Default Admin credentials:
```
Phone:    9000000000
Password: Admin@12345
```

Login hone ke baad automatically `/dashboard` par redirect hoga.

> Agar account nahi hai toh **Register** link click karo aur naya retailer account banao.

---

## 3. Register (Retailer ke liye)

**Route:** `http://localhost:5173/register`

- Full Name, Business Name, Email, Phone, Password bharo
- Password mein uppercase, lowercase, number aur special character hona chahiye (min 8 chars)
- **Create Account** click karo
- Account ban jaane ke baad `/login` par redirect hoga — wahan se login karo

---

## 4. Forgot Password

**Route:** `http://localhost:5173/forgot-password`

- Apna registered email daalo
- **Send Reset Link** click karo
- Email mein aaya link click karo aur naya password set karo

---

## Dashboard

**Route:** `http://localhost:5173/dashboard`

Login ke baad sabse pehle ye page dikhta hai.

**Kya dikhta hai:**
- Aaj ke total transactions aur amount
- All-time sales aur transactions
- Successful recharges count
- Sales by day chart (bar/line chart)
- Status breakdown pie chart (Success, Failed, Pending, etc.)
- Recent 5 transactions ki list

Admin ko sabka data dikhta hai, Retailer ko sirf apna.

---

## 5. Recharge Karna (Retailer)

**Route:** `http://localhost:5173/recharge`

Ye page sirf retailers ke liye hai.

**Steps:**
1. **Recharge Type** select karo — Mobile Prepaid, DTH, Broadband, Electricity, etc.
2. **Mobile / Account Number** daalo
3. **Operator** select karo (e.g. Airtel, Jio, Vi)
4. **Circle / State** select karo (e.g. Maharashtra, Delhi)
5. Right side mein **Available Plans** dikhenge — koi plan click karo toh amount automatically fill ho jayega
6. Ya manually **Amount** daalo
7. **Initiate Recharge** button click karo

**Transaction status** real-time update hota hai niche ki table mein. Status filter se specific status ke transactions dekh sakte ho — SUCCESS, FAILED, PENDING, etc.

Wallet balance top-left card mein dikhta hai.

---

## 6. My Wallet (Retailer)

**Route:** `http://localhost:5173/wallet`

- Current wallet **balance** dikhta hai
- Total **credit** aur total **debit** summary
- Poori **transaction statement** with pagination
- Har entry mein type (CREDIT/DEBIT), amount, balance after, description aur date hoti hai

---

## 7. Notifications

**Route:** `http://localhost:5173/notifications`

- Saari notifications yahan dikhti hain
- **Unread** notifications blue dot se mark hoti hain
- **Mark all read** button se sab ek saath read ho jaati hain
- Individual notification ko checkmark icon se read mark kar sakte ho
- Filter: All / Unread / Read

**Admin ke liye:**
- **Broadcast** button se poore system mein notification bhej sakte ho
- Target role select kar sakte ho — All, Retailers, Admins

---

## 8. Reports

**Route:** `http://localhost:5173/reports`

Date range se filter karo (default last 30 days).

**Retailer ke liye:**
- My Recharge Summary — total transactions, amount, success/fail count
- My Wallet Summary — total credit, debit, current balance

**Admin ke liye — 4 tabs:**

| Tab | Kya dikhta hai |
|---|---|
| Overview | Sales stats cards, daily sales line chart, sales by operator bar chart |
| Recharge | Paginated recharge transaction table with status filter |
| Wallet | Paginated wallet ledger table |
| Commission | Per-retailer commission earned table |

---

## 9. API Keys

**Route:** `http://localhost:5173/api-keys`

Programmatic access ke liye API keys manage karo.

**Naya key banane ke steps:**
1. **Create Key** button click karo
2. Key ka **naam** daalo (e.g. "Production Key")
3. **Permissions** select karo — recharge:initiate, wallet:read, etc.
4. Optional: **Expiry date** set karo
5. **Create Key** click karo
6. **Ek hi baar** raw key dikhega — copy kar lo, dobara nahi dikhega

Existing keys mein **Revoke** button se key band kar sakte ho.

---

## 10. Profile

**Route:** `http://localhost:5173/profile`

**Kya kar sakte ho:**
- **Avatar** change karo — camera icon click karo
- **Name, Business Name, GST, PAN, Address** update karo — Save Changes
- **Password change** karo — current password daalo, naya password daalo
- **Active Sessions** dekho — kaun se devices par login hai
- **Revoke All** se sab sessions band karo (current session bhi)
- **Login History** dekho — kab kahan se login hua

---

## Admin-Only Pages

Ye pages sirf Admin aur Super Admin ko dikhte hain.

---

### 11. Wallet Management (Admin)

**Route:** `http://localhost:5173/admin/wallet`

**Retailer ki wallet manage karo:**
- Search box mein retailer ka naam ya phone search karo (min 2 chars)
- Search results mein **View** — wallet balance aur recent transactions dekho
- **Credit** — retailer ki wallet mein paisa daalo
- **Debit** — retailer ki wallet se paisa nikalo
- **Freeze** — wallet band karo (reason daalo)
- **Unfreeze** — wallet phir se active karo
- Niche **Wallet Ledger** table mein sab transactions dikhte hain

---

### 12. All Transactions (Admin)

**Route:** `http://localhost:5173/admin/recharge`

Sab retailers ke sab recharge transactions.

- Status filter se filter karo
- **Retry** button (↻) — FAILED transactions dobara try karo
- **Refund** button — SUCCESS transactions ka refund karo (reason daalna hoga)

---

### 13. Users Management (Admin)

**Route:** `http://localhost:5173/admin/users`

- **Search** by name ya phone
- **Role filter** — All, Retailer, Admin, Super Admin
- **Add User** — naya user banao (role, email, phone, password set karo)
- **Eye icon** — user ki full details dekho
- **Pencil icon** — name, business name, GST, PAN update karo
- **Ban icon** — user ko block karo (reason daalo)
- **Checkmark icon** — blocked user ko unblock karo
- **Delete icon** — user delete karo (sirf Super Admin)

---

### 14. Operators & Plans (Admin)

**Route:** `http://localhost:5173/admin/operators`

Do tabs hain — **Operators** aur **Plans**.

**Operators tab:**
- **Add Operator** — naam, code, type, min/max amount, commission % set karo
- Edit (pencil) ya Deactivate (trash) kar sakte ho

**Plans tab:**
- **Add Plan** — operator select karo, circle select karo, amount, validity, description daalo
- Plans recharge page par automatically show hote hain jab matching operator/circle select hota hai

---

### 15. Logs (Admin)

**Route:** `http://localhost:5173/admin/logs`

Teen tabs hain:

| Tab | Kya hai |
|---|---|
| Activity Logs | Kaun user ne kya action kiya — module filter available |
| Audit Logs | Sensitive changes ka record — severity filter (LOW/MEDIUM/HIGH/CRITICAL) |
| Webhook Logs | Provider se aaye webhook callbacks — processed ya nahi |

---

### 16. Provider (Admin)

**Route:** `http://localhost:5173/admin/provider`

MRobotics provider ka live data:

- **Provider Balance** — current API wallet balance (refresh button se update karo)
- **Operators list** — provider ke saare operators
- **Circles list** — provider ke saare circles
- **Fetch Plans** — operator code aur circle code daalo, **Fetch Plans** click karo — live plans aayenge

---

### 17. Settings (Admin)

**Route:** `http://localhost:5173/admin/settings`

Application settings manage karo:

| Setting | Kya karta hai |
|---|---|
| app.maintenanceMode | true karo toh poori site maintenance page dikhayegi |
| app.supportEmail | Support email set karo |
| app.appName | Application ka naam |
| wallet.commissionRate | Default commission % |
| wallet.minRechargeAmount | Minimum recharge amount |
| wallet.maxRechargeAmount | Maximum recharge amount |

Har setting ke saate **Save** button hai. Niche sab settings ek saath bhi edit kar sakte ho.

---

## Real-Time Features

Ye cheezein automatically update hoti hain bina page refresh ke:

- **Recharge status** — jaise hi backend se update aaye, transaction table mein status change ho jaata hai
- **Wallet balance** — recharge hone ke baad automatically update hota hai
- **Notifications** — nai notification aane par bell icon par badge dikhtaa hai aur toast message aata hai
- **Wallet freeze/unfreeze** — agar admin ne freeze kiya toh toast message aata hai

---

## Navigation Guide

| Page | Route | Kaun dekh sakta hai |
|---|---|---|
| Login | /login | Sabke liye |
| Register | /register | Naye retailers |
| Dashboard | /dashboard | Admin + Retailer |
| Recharge | /recharge | Retailer only |
| My Wallet | /wallet | Retailer only |
| Reports | /reports | Admin + Retailer |
| Notifications | /notifications | Admin + Retailer |
| API Keys | /api-keys | Admin + Retailer |
| Profile | /profile | Admin + Retailer |
| Wallet Mgmt | /admin/wallet | Admin only |
| All Txns | /admin/recharge | Admin only |
| Users | /admin/users | Admin only |
| Operators | /admin/operators | Admin only |
| Logs | /admin/logs | Admin only |
| Provider | /admin/provider | Admin only |
| Settings | /admin/settings | Admin only |

---

## Common Issues

**Q: Recharge ke baad balance update nahi hua?**
A: Real-time socket connected hai — automatically update hona chahiye. Agar nahi hua toh page refresh karo.

**Q: Login ke baad dashboard blank hai?**
A: Backend server check karo ki `http://localhost:8080` chal raha hai ya nahi.

**Q: Notifications bell par count nahi dikh raha?**
A: Notifications page par jaao — wahan sab notifications dikhenge.

**Q: API Key raw value miss ho gayi?**
A: Key create karte waqt ek hi baar dikhta hai — revoke karo aur naya banao.

**Q: Maintenance mode on ho gaya aur kuch nahi dikh raha?**
A: Settings page par jaao aur `app.maintenanceMode` ko `false` karo.
