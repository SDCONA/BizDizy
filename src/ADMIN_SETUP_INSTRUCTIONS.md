# BizDizy Admin Setup Instructions

## ⚠️ IMPORTANT: Complete These Steps to Fix "User Not Allowed" Error

You're getting the "user not allowed" error because the admin system hasn't been configured yet. Follow these steps **in order** to set up admin access.

---

## Step 1: Run the Admin Setup SQL

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy the **entire contents** of `/ADMIN_SETUP.sql` 
5. Paste it into the SQL editor
6. Click **Run** (or press Ctrl/Cmd + Enter)

✅ This creates the necessary database policies for admin access.

---

## Step 2: Create Your Admin Account

### Option A: If you already have an account with `parlando87@ukr.net`

1. In Supabase SQL Editor, run this query to find your user ID:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'parlando87@ukr.net';
   ```

2. Copy the `id` value

3. Run this command (replace `YOUR_USER_ID_HERE` with the actual ID):
   ```sql
   UPDATE auth.users 
   SET raw_user_meta_data = jsonb_set(
     COALESCE(raw_user_meta_data, '{}'::jsonb),
     '{is_admin}',
     'true'::jsonb
   )
   WHERE id = '2ea97e79-0b2a-4cd8-b6a6-3ddad0e08f38';
   ```

### Option B: If you need to create the account first

1. Go to your BizDizy app
2. Click **Sign Up**
3. Register with email: `parlando87@ukr.net`
4. Complete the signup
5. Then follow **Option A** above to make yourself admin

---

## Step 3: Refresh Your Session

After making yourself an admin:

1. **Log out** of your BizDizy account
2. **Close the browser tab** (important!)
3. Open BizDizy in a **new tab**
4. **Log back in** with `parlando87@ukr.net`

✅ You should now have full admin access!

---

## Step 4: Verify Admin Access

1. Click on **My Account** in the navigation
2. Click on **Admin Dashboard**
3. You should now see:
   - ✅ Business Management
   - ✅ User Management
   - ✅ Contact Messages
   - ✅ Terms & Policy Management

If you still see "user not allowed", double-check that you:
- Ran the SQL commands correctly
- Used the correct user ID
- Logged out and back in

---

## Adding More Admins (After Setup)

Once you're an admin, you can promote other users:

1. Go to **Admin Dashboard** → **User Management**
2. Find the user you want to promote
3. Click the **Shield** icon (Promote to Admin)
4. Confirm the action

The user will need to:
- Log out
- Log back in
- Then they'll have admin access

---

## Troubleshooting

### "User not allowed" after following all steps
- Make sure you ran **both** SQL files:
  1. `COMPLETE_FRESH_SETUP.sql` (database tables)
  2. `ADMIN_SETUP.sql` (admin policies)
- Verify the `is_admin` flag was set:
  ```sql
  SELECT email, raw_user_meta_data FROM auth.users 
  WHERE email = 'parlando87@ukr.net';
  ```
  You should see `"is_admin": true` in the metadata

### "Failed to load users"
- Check Supabase logs in Dashboard → Logs
- Make sure your Supabase project is running
- Verify database policies were created correctly

### Can't see Admin Dashboard menu item
- Check your account role in the app (should show as "admin" in My Account)
- Clear browser cache and cookies
- Try a different browser

---

## Technical Details

### How Admin System Works

1. **User Metadata**: Admin status is stored in `auth.users.raw_user_meta_data.is_admin`
2. **Row Level Security (RLS)**: Database policies check this flag before allowing access
3. **API Checks**: Frontend API functions verify admin status before making requests
4. **Session-based**: Changes require logout/login to refresh the JWT token

### Database Policies Created

The admin setup creates RLS policies that allow admins to:
- Read all businesses (not just their own)
- Update/delete any business
- View all user accounts
- Manage contact messages
- Access analytics data
- Update terms & policies

---

## Need Help?

If you're still having issues after following these steps, check:
1. Supabase project status (Dashboard → Project Settings)
2. Browser console for errors (F12 → Console tab)
3. Supabase logs (Dashboard → Logs)

Remember: **Always log out and back in after changing admin status!**
