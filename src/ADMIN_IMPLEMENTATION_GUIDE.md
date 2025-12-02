# BizDizy Admin Feature Implementation Guide

## 🎯 Overview

The BizDizy admin system is a **metadata-based role authorization system** built on top of Supabase Auth. It uses JWT token user metadata and Row Level Security (RLS) policies to control admin access without requiring separate admin tables.

---

## 🏗️ Architecture

### Three-Layer Security Model

```
┌─────────────────────────────────────────────────────────┐
│              1. FRONTEND CHECK                          │
│  - Quick UI visibility control                         │
│  - Read from localStorage cached user metadata          │
│  - Functions: isAdmin(), getCurrentUser()              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│         2. BACKEND API VERIFICATION                     │
│  - Verify JWT token and check metadata                 │
│  - Server-side validation before any operation          │
│  - Functions: verifyAdmin(), isCurrentUserAdmin()      │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│       3. DATABASE ROW LEVEL SECURITY (RLS)              │
│  - Final enforcement at database layer                  │
│  - Checks JWT metadata in SQL policies                 │
│  - Cannot be bypassed even with direct DB access        │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 Core Components

### 1. User Metadata Storage

Admin status is stored in **Supabase Auth user metadata** (not in a separate table):

```typescript
// Location: auth.users table (managed by Supabase Auth)
{
  "id": "user-uuid-here",
  "email": "parlando87@ukr.net",
  "user_metadata": {
    "username": "John Doe",
    "phone": "+1234567890",
    "is_admin": true,        // ← Admin flag (boolean)
    "role": "admin"          // ← Alternative format (string)
  }
}
```

**Two formats supported for backward compatibility:**
- `is_admin: true` (boolean)
- `role: "admin"` (string)

---

### 2. Frontend Auth Check (`/utils/auth.ts`)

```typescript
// Check if current user is admin
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.user_metadata?.role === 'admin';
}

// Get current user from localStorage
export function getCurrentUser(): AuthUser | null {
  const stored = localStorage.getItem('bizdizy_current_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
```

**When to use:**
- Showing/hiding UI elements (Admin Dashboard menu)
- Client-side route protection
- Conditional rendering of admin features

**Security note:** This is NOT secure by itself - always verify on backend!

---

### 3. Backend Admin Verification (`/supabase/functions/server/index.tsx`)

```typescript
// Helper function to verify admin user
async function verifyAdmin(authHeader: string | null) {
  const { user, error } = await verifyUser(authHeader);
  
  if (error || !user) {
    return { user: null, error: error || 'Unauthorized' };
  }
  
  // Check if user has admin role in user_metadata (support both formats)
  const isAdmin = user.user_metadata?.role === 'admin' || 
                  user.user_metadata?.is_admin === true;
  if (!isAdmin) {
    return { user: null, error: 'Admin access required' };
  }
  
  return { user, error: null };
}

// Example usage in admin route
app.get('/make-server-726d4144/admin/users', async (c) => {
  const { user, error } = await verifyAdmin(c.req.header('Authorization'));
  
  if (error || !user) {
    return c.json({ error: error || 'Admin access required' }, 403);
  }
  
  // Admin verified - proceed with operation
  // ...
});
```

---

### 4. Database Row Level Security (RLS)

The final layer of protection is enforced at the database level using PostgreSQL RLS policies.

#### Example RLS Policy (`/ADMIN_SETUP.sql`):

```sql
-- Admins can read all businesses (including deleted ones)
CREATE POLICY "admins_can_read_all_businesses"
  ON businesses
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true OR
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- Admins can update any business
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
```

**What this does:**
- Reads JWT token from the database session
- Extracts `user_metadata` from the token
- Checks for admin flag (`is_admin: true` OR `role: "admin"`)
- Allows/denies the operation at the PostgreSQL level

**Tables protected by admin RLS:**
- `businesses` (read, update, delete all)
- `reviews` (read, update, delete all)
- `reports` (read, manage all)
- `contact_messages` (read, manage)
- `terms_and_policies` (manage)
- `analytics_events` (read all)

---

## 🔧 Implementation Steps for New Project

### Step 1: Database Setup

Run the admin setup SQL to create RLS policies:

```sql
-- File: ADMIN_SETUP.sql
-- Run in Supabase SQL Editor after your main database setup
```

### Step 2: Create First Admin User

**Option A: Update existing user**
```sql
-- Find user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Promote to admin
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{is_admin}',
  'true'::jsonb
)
WHERE id = 'user-id-from-above';
```

**Option B: Create admin via backend API**
```typescript
// POST to /make-server-726d4144/admin/signup
// Only works if NO admins exist yet (first admin bootstrap)
{
  "email": "admin@example.com",
  "username": "Admin User",
  "password": "secure-password"
}
```

### Step 3: Backend Admin Routes

Create protected admin endpoints:

```typescript
// Example: Get all users (admin only)
app.get('/make-server-726d4144/admin/users', async (c) => {
  // 1. Verify admin
  const { user, error } = await verifyAdmin(c.req.header('Authorization'));
  if (error || !user) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  // 2. Perform admin operation
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  // 3. Return data
  return c.json({ users: authUsers.users });
});

// Promote user to admin
app.post('/make-server-726d4144/admin/signup', async (c) => {
  const { userId } = await c.req.json();
  
  // Verify requesting user is admin
  const { user: adminUser, error } = await verifyAdmin(c.req.header('Authorization'));
  if (error) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  // Update target user metadata
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' }
  });
  
  if (updateError) {
    return c.json({ error: 'Failed to promote user' }, 500);
  }
  
  return c.json({ success: true });
});

