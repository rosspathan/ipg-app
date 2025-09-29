-- Remove the problematic security definer view
-- This view references a non-existent table 'fiat_settings_inr' 
-- and poses a security risk by executing with postgres privileges

DROP VIEW IF EXISTS public.fiat_settings_inr_public;