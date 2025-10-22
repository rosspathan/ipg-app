-- Allow all authenticated users to view fiat settings for INR deposits
-- This enables regular users to see minimum deposit amounts, fees, and whether deposits are enabled
-- Admin-only policies for INSERT/UPDATE/DELETE remain in place

CREATE POLICY "Authenticated users can view fiat_settings_inr"
ON fiat_settings_inr
FOR SELECT
TO authenticated
USING (true);