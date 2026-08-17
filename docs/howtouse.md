# RechPays — Complete Usage Guide (Hinglish)

---

## Application kya hai?

RechPays ek B2B recharge management platform hai. Isme **Super Admin** system ko control karta hai, **Admin** daily operations manage karta hai, aur **Retailers** apne customers ke liye recharges karte hain. Har retailer ka ek wallet hota hai jisme balance hona chahiye recharge karne ke liye.

---

## User Roles

| Role | Kya kar sakta hai |
|---|---|
| **Super Admin** | Sab kuch — users delete, settings bulk update, operators delete |
| **Admin** | Users banao, wallets manage karo, operators/plans manage karo, logs dekho |
| **Retailer** | Sirf recharge karo, apna wallet aur reports dekho |

Default Super Admin credentials:
```
Phone:    9000000000
Password: Admin@12345
```

---

## STEP-BY-STEP FULL WORKFLOW

---

## STEP 1 — Super Admin / Admin Login

**URL:** `https://rechpays.in/login`

1. Phone number ya email daalo: `9000000000`
2. Password daalo: `Admin@12345`
3. **Sign In** click karo
4. Dashboard open ho jayega

> Agar 5 baar galat password daala toh account 30 minute ke liye lock ho jaata hai. Lock message screen par dikhega.

---

## STEP 2 — Retailer Account Banana (Admin karta hai)

**URL:** `https://rechpays.in/admin/users`

Jab bhi koi naya shopkeeper ya distributor system join kare, Admin uska account banata hai.

**Steps:**
1. Left sidebar mein **Users** click karo
2. Top-right mein **Add User** button click karo
3. Form bharo:
   - **Full Name**: Rahul Sharma
   - **Business Name**: Sharma Telecom (optional)
   - **Email**: rahul@example.com
   - **Phone**: 9876543210
   - **Role**: Retailer select karo
   - **Password**: Koi strong password (uppercase + lowercase + number + special char, min 8)
   - **Confirm Password**: Same password dobara
4. **Create User** click karo
5. Success message aayega — retailer ka account ban gaya

> Super Admin chahe toh Admin role bhi de sakta hai.

---

## STEP 3 — Retailer Ki Wallet Mein Paisa Dalna (Credit)

**URL:** `https://rechpays.in/admin/wallet`

Retailer recharge karne ke liye uski wallet mein pehle balance hona chahiye. Admin hi balance dalta hai.

**Steps:**
1. Left sidebar mein **Wallet** (Admin section) click karo
2. **Find Retailer Wallet** search box mein retailer ka naam ya phone number daalo (minimum 2 characters)
3. Results mein retailer dikhega — **Credit** button click karo
4. Modal khulega:
   - **Amount**: Kitna credit karna hai (e.g. 5000)
   - **Description**: "Initial wallet top-up" ya koi reason
   - **Remarks**: Optional notes
5. **Credit** button click karo
6. Success toast aayega — retailer ki wallet mein balance aa gaya

**Verification:** Retailer apni wallet `https://rechpays.in/wallet` par dekh sakta hai.

---

## STEP 4 — Retailer Login Karna

**URL:** `https://rechpays.in/login`

Retailer apna account khud bhi bana sakta hai ya Admin ne jo account banaya usse login kare:

1. Phone number ya email daalo
2. Password daalo
3. **Sign In** click karo
4. Retailer ka dashboard open hoga — sirf uski data dikhegi (admin data nahi)

---

## STEP 5 — Mobile Recharge Karna (Retailer)

**URL:** `https://rechpays.in/recharge`

Yahi main kaam hai retailer ka — customers ke liye recharge karna.

**Detailed Steps:**

**Step 5a — Recharge Type Select Karo**
- Mobile Prepaid, Mobile Postpaid, DTH, Broadband, Electricity, Gas, etc.
- Default "Mobile Prepaid" selected rehta hai

**Step 5b — Mobile Number Daalo**
- Customer ka 10-digit mobile number enter karo
- Mobile number enter karne ke baad field se bahar click karo (onBlur)
- **Auto-detect**: System automatically MRobotics API se operator detect karega aur operator + circle automatically fill ho jaayega
- Agar auto-detect nahi hota toh manually select karo

**Step 5c — Operator Select Karo**
- Airtel, Jio, Vi, BSNL, etc. (system mein registered operators)
- Auto-detect ne jo bhara use change bhi kar sakte ho

**Step 5d — Circle Select Karo**
- Maharashtra, Delhi, Karnataka, etc.
- Auto-detect se fill hota hai

