# ✅ Quick Start Checklist - Enable Automated Notifications

## 🎯 Goal
Set up automated email notifications that run every 5 minutes for unread messages.

---

## 📝 **3-Step Checklist**

### ☐ **Step 1: Enable Extensions** (1 minute)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **wezhqjtelpquyzhaeepj**
3. Click: **Database** (left sidebar)
4. Click: **Extensions** (top tab)
5. Search and enable:
   - ☐ `pg_cron` ✅
   - ☐ `http` (or `pg_net`) ✅

---

### ☐ **Step 2: Run SQL Script** (1 minute)

1. Click: **SQL Editor** (left sidebar)
2. Click: **New Query** button
3. Copy ALL content from `SETUP_PGCRON.sql` file
4. Paste into SQL Editor
5. Click: **RUN** button (or press `F5`)
6. ☐ Verify success message appears ✅

---

### ☐ **Step 3: Verify It's Working** (30 seconds)

1. Go to your BizDizy app
2. Navigate to: **Admin Dashboard**
3. Scroll to: **Cron Job Monitor** section
4. Click: **Refresh** button
5. ☐ Verify status shows: **"Active"** with green checkmark ✅

---

## 🎉 **Done!**

Once you see "Active" status, the system will:
- ✅ Check for new unread messages every 5 minutes
- ✅ Send batched email notifications automatically
- ✅ Mark messages as notified to avoid duplicates
- ✅ Log all activity in the Cron Monitor

---

## 🧪 **Test It Now**

**Option 1: Manual Test**
1. Click **"Test Email Notifications Now"** in Cron Monitor
2. Check for success message with email counts

**Option 2: Real Test**
1. Send yourself a message on BizDizy
2. Wait up to 5 minutes
3. Check your email inbox for notification

---

## 📊 **Monitor Performance**

**View in Admin Panel:**
- Status: Active/Inactive
- Last run time
- Emails sent count
- Recent activity log

**View in Supabase:**
```sql
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

---

## ❓ **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Extensions not found | Your Supabase plan may not support pg_cron. Use external cron service instead. |
| SQL script errors | Make sure both extensions are enabled first |
| Status still shows "Not Configured" | Click Refresh button, wait 1 minute, try again |
| Emails not sending | Check RESEND_API_KEY is set in Edge Function environment |

---

**Total Time: ~3 minutes** ⏱️

**Files Needed:**
- ✅ `SETUP_PGCRON.sql` - The SQL script
- 📖 `PGCRON_SETUP_GUIDE.md` - Detailed guide (if needed)

**All set? Your notification system is now fully automated!** 🚀
