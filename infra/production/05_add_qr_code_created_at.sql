-- Add QR code creation date to tables for tracking refresh needs
ALTER TABLE tables ADD COLUMN IF NOT EXISTS qr_code_created_at timestamptz;

-- Create index for efficient queries on old QR codes
CREATE INDEX IF NOT EXISTS idx_tables_qr_created_at ON tables(qr_code_created_at) 
WHERE qr_code_created_at IS NOT NULL;