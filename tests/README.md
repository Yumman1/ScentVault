# ScentVault Automated Test Suite

Three layers:

1. **Unit** (`tests/unit`, Vitest) — pure stock math (`lib/stock.ts`). No network.
2. **Integration** (`tests/integration`, Vitest) — real Supabase project. Covers
   master-data round-trips, transaction timelines, RLS by role, schema/CHECK
   constraints, and `audit_logs` shape.
3. **E2E** (`tests/e2e`, Playwright) — launches `npm run dev` via Playwright's
   `webServer`, logs in as Admin, drives the UI, and verifies the DB.

## ⚠️ Destructive

Integration + E2E **wipe every app-managed table** (`audit_logs`, `gate_in_logs`,
`gate_out_logs`, `stock_transfer_logs`, `perfumes`, `olfactive_notes`,
`packing_types`, `locations`, `customers`, `suppliers`) before and after each
run. `auth.users` and `public.profiles` are **not** touched, so your Admin
stays intact.

Only run these against a Supabase project whose contents you are happy to lose.

## Setup

1. Copy the example env file and fill it in:
   ```powershell
   copy .env.test.example .env.test
   ```

2. Fill in `.env.test`:
   - `TESTS_ALLOW_WIPE=1`            — the safety kill-switch.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — your Supabase project
     (the **same** one the dev server points at in `.env.local`).
   - `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` — an existing user whose
     `profiles.role` is `'Admin'`.
   - Optional: `TEST_OPERATOR_*` and `TEST_VIEWER_*` for RLS matrix tests.
     If absent, those tests are skipped.
   - `APP_URL=http://localhost:3000` (Vite's default).

3. Install Playwright browsers once:
   ```powershell
   npm run test:install-browsers
   ```

## Running

| Command                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| `npm run test:unit`    | Vitest, `tests/unit/**/*.spec.ts`. No DB.                   |
| `npm run test:int`     | Vitest, `tests/integration/**/*.spec.ts`. Wipes DB first.   |
| `npm run test:e2e`     | Playwright, boots dev server. Wipes DB before/after.        |
| `npm run test:wipe`    | Manual wipe (`TESTS_ALLOW_WIPE=1` required).                |
| `npm run test:all`     | wipe → unit → int → e2e → wipe.                             |

All tests run with `workers=1` / `fileParallelism=false` because they share one
Supabase project.

## Artifacts

- Playwright HTML report: `playwright-report/`
- Traces/videos on failure: `test-results/`
- Optional Vitest coverage (enable in `vitest.config.ts`): `coverage/`

## How a spec typically flows

```ts
import { signInAdmin, wipeAll } from './helpers/db';
import { seedMinimal, readLogs } from './helpers/seed';
import { computeStockPositions } from '../lib/stock';

beforeEach(async () => {
  await wipeAll(adminClient);
  ids = await seedMinimal(adminClient);
});
```

The seed helper creates 1 supplier, 1 customer, 1 packing type, 2 main
locations and 1 perfume so that transaction specs have anchor ids. `readLogs`
loads the three log tables in the exact shape `computeStockPositions` expects
so you can assert derived stock from raw DB rows.

## What these tests specifically guard against

- camelCase ↔ snake_case mapping drift in `services/*.ts`.
- `ON DELETE RESTRICT` on perfumes silently breaking.
- RLS policy regressions (Operator gains write access to master data, Viewer
  gains any write, Admin loses `audit_logs`).
- `CHECK` constraints on `role`, `type`, `usage`, `action`, `entity`.
- Stock math drifting from the documented rule that `importReference`
  (gate-in) and `batchNumber` (gate-out/transfer) must match to cancel out.

## What is NOT covered automatically

- Supabase auth email verification. Tests assume pre-existing users.
- PDF content quality — only "a download fires" or "a 'no data' alert fires".
- Load / performance testing.
- Multi-tenant isolation (migration 005 makes the app single-tenant).
