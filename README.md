# Tiles Stock Manager

Stock management for tile dealers — track products, shade/lot batches,
stock in/out movements, and low-stock alerts.

## Structure
- `backend/` — Go + Gin API, Postgres (sqlx)
- `frontend/` — Next.js (App Router) + Tailwind

## Backend setup
```
cd backend
cp .env.example .env    # fill in DATABASE_URL and JWT_SECRET
go mod tidy
psql "$DATABASE_URL" -f migrations/001_init.sql   # or run via Supabase/Neon SQL editor
go run cmd/main.go
```
API runs on `http://localhost:8080`.

## Frontend setup
```
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
App runs on `http://localhost:3000`.

## Data model notes
- **Batches (shade/lot number)**: tiles from different production lots can
  shade-mismatch, so every stock-in can optionally be tagged with a lot
  number. This is separate from the product itself.
- **Stock is derived, not stored**: `stock_movements` is an append-only
  ledger (`in`/`out`). Current stock is computed via the `current_stock`
  Postgres view — this avoids drift between a stored counter and reality.
- **Multi-tenant from day one**: every table has `org_id`, and the JWT
  carries `org_id` so all queries are automatically scoped per business.
  This matters if you turn this into a SaaS other dealers sign up for.

## What's next (not built yet)
- Low-stock notifications (WhatsApp/email) — currently just a dashboard flag
- Editing products/batches (only create + delete wired up)
- Reports/export (CSV, stock valuation)
- Role-based permissions (owner vs staff — column exists, not enforced yet)
