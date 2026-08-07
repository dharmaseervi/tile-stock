-- Migration 008: fix product unique constraint for multi-category support
-- The old constraint blocked materials/sanitary (no size field).
-- Replace with partial indexes per category.

ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_org_id_brand_series_name_size_finish_key;

CREATE UNIQUE INDEX IF NOT EXISTS products_tile_unique
  ON products (org_id, brand, series_name, size, finish)
  WHERE category = 'tile';

CREATE UNIQUE INDEX IF NOT EXISTS products_nontile_unique
  ON products (org_id, brand, series_name, unit)
  WHERE category != 'tile';