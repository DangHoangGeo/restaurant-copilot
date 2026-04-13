-- Add passcode verification function
CREATE OR REPLACE FUNCTION verify_order_session_passcode(
  input_session_id UUID,
  input_code       TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN LEFT(input_session_id::TEXT, 4) = input_code;
END;
$$ LANGUAGE plpgsql IMMUTABLE;