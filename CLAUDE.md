# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

FinanzApp: a personal finance tracker (Nuxt 3 full-stack app, Spanish UI/domain names) for tracking income, expenses, credit cards, savings goals, debts (with amortized installments), and budget projections for trips/large purchases.

## Commands

```bash
npm run dev              # start dev server (http://localhost:3000)
npm run build             # prisma generate + nuxt build
npm run generate           # nuxt generate (static)
npm run preview            # preview production build
npm run format              # prettier --write .
npm run format:check         # prettier --check .
npm run seed                  # tsx prisma/seed.ts — seed the DB
npx prisma migrate dev --name <name>   # create/apply a migration after editing prisma/schema.prisma
npx prisma studio                       # inspect DB data
npx tsx prisma/generate-installments.ts # backfill DebtInstallment rows for debts created before the installments system existed
```

There is no test suite and no lint script configured — `format:check` (Prettier) is the only automated check.

## Architecture

**Stack**: Nuxt 3 (Vue 3, compatibilityVersion 4) + Nitro server routes + Prisma (PostgreSQL) + Pinia + Tailwind + Chart.js + dayjs (locale `es`, timezone `America/Lima`). Nitro preset is `vercel`.

### Path aliases (defined in both `nuxt.config.ts` and `tsconfig.json` — keep them in sync when adding new ones)

- `@server/*` → `server/*`
- `@api/*` → `server/api/*`
- `@prisma/*` → `prisma/*`
- `@components/*` → `app/components/*`
- `#types/*` → `app/types/*`

### Auth flow

JWT-based, stored in an httpOnly `token` cookie (not readable from client JS).

- `server/utils/auth.ts`: `getUserFromSession(event)` decodes the cookie and loads the `User`; `requireUser(event)` does the same but throws 401 if absent. Every protected API route calls one of these directly (there's no global server middleware for auth) — `getUserFromSession` returning `null` means throw `createError({ statusCode: 401 })` yourself.
- `server/utils/rate-limit.ts`: in-memory fixed-window limiter (`checkRateLimit`/`clearRateLimit`/`getClientIp`) used on login/register to throttle brute force; state resets on server restart.
- `app/middleware/auth.global.ts`: runs on every route except `/login`; on SSR it calls `/api/auth/me` and redirects to `/login` on failure. `app/middleware/guest.ts` is the inverse, for the login page.
- Client-side 401 handling is duplicated in two places that must stay behavioraly consistent: `app/plugins/auth-handler.ts` (wraps global `$fetch`, provided as `$authFetch`) and `app/composables/useAuthFetch.ts` (`useFetchAuth` wrapper for reactive `useFetch` calls). Both clear the `token` cookie and redirect to `/login` on a 401 response.

### Server API conventions (`server/api/**`)

File-based Nitro routing: `index.get.ts`/`index.post.ts` for collection routes, `[id].put.ts`/`[id].delete.ts` for a resource, nested folders like `debts/[id]/pay.post.ts` for sub-actions. Every handler follows the same shape:

1. `const user = await getUserFromSession(event)` (or `requireUser`), 401 if missing.
2. `validateBody(SomeSchema, await readBody(event))` from `server/utils/validation.ts` — all Zod schemas live in that one file; add new ones there rather than inlining validation in a route.
3. Query/mutate via the shared `prisma` client from `server/utils/db.ts` (singleton on `globalThis` to survive HMR in dev), always scoped `where: { userId: user.id }`.

Full endpoint list and request/response shapes are documented in [API_DOCUMENTATION.md](docs/reference/API_DOCUMENTATION.md).

### Data model (`prisma/schema.prisma`)

All domain tables hang off `User` with `onDelete: Cascade`. Notable design points (see [SCHEMA_DOCUMENTATION.md](docs/reference/SCHEMA_DOCUMENTATION.md) for the rationale):

- `Income`/`Expense` share the same recurring pattern: `isRecurring` + optional `frequency` (`monthly`/`biweekly`/`weekly`/`annual`) distinguishes fixed vs. one-off entries.
- `Expense.creditCardId` is optional and `SetNull` on card deletion — expense history survives card removal.
- `Debt` → `DebtInstallment` (scheduled amortization rows, one per installment, status `pending`/`paid`/`overdue`/`advanced`) → optionally linked to a `DebtPayment` once paid. `DebtPayment` splits every payment into `principal`/`interest`/`insurance`. See [INSTALLMENTS_GUIDE.md](docs/guides/INSTALLMENTS_GUIDE.md) for the full lifecycle (installment generation on debt creation, advanced-payment detection, how `/api/payment-plan/suggestions` consumes installment status). See [DEBT_MANAGEMENT_GUIDE.md](docs/guides/DEBT_MANAGEMENT_GUIDE.md) for the principal/interest split formula used when registering a payment.
- `SavingsGoal` → `SavingsContribution` (append-only contribution history).
- `BudgetProjection` is a standalone what-if planner (trip/large-purchase budgeting: projects income/fixed-expenses/debt-payments against a date range to suggest debit vs. credit usage and savings impact) — not linked to other tables.

After editing `schema.prisma`, run `npx prisma migrate dev --name <descriptive-name>`; Prisma Client is regenerated automatically via the `postinstall`/`build` script hooks.

### Frontend structure (`app/`)

- `app/pages/<module>/index.vue` per domain module (ahorros, categorias, deudas, gastos, ingresos, planificacion, tarjetas) plus `app/pages/index.vue` (dashboard) — mirrors the sidebar menu in `app/components/utils/Sidebar.vue`.
- `app/components/<module>/` holds the Vue components for each page module; `app/components/icons/<module>/` holds matching icon components; `app/components/ui/` holds shared/generic UI pieces.
- `app/types/<module>.ts` holds the TypeScript interfaces per domain module, imported via the `#types/*` alias.
- Data fetching from components goes through `useAuthFetch`/`useFetchAuth` (never raw `$fetch`), so 401s are handled uniformly.

### Documentation (`docs/`)

- `docs/reference/` — living technical reference kept in sync with the code (API contracts, schema rationale). Update these files when the corresponding contract changes.
- `docs/guides/` — conceptual guides for specific subsystems (installments lifecycle, debt payment math, alias config).
- `docs/reports/` — dated, point-in-time financial snapshots/analyses generated on request (e.g. `ESTADO_FINANCIERO_<YYYY-MM>.md`); these are not updated after the fact.
- `docs/plans/` — implementation plans for upcoming features, written before starting non-trivial work; one file per feature/module.
