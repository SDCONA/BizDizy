# 🔐 BizDizy Admin Access - SECURE METHODS

## ⚠️ IMPORTANT: Security Notice

Admin access should **NEVER** be self-service. Only the site owner/developer should be able to promote users to admin status.

---

## 🎯 Secure Methods to Become Admin

### **Method 1: SQL Query (RECOMMENDED)** ⭐

Use the Supabase SQL Editor:

1. **Go to your Supabase project**
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. **Paste this SQL** (replace with your email):

```sql
-- Replace 'your-email@example.com' with your actual email address
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-email@example.com';
```

5. Click **"Run"** (or press Ctrl+Enter)
6. **Log out and log back in** to BizDizy

**✅ Success message:** `Successfully run. 1 rows affected.`

---

### **Method 2: Supabase Dashboard UI**

1. **Go to your Supabase project**
2. Click **"Authentication"** in the left sidebar
3. Click **"Users"** tab
4. Find your user and **click on the user row** to open details
5. Look for one of these sections (UI varies by Supabase version):
   - **"User Metadata"** section
   - **"Raw User Meta Data"** 
   - **"Metadata"** tab
6. You should see a JSON editor or form
7. **Add or update** the `role` field:
   ```json
   {
     "name": "Your Name",
     "phone": "1234567890",
     "role": "admin"
   }
   ```
8. **Save** the changes
9. **Log out and log back in** to BizDizy

---

### **Method 3: Supabase API (For Developers)**

If you have the Service Role Key:

```javascript
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY' // ⚠️ NEVER expose this in frontend!
)

async function makeAdmin(email) {
  const { data: user } = await supabase.auth.admin.listUsers()
  const targetUser = user.users.find(u => u.email === email)
  
  if (targetUser) {
    await supabase.auth.admin.updateUserById(
      targetUser.id,
      { user_metadata: { role: 'admin' } }
    )
    console.log(`✅ ${email} is now an admin`)
  }
}

makeAdmin('your-email@example.com')
```

---

## 🔍 Verify Admin Status

After promoting yourself, verify it worked:

1. **Log out** of BizDizy
2. **Log back in**
3. You should see **"Admin"** button in the header
4. Click it to access the **Admin Dashboard**

---

## 🛡️ Admin Permissions

Once you're an admin, you have access to:

### **Admin Dashboard:**
- ✅ Analytics overview (businesses, reviews, reports)
- ✅ System status monitoring
- ✅ Backend/Database/Storage health checks
- ✅ Deployment alerts

### **Hidden Features:**
- ✅ System Status tab (moved from public pages)
- ✅ Contact message management
- ✅ User management tools (future)
- ✅ Business verification controls (future)

---

## 🚫 Security Best Practices

### **DO:**
- ✅ Only promote trusted users to admin
- ✅ Use SQL method for initial setup
- ✅ Keep Service Role Key secret
- ✅ Use strong passwords for admin accounts
- ✅ Log out after admin sessions on shared computers

### **DON'T:**
- ❌ Create self-service admin promotion features
- ❌ Expose admin setup codes in the UI
- ❌ Share Service Role Keys
- ❌ Allow users to promote themselves
- ❌ Store admin credentials in code

---

## 🔧 Troubleshooting

### **Q: SQL query says "0 rows affected"**
**A:** The email doesn't match any user. Check:
- Spelling of the email (case-sensitive)
- User actually exists in auth.users table
- Use single quotes around email: `'email@example.com'`

### **Q: Still not showing admin after login**
**A:** Try these steps:
1. Clear browser cache
2. Use Incognito/Private window
3. Check browser console for errors
4. Verify the role was set: `SELECT raw_user_meta_data FROM auth.users WHERE email = 'your-email';`

### **Q: Can't find User Metadata in Supabase UI**
**A:** Supabase UI changes frequently. Try:
- Click on the user row itself
- Look for "Edit User" button
- Check different tabs (Details, Metadata, etc.)
- Use SQL method instead (more reliable)

---

## 📋 Quick Reference

**Check current role via SQL:**
```sql
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE email = 'your-email@example.com';
```

**Remove admin role:**
```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data - 'role'
WHERE email = 'your-email@example.com';
```

**List all admins:**
```sql
SELECT email, raw_user_meta_data->>'role' as role 
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'admin';
```

---

## 🎓 Understanding the Role System

### **How it works:**
```typescript
// Code from /utils/auth.ts
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.user_metadata?.role === 'admin';
}
```

### **User metadata structure:**
```json
{
  "name": "John Doe",
  "phone": "1234567890",
  "role": "admin"  // ← This field determines admin status
}
```

---

## 🚀 First Time Setup Checklist

- [ ] Create your BizDizy account
- [ ] Use SQL method to promote yourself to admin
- [ ] Log out and log back in
- [ ] Verify "Admin" button appears in header
- [ ] Access Admin Dashboard
- [ ] Check System Status tab
- [ ] Configure first business

---

**Need help?** Check the main README.md or Supabase documentation.

**Security Questions?** Keep Service Role Keys private and never expose admin logic to the frontend.
