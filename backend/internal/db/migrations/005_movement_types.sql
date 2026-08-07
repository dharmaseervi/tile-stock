-- Migration 005: expand movement types, add margin support

-- Add adjustment and damage movement types
ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE stock_movements
  ADD CONSTRAINT stock_movements_movement_type_check
  CHECK (movement_type IN ('in', 'out', 'adjustment', 'damage'));

-- Add reason field for adjustments/damage
ALTER TABLE stock_movements
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- Recreate current_stock view to treat adjustment/damage as reductions
DROP VIEW IF EXISTS current_stock CASCADE;

CREATE VIEW current_stock AS
SELECT
    p.id AS product_id,
    p.org_id,
    p.brand,
    p.series_name,
    p.size,
    p.finish,
    p.reorder_level,
    p.price_per_box,
    p.cost_price,
    COALESCE(SUM(
        CASE
            WHEN m.movement_type = 'in' THEN m.boxes
            ELSE -m.boxes
        END
    ), 0) AS boxes_in_stock,
    COALESCE(SUM(
        CASE
            WHEN m.movement_type = 'in' THEN m.boxes
            ELSE -m.boxes
        END
    ), 0) * p.price_per_box AS stock_value,
    COALESCE(SUM(
        CASE
            WHEN m.movement_type = 'in' THEN m.boxes
            ELSE -m.boxes
        END
    ), 0) * p.cost_price AS stock_cost
FROM products p
LEFT JOIN stock_movements m ON m.product_id = p.id
GROUP BY p.id;

-- Recreate reorder_suggestions which depends on current_stock
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
