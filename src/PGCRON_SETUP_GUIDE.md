# 🚀 BizDizy pg_cron Setup Guide

This guide will help you set up **automated email notifications** for unread messages using Supabase's pg_cron extension.

---

## 📋 **Prerequisites**

✅ Supabase project is live  
✅ RESEND_API_KEY is configured (already done)  
✅ Domain verified: bizdizy.com (already done)  

---

## 🔧 **Setup Steps**

### **Step 1: Enable Extensions**

1. Go to your **Supabase Dashboard**
2. Navigate to: **Database** → **Extensions**
3. Search for and enable these two extensions:
   - ✅ `pg_cron` - For scheduled jobs
   - ✅ `http` (or `pg_net`) - For making HTTP requests

**Screenshot locations:**
- Left sidebar: Database
- Top tabs: Extensions
- Search box: Type "pg_cron"
- Click the toggle to enable

---

### **Step 2: Run SQL Script**

1. Go to: **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste the contents of `SETUP_PGCRON.sql`
4. Click **"Run"** (or press F5)

**Expected output:**
```
success: true
schedule: send-message-notifications created
```

---

### **Step 3: Verify Installation**

Run this verification query in SQL Editor:

```sql
SELECT * FROM cron.job;
```

**Expected result:**
| jobid | schedule     | command                | nodename  | nodeport | database | username |
|-------|--------------|------------------------|-----------|----------|----------|----------|
| 1     | */5 * * * *  | SELECT net.http_post... | localhost | 5432     | postgres | postgres |

---

### **Step 4: Test the Setup**

#### **Option A: Wait 5 minutes**
- The job will run automatically
- Check the Admin Panel → Cron Monitor
- Look for "Last Run" timestamp

#### **Option B: Trigger Manually First**
1. Go to **Admin Dashboard**
2. Click on **"Cron Job Monitor"**
3. Click **"Trigger Now"** button
4. Verify you see success message

---

## 🔍 **How to Monitor**

### **1. Using Supabase Dashboard**

```sql
-- View recent job runs
SELECT 
  jobid,
  jobname,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 20;
```

### **2. Using BizDizy Admin Panel**

- Go to: **Admin Dashboard** → **Cron Job Monitor**
- Shows:
  - ✅ Job status (Active/Inactive)
  - 🕐 Last run time
  - 📊 Recent activity (emails sent)
  - 🔘 Manual trigger button

---

## ✅ **What Happens Now?**

Every 5 minutes, the system will:

1. ✅ Check for **unread messages** where `email_notified_at` is null
2. ✅ **Group messages** by recipient (avoid spam)
3. ✅ **Send beautiful HTML emails** via Resend
4. ✅ **Mark messages** as notified with timestamp
5. ✅ **Log results** (success/failure counts)

---

## 🎯 **Email Details**

**From:** BizDizy <noreply@bizdizy.com>  
**Subject:** 💬 New message for [Business Name]  
**Frequency:** Every 5 minutes (batched)  
**Design:** Branded HTML template with gradient header  

**Sample email includes:**
- Sender name
- Message preview (first 300 chars)
- Unread count badge (if multiple)
- "View Full Conversation" button → https://bizdizy.com/messages

---

## 🛠️ **Troubleshooting**

### ❌ **Job not showing up**

```sql
-- Check if extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('pg_cron', 'http');

-- If missing, enable them:
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;
```

### ❌ **Job failing**

```sql
-- Check error messages
SELECT 
  jobname,
  status,
  return_message,
  start_time
FROM cron.job_run_details
WHERE status = 'failed'
ORDER BY start_time DESC
LIMIT 5;
```

### ❌ **Emails not sending**

1. Check RESEND_API_KEY in Edge Function settings
2. Verify domain (bizdizy.com) in Resend dashboard
3. Check Resend daily limits (free tier)
4. View Edge Function logs for errors

---

## 🔄 **Management Commands**

### **Pause the job**
```sql
SELECT cron.unschedule('send-message-notifications');
```

### **Resume/Reschedule**
```sql
SELECT cron.schedule(
  'send-message-notifications',
  '*/5 * * * *',
  $$ ... (full command from SETUP_PGCRON.sql) ... $$
);
```

### **Change interval to 10 minutes**
```sql
SELECT cron.unschedule('send-message-notifications');
SELECT cron.schedule(
  'send-message-notifications',
  '*/10 * * * *',  -- Every 10 minutes instead of 5
  $$ ... (same command) ... $$
);
```

### **Delete the job completely**
```sql
SELECT cron.unschedule('send-message-notifications');
```

---

## 📊 **Cron Expression Guide**

| Expression    | Meaning                  |
|---------------|--------------------------|
| `*/5 * * * *` | Every 5 minutes         |
| `*/10 * * * *`| Every 10 minutes        |
| `*/15 * * * *`| Every 15 minutes        |
| `0 * * * *`   | Every hour (on the hour)|
| `0 */2 * * *` | Every 2 hours           |
| `0 9 * * *`   | Daily at 9:00 AM        |

Format: `minute hour day month weekday`

---

## 🎉 **You're All Set!**

Once you complete Step 2 above, your notification system will be **fully automated**! 

Users will receive email notifications for unread messages every 5 minutes, beautifully formatted and batched to avoid spam.

**Next Steps:**
1. ✅ Run `SETUP_PGCRON.sql`
2. ✅ Verify in Admin Panel
3. ✅ Send a test message to yourself
4. ✅ Wait 5 minutes and check your email! 📧

---

**Need Help?** Check the Admin Panel's Cron Monitor for real-time status and diagnostics.