// Demote user from admin
app.post('/make-server-726d4144/admin/demote/:userId', async (c) => {
  const userId = c.req.param('userId');
  
  // Verify admin
  const { user, error } = await verifyAdmin(c.req.header('Authorization'));
  if (error) {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  // Prevent self-demotion
  if (userId === user.id) {
    return c.json({ error: 'Cannot demote yourself' }, 400);
  }
  
  // Remove admin role
  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'user' }
  });
  
  if (updateError) {
    return c.json({ error: 'Failed to demote user' }, 500);
  }
  
  return c.json({ success: true });
});
```

### Step 4: Frontend API Functions (`/utils/api.ts`)

```typescript
// Check if current user is admin
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  return user.user_metadata?.is_admin === true || 
         user.user_metadata?.role === 'admin';
}

// Get all users (admin only)
export async function getAllUsers(): Promise<AdminUser[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/users`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const data = await response.json();
  return data.users || [];
}

// Promote user to admin
export async function promoteUserToAdmin(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/signup`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user');
  }
}
```

### Step 5: Frontend Admin UI Components

```typescript
// Example: Admin Dashboard menu item
import { isAdmin } from '../utils/auth';

export function Navigation() {
  const userIsAdmin = isAdmin();
  
  return (
    <nav>
      <a href="/my-account">My Account</a>
      {userIsAdmin && (
        <a href="/admin">Admin Dashboard</a>
      )}
    </nav>
  );
}

