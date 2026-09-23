# CakeCart — Production-Ready Home-Bakery Platform

> **Artisanal Custom Bakery & Celebration Patisserie Web Application**  
> Engineered with strict daily capacity limits, time-windowed pickup slots, custom cake message piping, atomic concurrency controls, collection QR codes, a comprehensive head baker dashboard, and full Vercel deployment readiness.

---

## 🎂 Project Overview & The CakeCart Team

CakeCart is built by the **CakeCart Team** comprised of three specialized agents:

1. **Agent 1 — App Agent (Frontend & UI/UX Specialist)**
   - Built a responsive bakery web interface with an artisanal palette (warm cream, velvet cocoa, terracotta, gold).
   - Pages: Home, Catalog Menu with multi-criteria filters, Cake Customizer with live 40-character limit counter, Pickup Date & Slot Calendar, Basket Drawer, Checkout with 10-minute hold ticker, Order Confirmation with scannable Collection QR code, Customer Portal with 24-hour cancellation cut-off, and Baker Control Center.
   - Connected every screen to the live database without placeholders.

2. **Agent 2 — Database & Backend Agent (Data Architecture & Concurrency Specialist)**
   - Implemented Drizzle ORM schema on PostgreSQL with strict check constraints, UUID primary keys, UTC timestamps, and integer minor units.
   - Implemented the **10-Step Atomic Order Transaction** with row-level locks (`SELECT FOR UPDATE`), 10-minute hold expiration, and server-side pricing.
   - Built idempotent expired hold release cron (`/api/cron/release-expired-holds`) protected by `CRON_SECRET`.
   - Built seed dataset with 6 gourmet cakes, sizes, flavours, dietary tags (Eggless, Gluten-Free, Nut-Free, Vegan), 14 rolling calendar days of capacity, and pickup slots.

3. **Agent 3 — QA Agent (Testing & Deployment Specialist)**
   - Authored automated test suite (`tests/order-rules.test.ts`) covering 48-hour minimum lead times, 40-char limits, 24-hour cancellation cut-offs, hold expiration, and payment idempotency.
   - Authored concurrency stress test (`tests/concurrency.test.ts`) simulating concurrent race conditions on the last available cake, verifying that capacity never overbooks and constraints are preserved.
   - Verified clean database migrations, seed scripts, and Next.js production builds.

---

## 🛠 Technology Stack

