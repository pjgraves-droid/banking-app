# Banking App

A standalone banking prototype built with React, TanStack Router, and Vercel Serverless Functions. Features account management (deposit/withdraw/balance check), transaction history, and CSV export for audit.

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
npm install

# 2. Set up your database
#    Create a Postgres database (Supabase, Neon, or local)
cp .env.example .env
#    Edit .env with your DATABASE_URL

# 3. Run the migration
npm run db:migrate

# 4. Start dev server
npm run dev
```

> **Note:** The API routes (in `api/`) run as Vercel Serverless Functions. For local dev, install the Vercel CLI:
> ```bash
> npm i -g vercel
> vercel dev
> ```
> This starts both the Vite frontend and the serverless functions together.

## Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
# Create a repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/banking-app.git
git push -u origin main
```

### 2. Create a Postgres Database

**Option A: Supabase (free tier)**
1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy the connection string from Settings → Database → Connection string (URI)

**Option B: Neon (free tier)**
1. Go to [neon.tech](https://neon.tech) → Create a project
2. Copy the connection string

### 3. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. In **Environment Variables**, add:
   - `DATABASE_URL` = your Postgres connection string
4. Deploy!

Vercel will automatically:
- Build the Vite frontend
- Deploy the `api/` folder as serverless functions
- Route `/api/*` requests to the functions

### 4. Run the Migration

After deploying, run the migration against your production database:

```bash
# Set DATABASE_URL to your production connection string
DATABASE_URL="postgresql://..." npm run db:migrate
```

Or run the SQL manually in your database console:

```sql
CREATE TABLE "banking_accounts" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "username" text NOT NULL UNIQUE,
  "balance" double precision NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone NOT NULL DEFAULT NOW()
);

CREATE TABLE "banking_transactions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "username" text NOT NULL,
  "transaction_type" text NOT NULL,
  "amount" double precision NOT NULL,
  "transaction_datetime" timestamp with time zone NOT NULL DEFAULT NOW()
);
```

## Architecture

```
banking-app/
├── api/                          ← Vercel Serverless Functions
│   ├── _lib/
│   │   ├── db.ts                 ← Drizzle + Postgres connection
│   │   ├── handler.ts            ← Request handler wrapper
│   │   └── schema.ts             ← Drizzle table definitions
│   └── banking/
│       ├── accounts/lookup.ts    ← GET /api/banking/accounts/lookup
│       ├── deposit.ts            ← POST /api/banking/deposit
│       ├── withdraw.ts           ← POST /api/banking/withdraw
│       ├── transactions.ts       ← GET /api/banking/transactions
│       └── export.ts             ← GET /api/banking/export (CSV)
├── src/                          ← React frontend (Vite)
│   ├── components/form-factory.tsx
│   ├── routes/banking/index.tsx  ← Main banking UI
│   ├── api.ts                    ← ky HTTP client
│   └── main.tsx
├── drizzle.config.ts             ← Drizzle Kit config
├── vercel.json                   ← Vercel routing config
└── package.json
```

## Features

- **Funds Movement** — Check balance, deposit, withdraw (with insufficient-funds validation)
- **Transaction History** — Filter by type, sort by date
- **Export for Audit** — Download all transactions as CSV
- **Form Factory** — Config-driven forms (reusable pattern)
