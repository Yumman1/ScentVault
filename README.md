# ScentVault — Inventory Intelligence & Perfume Management

A premium perfume inventory management system for industrial fragrance traders and manufacturers. Features real-time stock tracking, FIFO batch management, multi-currency pricing (PKR/USD), and intelligent logistics analytics.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Row-Level Security)
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Charts**: Recharts
- **Exports**: jsPDF + xlsx

## Quick Start

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone & Install
```bash
git clone https://github.com/Yumman1/ScentVault.git
cd ScentVault
npm install
```

### 2. Configure Supabase
1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migrations in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_rls_policies.sql`
   - `supabase/migrations/003_seed_data.sql`
3. Copy `.env.example` to `.env.local` and fill in your credentials:
```bash
cp .env.example .env.local
```
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Create First Admin User
1. Go to Supabase Dashboard → Authentication → Users → Add User
2. Create a user with email/password
3. Go to SQL Editor and run:
```sql
UPDATE profiles SET role = 'Admin', can_view_prices = true WHERE id = 'YOUR_USER_UUID';
```

### 4. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## Deployment on Vercel

1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Features

- **Dashboard**: Real-time KPIs, stock alerts, inventory velocity charts
- **Perfume Master**: Central registry with olfactive notes, dosage, pricing
- **Smart Logistics (FIFO)**: Automated batch recommendation for dispatch
- **Gate In / Out / Transfer**: 3-step guided workflow with stock impact gauges
- **Reports**: Master summary, batch intelligence, capital analytics
- **Audit Ledger**: Immutable activity tracking with pagination
- **Role-Based Access**: Admin, Operator, Viewer with RLS enforcement
- **Bulk Import**: Excel/CSV ingestion engine
- **Dark Mode**: Adaptive "Logistics Noir" aesthetic

## Project Structure

```
ScentVault/
├── App.tsx                  # Root component with auth gate
├── index.tsx                # Entry point
├── index.css                # Global styles + Tailwind theme
├── types.ts                 # TypeScript interfaces
├── lib/
│   └── supabase.ts          # Supabase client
├── context/
│   ├── AuthContext.tsx       # Authentication state
│   ├── InventoryContext.tsx  # Business logic + data
│   └── ThemeContext.tsx      # Dark/light mode
├── services/                # Supabase CRUD services
│   ├── supplierService.ts
│   ├── customerService.ts
│   ├── perfumeService.ts
│   ├── locationService.ts
│   ├── packingTypeService.ts
│   ├── transactionService.ts
│   ├── auditService.ts
│   └── olfactiveNoteService.ts
├── pages/
│   └── LoginPage.tsx        # Auth login/signup
├── components/
│   ├── dashboard/           # Dashboard + charts
│   ├── forms/               # CRUD forms
│   ├── reports/             # Analytics views
│   ├── settings/            # System settings
│   ├── system/              # Audit ledger
│   ├── layout/              # Header
│   └── ui/                  # Shared components
├── supabase/
│   └── migrations/          # SQL schema + RLS + seeds
└── vercel.json              # Deployment config
```

## License

Private — All rights reserved.