**Step 5e — Plan Select Karo (Optional)**
- Right side mein available plans grid dikhega
- Koi plan card click karo → amount automatically fill ho jaata hai
- Ya manually amount type karo

**Step 5f — Submit Karo**
- **Initiate Recharge** button click karo
- "Recharge initiated!" toast aayega
- Last Transaction card left side mein update ho jaata hai
- Status real-time update hota hai (Socket.IO se) — SUCCESS, FAILED, PENDING

**Wallet Balance:** Left side mein current balance dikhta hai. Recharge successful hone par balance automatically cut ho jaata hai.

---

## STEP 6 — Apni Transactions Dekhna (Retailer)

Recharge page par hi neeche **My Transactions** table hai:

- **Filter by Status**: SUCCESS, FAILED, PENDING, etc.
- **Filter by Mobile**: Kisi specific number ke transactions dhundho
- Pagination available hai

---

## STEP 7 — Apna Wallet Statement Dekhna (Retailer)

**URL:** `https://rechpays.in/wallet`

- Top mein current **balance** dikhta hai
- Total **Credit** aur total **Debit** summary
- Niche poori **Transaction Statement** — har credit/debit entry with description aur date
- Date filter available hai

---

## STEP 8 — Apni Reports Dekhna (Retailer)

**URL:** `https://rechpays.in/reports`

- Date range select karo (default last 30 days)
- **My Recharge Summary**: Total transactions, amount, success/fail count
- **My Wallet Summary**: Total credit, total debit, etc.

---

## ADMIN OPERATIONS

---

## Admin — Sab Transactions Dekhna

**URL:** `https://rechpays.in/admin/recharge`

Sab retailers ke sab recharge transactions ek jagah:

- **Mobile filter**: Kisi specific number ke transactions dhundho
- **Status filter**: SUCCESS, FAILED, PENDING, etc.
- **Retry button** (↻): FAILED ya TIMEOUT transactions dobara try karo
- **Refund button**: SUCCESS transaction ka refund karo (reason daalna hoga)
- Real-time updates — jab bhi koi retailer recharge kare, table automatically refresh hota hai

---

## Admin — Wallet Management

**URL:** `https://rechpays.in/admin/wallet`

**Retailer wallet dhundho:**
1. Search box mein naam ya phone daalo
2. Results mein:
   - **View**: Wallet balance + recent transactions
   - **Credit**: Paisa add karo
   - **Debit**: Paisa nikalo (penalty, chargeback)
   - **Freeze**: Wallet band karo
   - **Unfreeze**: Wallet dobara activate karo

**Wallet Ledger:**
Niche table mein sab users ke sab wallet transactions dikhte hain — CREDIT, DEBIT, REFUND, COMMISSION, etc.

---

## Admin — Operators Manage Karna

**URL:** `https://rechpays.in/admin/operators`

**Operators Tab:**
- **Add Operator**: Naam, Code (AIRTEL), Type (Mobile Prepaid), Min/Max amount, Commission %
- Edit ya Deactivate operators

**Plans Tab:**
- **Add Plan**: Operator select, Circle select, Amount, Validity (days), Description
- Ye plans retailer ke recharge form par automatically dikhte hain

> Plans add karne ke baad retailers recharge form mein plan cards mein dekh sakte hain.

---

## Admin — Users Manage Karna

**URL:** `https://rechpays.in/admin/users`

- **Search**: Name ya phone se filter
- **Role filter**: Retailer, Admin, Super Admin
- **Add User**: Naya account banao
- **Edit** (pencil icon): Name, business name, GST, PAN update karo
- **Block/Unblock**: User ko temporarily disable karo
- **View** (eye icon): Full user details dekho
- **Delete** (Super Admin only): Permanent delete

---

## Admin — Reports

**URL:** `https://rechpays.in/reports`

4 tabs:

**Overview:**
- Total sales, transactions, success rate, commission summary
- Daily sales line chart
- Sales by operator bar chart

**Recharge:**
- Paginated recharge report with status filter
- Date range filter

**Wallet:**
- Sab wallet transactions paginated

**Commission:**
- Har retailer ne kitna commission kamaya
- Commission rate × total sales amount

---

## Admin — Provider (MRobotics)

**URL:** `https://rechpays.in/admin/provider`

- **Live Balance**: MRobotics API se current balance (Refresh button se update)
- **Operators**: Provider ke registered operators
- **Circles**: Provider ke circles
- **Fetch Plans**: Operator Code + Circle Code daalo → live plans fetch karo

