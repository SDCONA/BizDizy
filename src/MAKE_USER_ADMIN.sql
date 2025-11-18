-- ============================================
-- QUICK ADMIN SETUP FOR parlando87@ukr.net
-- ============================================
-- Run these commands in Supabase SQL Editor

-- Step 1: Find your user ID
SELECT id, email, raw_user_meta_data FROM auth.users WHERE email = 'parlando87@ukr.net';

-- Step 2: Copy the 'id' from above and replace YOUR_USER_ID_HERE below, then run:
-- UPDATE auth.users 
-- SET raw_user_meta_data = jsonb_set(
--   COALESCE(raw_user_meta_data, '{}'::jsonb),
--   '{is_admin}',
--   'true'::jsonb
-- )
-- WHERE id = 'YOUR_USER_ID_HERE';

-- Step 3: Verify it worked
-- SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'parlando87@ukr.net';
-- You should see "is_admin": true in the raw_user_meta_data

-- ⚠️ IMPORTANT: After running this, you MUST:
-- 1. Log out of BizDizy
-- 2. Close the browser tab completely
-- 3. Open BizDizy in a new tab
-- 4. Log back in
-- 
-- This is required for the JWT token to refresh with your new admin status!

-- ============================================
-- TO MAKE ANOTHER USER ADMIN (after you're admin):
-- ============================================
-- Just use the User Management interface in the Admin Dashboard!
-- No need to run SQL commands - you can promote users from the UI.
