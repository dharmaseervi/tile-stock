-- Migration 004: staff invites, branches, customers, orders/challans,
-- suppliers, subscriptions

-- ── Branches / Godowns ────────────────────────────────────────────────────
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, name)
);

-- Default branch per org (migrates existing data)
INSERT INTO branches (id, org_id, name)
SELECT gen_random_uuid(), id, 'Main' FROM orgs;

ALTER TABLE stock_movements ADD COLUMN branch_id UUID REFERENCES branches(id);
ALTER TABLE products ADD COLUMN branch_id UUID REFERENCES branches(id);

-- ── Staff invites ─────────────────────────────────────────────────────────
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff',
    token TEXT NOT NULL UNIQUE,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Suppliers ─────────────────────────────────────────────────────────────
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE products ADD COLUMN supplier_id UUID REFERENCES suppliers(id);
ALTER TABLE products ADD COLUMN cost_price NUMERIC(10,2) DEFAULT 0;

-- ── Customers ─────────────────────────────────────────────────────────────
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    credit_limit NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Orders / Delivery Challans ────────────────────────────────────────────
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id),
    customer_id UUID REFERENCES customers(id),
    challan_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','confirmed','dispatched','delivered','cancelled')),
    delivery_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (org_id, challan_number)
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    boxes NUMERIC(10,2) NOT NULL,
    price_per_box NUMERIC(10,2) NOT NULL DEFAULT 0,
    loaded BOOLEAN NOT NULL DEFAULT false,   -- worker tick box
    notes TEXT
);

-- When an order is dispatched, auto-create stock-out movements
-- (done in application layer, not trigger, for auditability)

-- ── Subscription ─────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL UNIQUE REFERENCES orgs(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial','monthly','yearly')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
    razorpay_subscription_id TEXT,
    trial_ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days'),
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Give every existing org a 30-day trial
INSERT INTO subscriptions (org_id, plan, status)
SELECT id, 'trial', 'active' FROM orgs;

-- ── Reorder view ─────────────────────────────────────────────────────────
-- Products below reorder level with velocity (avg boxes out / week)
CREATE VIEW reorder_suggestions AS
WITH velocity AS (
    SELECT
        product_id,
        SUM(CASE WHEN movement_type = 'out' THEN boxes ELSE 0 END) /
            GREATEST(
                EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 604800.0,
                1
            ) AS boxes_per_week
    FROM stock_movements
    GROUP BY product_id
)
SELECT
    cs.product_id,
    cs.org_id,
    cs.brand,
    cs.series_name,
    cs.size,
    cs.finish,
    cs.boxes_in_stock,
    cs.reorder_level,
    cs.price_per_box,
    COALESCE(v.boxes_per_week, 0) AS boxes_per_week,
    CASE
        WHEN COALESCE(v.boxes_per_week, 0) > 0
        THEN CEIL(cs.boxes_in_stock / v.boxes_per_week)
        ELSE NULL
    END AS weeks_of_stock,
    CEIL(COALESCE(v.boxes_per_week, 0) * 4) AS suggested_reorder_qty
FROM current_stock cs
LEFT JOIN velocity v ON v.product_id = cs.product_id
WHERE cs.boxes_in_stock <= cs.reorder_level;