---

## Admin — Settings

**URL:** `https://rechpays.in/admin/settings`

Important settings:

| Setting | Kya karta hai |
|---|---|
| `app.maintenanceMode` | `true` karo → poori site maintenance page dikhayegi |
| `app.supportEmail` | Support contact |
| `wallet.commissionRate` | Default commission % (0.02 = 2%) |
| `wallet.minRechargeAmount` | Minimum recharge in ₹ |
| `wallet.maxRechargeAmount` | Maximum recharge in ₹ |

- Har setting ke saath **Save** button hai individual save ke liye
- **Save All** button (Super Admin only) — sab changes ek saath save

---

## Admin — Logs

**URL:** `https://rechpays.in/admin/logs`

3 tabs:

**Activity Logs:**
- Kaun user ne kya action kiya, kab, kis IP se
- Module filter: recharge, wallet, auth, users, operators

**Audit Logs:**
- Sensitive operations ka record — user block, wallet credit, setting change
- Severity filter: LOW, MEDIUM, HIGH, CRITICAL

**Webhook Logs:**
- MRobotics se aaye webhook callbacks
- `isProcessed: false` filter karo unprocessed webhooks dekhne ke liye

---

## Notifications

**URL:** `https://rechpays.in/notifications`

**Retailers:**
- Recharge success/fail, wallet credit/debit, account lock, password change — sab notifications yahan
- Unread notifications bell icon par badge se dikhengi
- **Mark all read** button

**Admins:**
- **Send** button: Kisi specific user ko notification bhejo (User ID daalo)
- **Broadcast** button: Sab users ya specific role ko notification bhejo

---

## API Keys

**URL:** `https://rechpays.in/api-keys`

Agar programmatically recharge karna ho (third-party integration):

1. **Create Key** click karo
2. Naam daalo + permissions select karo
3. Expiry date optional
4. **Create Key** → **Raw key ek hi baar dikhega** — turant copy karo
5. API calls mein header mein daalo: `X-API-Key: crm_<rawkey>`

---

## Profile

**URL:** `https://rechpays.in/profile`

- **Avatar change**: Camera icon click karo
- **Profile edit**: Name, business, GST, PAN, address
- **Password change**: Current + new password
- **Active Sessions**: Kaun se devices par login hai
- **Revoke All**: Sab devices se logout
- **Login History**: Kab kahan se login hua

---

## COMPLETE USER JOURNEY — Summary

```
Super Admin Login
    │
    ├── Operators add karo (Admin/Operators page)
    ├── Plans add karo (Admin/Operators page)
    │
    ├── Retailer account banao (Admin/Users page)
    ├── Retailer wallet mein credit karo (Admin/Wallet page)
    │
Retailer Login
    │
    ├── Recharge page kholo
    ├── Mobile number daalo (auto-detect operator)
    ├── Operator + Circle + Amount/Plan select karo
    ├── Initiate Recharge → Real-time status update
    │
    ├── Wallet page → balance aur statement dekho
    └── Reports page → apna performance dekho
```

---

## Real-Time Features (Automatic)

Ye cheezein bina page refresh ke hoti hain:

- Recharge initiate karo → status PENDING → SUCCESS/FAILED automatically update
- Admin wallet credit kare → retailer ka balance automatically update
- Admin wallet freeze kare → retailer ko immediately notification
- Nai notification aaye → bell par badge update + toast message
- Admin ko `recharge:update:all` event — kisi bhi retailer ka recharge update ho to admin page live refresh

---

## Common Issues & Solutions

**Q: Recharge fail ho raha hai?**
A: Wallet balance check karo. Agar balance hai aur phir bhi fail ho raha hai, Admin se contact karo — wo retry kar sakta hai.

**Q: Login nahi ho raha?**
A: 5 baar galat password se 30 min lock hota hai. Wait karo ya Admin se unblock karwao.

**Q: Operator select nahi ho raha / list khali hai?**
A: Admin se operators add karwao (`/admin/operators`).

**Q: Wallet balance nahi dikh raha?**
A: Page refresh karo. Socket.IO real-time update karta hai, agar disconnect ho toh refresh karo.

**Q: Maintenance page aa rahi hai?**
A: Admin ne `app.maintenanceMode` true kiya hoga. Admin Settings page par jaake false kare.

**Q: API Key ka raw value miss ho gaya?**
A: Revoke karo aur naya banao — raw key sirf ek baar dikhti hai.