// Example: User Management Component
import { getAllUsers, promoteUserToAdmin, demoteUserFromAdmin } from '../utils/api';

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  async function loadUsers() {
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }
  
  async function handlePromoteUser(userId: string) {
    try {
      await promoteUserToAdmin(userId);
      toast.success('User promoted to admin');
      loadUsers(); // Refresh list
    } catch (error) {
      toast.error('Failed to promote user');
    }
  }
  
  return (
    <div>
      {users.map(user => (
        <div key={user.id}>
          <span>{user.email}</span>
          <Badge>{user.role}</Badge>
          {user.role !== 'admin' && (
            <Button onClick={() => handlePromoteUser(user.id)}>
              Promote to Admin
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🔐 Security Best Practices

### 1. Never Trust Frontend Checks Alone
```typescript
// ❌ BAD - Frontend only
if (isAdmin()) {
  deleteAllUsers(); // Anyone can modify frontend code!
}

// ✅ GOOD - Frontend + Backend + RLS
if (isAdmin()) {
  await deleteAllUsers(); // Calls backend API
  // Backend verifies admin with verifyAdmin()
  // Database enforces with RLS policy
}
```

### 2. Prevent Self-Demotion/Deletion
```typescript
// In backend demote/delete routes
if (userId === user.id) {
  return c.json({ error: 'Cannot demote/delete yourself' }, 400);
}
```

### 3. Require Logout/Login for Role Changes
```typescript
// After promoting/demoting user, tell them to:
// 1. Log out
// 2. Log back in
// This refreshes their JWT token with new metadata
```

### 4. Use Service Role Key Only in Backend
```typescript
// ✅ GOOD - Backend Edge Function
const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // Has admin privileges
);

// ❌ BAD - Frontend
// NEVER expose service role key in frontend!
// Use anon key only
```

---

## 📊 Admin Features Available

### 1. Business Management
- View all businesses (active + deleted)
- Edit any business details
- Soft delete businesses
- Restore deleted businesses (recycle bin)
- Hard delete businesses permanently

### 2. User Management
- View all registered users
- See user stats (business count, join date, last sign-in)
- Promote users to admin
- Demote admins to regular users
- Delete user accounts

### 3. Content Moderation
- View all reports (business/review)
- Review reported content
- Take action (approve, reject, delete)
- Add admin notes to reports

### 4. Contact Messages
- View all contact form submissions
- Mark messages as read
- Reply to users
- Delete old messages

### 5. Terms & Policy Management
- Update Terms of Service
- Update Privacy Policy
- Notify all users of policy changes
- Track notification status

### 6. Analytics (if implemented)
- View platform-wide statistics
- Business registration trends
- User growth metrics
- Category popularity

---

## 🔄 Session Flow

```
┌─────────────────────────────────────────────────┐
│  1. USER LOGS IN                                │
│     - Supabase Auth validates credentials       │
│     - Creates JWT token with user_metadata      │
│     - Returns access_token + user object        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  2. FRONTEND STORES SESSION                     │
│     - Save to localStorage: bizdizy_current_user│
│     - Cache user_metadata for quick access      │
│     - Show admin UI if role = admin             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  3. ADMIN ACTION TRIGGERED                      │
│     - User clicks "View All Users"              │
│     - Frontend calls API with access_token      │
│     - Authorization: Bearer <access_token>      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  4. BACKEND VERIFIES TOKEN                      │
│     - Extract token from Authorization header   │
│     - supabase.auth.getUser(token)             │
│     - Check user_metadata.role === 'admin'      │
│     - Proceed or return 403 Forbidden           │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  5. DATABASE ENFORCES RLS                       │
│     - JWT token passed to Postgres             │
│     - RLS policy checks auth.jwt() metadata     │
│     - Allow/deny at row level                   │
└─────────────────────────────────────────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue: "User not allowed" after making admin

**Cause:** JWT token not refreshed

**Solution:**
```typescript
// User MUST log out and log back in
await logout();
// Then login again
// This creates a new JWT with updated metadata
```

### Issue: Admin can't see other users' data

**Cause:** RLS policies not created

**Solution:**
```sql
-- Run ADMIN_SETUP.sql in Supabase SQL Editor
-- Check if policies exist:
SELECT * FROM pg_policies WHERE tablename = 'businesses';
```

### Issue: Regular user can bypass frontend checks

**Cause:** Only checking on frontend

**Solution:**
```typescript
// ALWAYS verify on backend
const { user, error } = await verifyAdmin(authHeader);
if (error) {
  return c.json({ error: 'Access denied' }, 403);
}
```

### Issue: Admin status lost after page refresh

**Cause:** localStorage cleared or session expired

**Solution:**
```typescript
// Check session on app load
useEffect(() => {
  checkSession().then(user => {
    if (user) {
      saveCurrentUser(user);
    }
  });
}, []);
```

---

## 📝 Key Takeaways

1. **Metadata-based:** Admin status stored in JWT user_metadata, not separate table
2. **Three-layer security:** Frontend (UX) + Backend (API) + Database (RLS)
3. **Two formats supported:** `is_admin: true` OR `role: "admin"`
4. **Session-based:** Changes require logout/login to refresh JWT
5. **Service role required:** Backend uses service role key to modify user metadata
6. **RLS is the enforcer:** Final protection layer that cannot be bypassed
7. **Never expose service key:** Only use in backend Edge Functions
8. **Prevent self-actions:** Don't let admins demote/delete themselves

---

## 🚀 Next Steps for Your Project

1. Copy `/ADMIN_SETUP.sql` to your project
2. Run it in Supabase SQL Editor after main database setup
3. Create first admin user (SQL update or API call)
4. Implement `verifyAdmin()` helper in your backend
5. Create admin routes with proper verification
6. Build frontend API functions with session token passing
7. Add admin UI components with `isAdmin()` checks
8. Test with multiple users and role changes
9. Verify RLS policies work by trying to bypass with direct API calls

**Good luck! 🎉**