- **Framework**: Next.js 14 (App Router, Server Actions, API Routes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom artisanal design tokens
- **Database**: Neon Serverless PostgreSQL (pooled connection) with local zero-config PostgreSQL fallback
- **ORM & Migrations**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Authentication**: Email + password with `bcryptjs` hashing and secure JWT sessions stored in `httpOnly`, `SameSite=Lax` cookies
- **QR Codes**: `qrcode` collection pass generator
- **Image Storage**: Vercel Blob (`@vercel/blob`) with local fallback
- **Payments**: Test mode payment provider with idempotency keys
- **Cron Jobs**: Vercel Cron (`vercel.json`) protecting scheduled cleanup endpoints

---

## 🗄 Database Schema & Rules

### Tables (`src/db/schema.ts`)
1. `users`: UUID PK, unique email, password hash, role (`customer` | `baker`), UTC timestamps.
2. `categories`: UUID PK, name, unique slug, display order.
3. `products`: UUID PK, name, unique slug, description, `base_price_cents` (integer minor units), image URL, active flag.
4. `product_categories`: Compound PK `(product_id, category_id)` with cascade.
5. `product_options`: UUID PK, `product_id`, type (`size` | `flavour`), name, `price_modifier_cents` (integer), default flag.
6. `dietary_tags`: UUID PK, name, unique slug, icon (`Eggless`, `Gluten-Free`, `Nut-Free`, `Vegan`).
7. `product_dietary_tags`: Compound PK `(product_id, dietary_tag_id)`.
8. `daily_capacity`: UUID PK, `bakery_date` (unique date), `max_cakes`, `reserved_cakes`, `is_closed`.
   - **Check Constraint**: `CHECK (reserved_cakes >= 0 AND reserved_cakes <= max_cakes)`
   - **Check Constraint**: `CHECK (max_cakes >= 0)`
9. `pickup_slots`: UUID PK, `bakery_date`, `start_time` (e.g. `10:00`), `end_time` (e.g. `12:00`), `max_orders`, `reserved_orders`.
   - **Check Constraint**: `CHECK (reserved_orders >= 0 AND reserved_orders <= max_orders)`
10. `orders`: UUID PK, unique `order_reference` (`CC-YYYY-XXXX`), `user_id`, customer contact details, `pickup_date`, `pickup_slot_id`, status (`PENDING`, `CONFIRMED`, `BAKING`, `READY`, `COLLECTED`, `CANCELLED`, `EXPIRED`, `REFUNDED`), `subtotal_cents`, `message_fee_cents`, `total_cents`, `hold_expires_at` (UTC), `qr_code_data`.
11. `order_items`: UUID PK, `order_id` (cascade), `product_id`, quantity (`CHECK quantity > 0`), `unit_price_cents`, `total_price_cents`.
12. `order_customisations`: UUID PK, `order_item_id` (cascade), `size_option_id`, `flavour_option_id`, `custom_message` (VARCHAR(40)).
   - **Check Constraint**: `CHECK (custom_message IS NULL OR char_length(custom_message) <= 40)`
13. `payments`: UUID PK, `order_id`, provider, provider payment ID, unique `idempotency_key`, `amount_cents`, currency, status (`PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUNDED`).
14. `audit_logs`: UUID PK, entity type, entity ID, action, actor ID, actor role, JSON details, UTC timestamp.

---

## 🔒 The 10-Step Atomic Order Transaction

Implemented in `src/server/services/order-service.ts`:

1. **Begin Database Transaction**: Opens an isolated transaction connection.
2. **Lock Daily Capacity & Pickup Slot**: Executes `SELECT ... FOR UPDATE` on `daily_capacity` for the pickup date and `pickup_slots` for the chosen time window.
3. **Verify Capacity & Availability**: Checks that the date is not closed, the minimum 48-hour lead time is satisfied, `reserved_cakes + cart_cakes <= max_cakes`, and `reserved_orders + 1 <= max_orders`.
4. **Temporary Capacity Hold**: Increments `reserved_cakes` and `reserved_orders` with a 10-minute hold expiration timestamp (`hold_expires_at = NOW() + 10 minutes`).
5. **Server-Side Pricing**: Calculates base cake prices, size modifier fees, flavour modifier fees, and artisan piping fees ($3.00 if custom message is provided) strictly on the server.
6. **Insert Order & Customisations**: Inserts the pending order, items, and customisations with character limit validation, generating an order reference (`CC-2026-XXXX`) and collection QR code.
7. **Commit Transaction**: Commits the reservation and returns order details to the client with the 10-minute ticker.
8. **Payment Confirmation**: Upon verified payment, transitions order status to `CONFIRMED` and payment status to `SUCCEEDED`.
9. **Payment Idempotency**: Idempotency keys (`idempotency_key`) prevent duplicate order creation or double charging on network retries or duplicate webhook delivery.
10. **Rejection Safeguards**: Rejects the order immediately if capacity or slot is unavailable, rolling back atomically without partial state.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js LTS (v20+)
- npm (v10+)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 4. Run Migrations & Seed Database
```bash
# Apply all 14 tables and check constraints
npm run db:migrate

# Seed cakes, options, dietary tags, 14 days of capacity, and slots
npm run db:seed
```

### 5. Run Automated Test Suites
```bash
# Run business rules and constraints test suite (12 tests)
npm run test:rules

# Run concurrency stress test (double booking prevention under race conditions)
npm run test:concurrency

# Run all test suites
npm run test:all
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧑‍🍳 Default Demo Credentials

| Role | Email | Password | Access |
|---|---|---|---|
| **Head Baker** | `baker@cakecart.com` | `BakerPass123!` | Full kitchen dashboard, capacity manager, status transitions, QR collection check-in |
| **Customer** | `customer@example.com` | `CustomerPass123!` | Customer order history, collection pass, 24h cancellations |

---

## ☁️ Deployment to Vercel

### Step 1: Provision Neon PostgreSQL Database
1. Go to the [Vercel Dashboard](https://vercel.com).
2. Navigate to **Storage** -> **Create Database** -> Select **Neon Serverless PostgreSQL**.
3. Choose your preferred region (e.g. `us-east-1` or `iad1`).
4. Copy the connection string. Use the **Pooled Connection** string:
   ```
   DATABASE_URL="postgres://user:password@ep-xyz-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

### Step 2: Configure Environment Variables on Vercel
In your Vercel Project Settings under **Environment Variables**, add:
- `DATABASE_URL`: Your pooled Neon PostgreSQL connection string.
- `CRON_SECRET`: A secure random secret string for Vercel Cron.
- `SESSION_SECRET`: A 32+ character random secret string for JWT cookie encryption.
- `NEXT_PUBLIC_APP_URL`: Your deployed domain (e.g. `https://your-cakecart.vercel.app`).
- `BLOB_READ_WRITE_TOKEN`: (Optional) Provisioned from Vercel Blob for customer reference photo uploads.

### Step 3: Run Database Migrations in Vercel Build
In `package.json`, the build command can be configured to automatically migrate:
```json
"build": "npm run db:migrate && next build"
```
Or run `npm run db:migrate` and `npm run db:seed` from your local terminal pointing to the production `DATABASE_URL`:
```bash
DATABASE_URL="your-neon-pooled-url" npm run db:migrate
DATABASE_URL="your-neon-pooled-url" npm run db:seed
```

### Step 4: Scheduled Capacity Cleanup (Vercel Cron)
The project includes `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/release-expired-holds",
      "schedule": "*/10 * * * *"
    }
  ]
}
```
Vercel automatically triggers this endpoint every 10 minutes with the `Authorization: Bearer <CRON_SECRET>` header to release expired 10-minute holds idempotently.
