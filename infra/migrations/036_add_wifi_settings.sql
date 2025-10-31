-- 036_add_wifi_settings.sql
-- Add WiFi settings to restaurants table for table QR code printing

-- Add WiFi SSID field (network name)
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS wifi_ssid text;

-- Add WiFi password field
ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS wifi_password text;

-- Add comments for documentation
COMMENT ON COLUMN restaurants.wifi_ssid IS 'WiFi network name (SSID) to display on printed table QR codes';
COMMENT ON COLUMN restaurants.wifi_password IS 'WiFi password to display on printed table QR codes';
