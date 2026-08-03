ALTER TABLE products ADD COLUMN price_per_box NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Recreate the view to include price and computed stock value.
DROP VIEW IF EXISTS current_stock;

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
    COALESCE(SUM(CASE WHEN m.movement_type = 'in' THEN m.boxes ELSE -m.boxes END), 0) AS boxes_in_stock,
    COALESCE(SUM(CASE WHEN m.movement_type = 'in' THEN m.boxes ELSE -m.boxes END), 0) * p.price_per_box AS stock_value
FROM products p
LEFT JOIN stock_movements m ON m.product_id = p.id
GROUP BY p.id;