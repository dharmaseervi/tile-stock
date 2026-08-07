-- Migration 007: multi-category products
-- Tiles are category='tile', adhesives/grout etc are 'material',
-- sanitary ware is 'sanitary'.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'tile'
    CHECK (category IN ('tile', 'material', 'sanitary')),
  ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'box';
  -- unit examples: box, bag, kg, litre, piece, set

-- The old unique constraint assumed every product has a size+finish
-- (true for tiles, not for a bag of adhesive). Drop and replace with
-- a partial index per category.
ALTER TABLE products
  DROP CONSTRAINT IF EXISTS products_org_id_brand_series_name_size_finish_key;

-- Tiles: still unique on org+brand+series+size+finish
CREATE UNIQUE INDEX IF NOT EXISTS products_tile_unique
  ON products (org_id, brand, series_name, size, finish)
  WHERE category = 'tile';

-- Materials and sanitary: unique on org+brand+series+unit
CREATE UNIQUE INDEX IF NOT EXISTS products_nontile_unique
  ON products (org_id, brand, series_name, unit)
  WHERE category != 'tile';