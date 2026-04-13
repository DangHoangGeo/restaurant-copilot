-- Add QR code creation date to tables for tracking refresh needs
ALTER TABLE tables ADD COLUMN IF NOT EXISTS qr_code_created_at timestamptz;

-- Create index for efficient queries on old QR codes
CREATE INDEX IF NOT EXISTS idx_tables_qr_created_at ON tables(qr_code_created_at) 
WHERE qr_code_created_at IS NOT NULL;

-- Function to check if QR code needs refresh (older than 2 weeks)
CREATE OR REPLACE FUNCTION qr_code_needs_refresh(qr_created_date timestamptz)
RETURNS boolean AS $$
BEGIN
  IF qr_created_date IS NULL THEN
    RETURN false; -- No creation date means no refresh needed (for backward compatibility)
  END IF;
  
  -- Check if QR code is older than 2 weeks (14 days)
  RETURN qr_created_date < (now() - interval '14 days');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
