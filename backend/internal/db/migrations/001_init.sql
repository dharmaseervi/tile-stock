-- Tiles Stock Management — initial schema
-- Multi-tenant from day one via org_id on every table.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'owner', -- owner, staff
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A product = a tile design/series at a given size+finish.
-- Shade/lot variance is handled separately in `batches`.
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    brand TEXT NOT NULL,
    series_name TEXT NOT NULL,
    size TEXT NOT NULL,             -- e.g. '600x600', '300x600'
    finish TEXT,                    -- glossy, matte, rustic...
    hsn_code TEXT,
    pieces_per_box INT NOT NULL DEFAULT 1,
    sqft_per_box NUMERIC(10,2),
    reorder_level INT NOT NULL DEFAULT 0,  -- in boxes
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, brand, series_name, size, finish)
);

-- Batches capture shade/lot number — critical for tiles since
-- different production runs of the same design can shade-mismatch.
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    lot_number TEXT NOT NULL,
    received_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, lot_number)
);

-- Append-only ledger. Current stock is always DERIVED from this,
-- never stored as a separately-updated counter.
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
    boxes NUMERIC(10,2) NOT NULL CHECK (boxes > 0),
    reference TEXT,               -- invoice no, PO no, note
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_org ON stock_movements(org_id);
CREATE INDEX idx_products_org ON products(org_id);

-- View: current stock per product (boxes), derived from the ledger.
CREATE VIEW current_stock AS
SELECT
    p.id AS product_id,
    p.org_id,
    p.brand,
    p.series_name,
    p.size,
    p.finish,
    p.reorder_level,
    COALESCE(SUM(CASE WHEN m.movement_type = 'in' THEN m.boxes ELSE -m.boxes END), 0) AS boxes_in_stock
FROM products p
LEFT JOIN stock_movements m ON m.product_id = p.id
GROUP BY p.id;
