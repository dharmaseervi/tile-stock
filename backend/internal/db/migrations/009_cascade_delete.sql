-- 009_cascade_delete.sql
-- Products referenced by order_items and stock_movements.
-- Previously a DELETE on products would 500 if either table had rows
-- pointing at it. Cascade means deleting a product cleans up its
-- dependents automatically, which matches the mobile app's expectation.

ALTER TABLE stock_movements
  DROP CONSTRAINT IF EXISTS stock_movements_product_id_fkey,
  ADD CONSTRAINT stock_movements_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE order_items
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey,
  ADD CONSTRAINT order_items_product_id_fkey
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;