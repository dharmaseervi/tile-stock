-- Migration 006: godown location field on products
-- "Rack B3", "Front showroom left wall", "Godown 2 shelf 4"

ALTER TABLE products ADD COLUMN IF NOT EXISTS location TEXT;