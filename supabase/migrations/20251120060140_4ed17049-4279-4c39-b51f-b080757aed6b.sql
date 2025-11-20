-- Allow all authenticated users to read the bsk_transfers_enabled setting
-- This is needed for the frontend to check if transfers are currently enabled
CREATE POLICY "allow_read_bsk_transfer_status"
ON system_settings
FOR SELECT
TO authenticated
USING (key = 'bsk_transfers_enabled');