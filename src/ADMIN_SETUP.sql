-- ============================================
-- BIZDIZY ADMIN SYSTEM SETUP
-- ============================================
-- Run this in Supabase SQL Editor AFTER running COMPLETE_FRESH_SETUP.sql
-- This adds admin functionality using Supabase Auth user metadata

-- ============================================
-- 1. ADD RLS POLICIES FOR ADMIN ACCESS
-- ============================================

-- Drop existing admin policies if they exist
DROP POLICY IF EXISTS "admins_can_read_all_businesses" ON businesses;
DROP POLICY IF EXISTS "admins_can_update_all_businesses" ON businesses;
DROP POLICY IF EXISTS "admins_can_delete_all_businesses" ON businesses;
DROP POLICY IF EXISTS "admins_can_read_all_reviews" ON reviews;
DROP POLICY IF EXISTS "admins_can_update_all_reviews" ON reviews;
DROP POLICY IF EXISTS "admins_can_delete_all_reviews" ON reviews;
DROP POLICY IF EXISTS "admins_can_read_reports" ON reports;
DROP POLICY IF EXISTS "admins_can_manage_reports" ON reports;
DROP POLICY IF EXISTS "admins_can_read_contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "admins_can_manage_contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "admins_can_manage_terms" ON terms_and_policies;
DROP POLICY IF EXISTS "admins_can_read_analytics" ON analytics_events;

-- BUSINESSES: Admins can read, update, and delete all businesses
CREATE POLICY "admins_can_read_all_businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_update_all_businesses"
  ON businesses
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_delete_all_businesses"
  ON businesses
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- REVIEWS: Admins can read, update, and delete all reviews
CREATE POLICY "admins_can_read_all_reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_update_all_reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_delete_all_reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- REPORTS: Admins can read and manage all reports
CREATE POLICY "admins_can_read_reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_manage_reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- CONTACT MESSAGES: Admins can read and manage
CREATE POLICY "admins_can_read_contact_messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "admins_can_manage_contact_messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- TERMS AND POLICIES: Admins can manage
CREATE POLICY "admins_can_manage_terms"
  ON terms_and_policies
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ANALYTICS: Admins can read all analytics
CREATE POLICY "admins_can_read_analytics"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- ============================================
-- 2. CREATE HELPER FUNCTION TO CHECK ADMIN STATUS
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. SET INITIAL ADMIN USER
-- ============================================
-- Replace 'parlando87@ukr.net' with your email if different

-- First, you need to run this in Supabase Dashboard > SQL Editor:
-- This uses the service role to update user metadata

-- IMPORTANT: Run this command to make parlando87@ukr.net an admin:
-- You'll need to get the user ID first by signing up with that email,
-- then run this in the SQL editor:

-- Step 1: Find your user ID (run this after you've signed up):
-- SELECT id, email FROM auth.users WHERE email = 'parlando87@ukr.net';

-- Step 2: Copy the ID from above and replace YOUR_USER_ID_HERE in the command below:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{is_admin}',
--   'true'::jsonb
-- )
-- WHERE email = 'parlando87@ukr.net';

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- After running this SQL:
-- 1. Sign up with parlando87@ukr.net if you haven't already
-- 2. Run the UPDATE command above with your user ID
-- 3. Log out and log back in for changes to take effect
-- 4. You'll now have full admin access!
-- 5. You can promote other users to admin from the User Management page
