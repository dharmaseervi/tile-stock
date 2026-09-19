-- Company details, collected after signup rather than on the signup form.
ALTER TABLE orgs
  ADD COLUMN IF NOT EXISTS legal_name TEXT,
  ADD COLUMN IF NOT EXISTS gstin TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS pincode TEXT,
  ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

-- Shops that already exist signed up with a name; don't force them back
-- through setup. They can add the rest from Settings.
UPDATE orgs SET setup_completed_at = created_at
WHERE setup_completed_at IS NULL AND name <> '';
