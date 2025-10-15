-- Add onboarding_completed_at column to profiles table for tracking completion
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;