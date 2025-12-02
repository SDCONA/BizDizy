-- Add privacy settings for phone and email visibility
-- Run this migration on your Supabase database

-- Add show_phone and show_email columns to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN businesses.show_phone IS 'Whether phone number is visible on business profile page';
COMMENT ON COLUMN businesses.show_email IS 'Whether email is visible on business profile page';

-- Update existing businesses to show contact info by default
UPDATE businesses 
SET show_phone = true, show_email = true 
WHERE show_phone IS NULL OR show_email IS NULL;
