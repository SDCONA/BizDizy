# 🔧 pg_cron Troubleshooting Guide

## Issue: "column jobname does not exist"

This error occurs because different versions of pg_cron have different table structures. Here's how to fix it:

---

## ✅ **Solution: Run SQL in Steps**

Instead of running all SQL at once, run these commands **ONE AT A TIME**:

### **Step 1: Enable Extensions**

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;
```

**Expected result:** `CREATE EXTENSION` (success message)

---

### **Step 2: Schedule the Job**

```sql
SELECT cron.schedule(
  'send-message-notifications',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wezhqjtelpquyzhaeepj.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemhxanRlbHBxdXl6aGFlZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODg1MzcsImV4cCI6MjA3NzI2NDUzN30.ymp62w_oNj7QERuByQM7j_0arIeTDwWWmCcagw2uIrQ',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Expected result:** Returns a job ID number (e.g., `1` or `2`)

---

### **Step 3: Verify Installation**

Run this query **separately** to check if the job was created:

```sql
SELECT * FROM cron.job;
```

**Expected result:** A table showing your scheduled job with columns like:
- `jobid` (e.g., 1)
- `schedule` (*/5 * * * *)
- `command` (the SELECT net.http_post...)
- `active` (true)

---

## 🎯 **Quick Check: Is It Working?**

After 5 minutes, check if emails are being sent:

1. Go to your BizDizy Admin Dashboard
2. Click "Cron Job Monitor"
3. Click "Test Email Notifications Now"
4. Should see success message

Or check the database directly:

```sql
SELECT COUNT(*) 
FROM messages 
WHERE email_notified_at IS NOT NULL;
```

If this number increases over time, the cron job is working!

---

## 🔍 **Alternative: Check Job Runs**

If `cron.job` works, you can also check execution history:

```sql
SELECT * 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

This shows you when the job last ran and if it succeeded or failed.

---

## ❌ **Common Issues**

### Issue: "relation cron.job does not exist"

**Solution:** The `pg_cron` extension is not enabled.
1. Go to: Database → Extensions
2. Search for `pg_cron`
3. Click toggle to enable it
4. Try again

---

### Issue: "function net.http_post does not exist"

**Solution:** The `http` extension is not enabled.
1. Go to: Database → Extensions  
2. Search for `http` or `pg_net`
3. Enable whichever one is available
4. If using `pg_net`, change the command to use `net.http_post` (should work as-is)

---

### Issue: Job created but emails not sending

**Possible causes:**

1. **RESEND_API_KEY not configured**
   - Go to: Edge Functions → Settings → Secrets
   - Add: `RESEND_API_KEY = your_resend_api_key`

2. **Domain not verified in Resend**
   - Log in to resend.com
   - Verify that bizdizy.com is verified

3. **Edge Function not deployed**
   - Check: Functions → make-server-726d4144
   - Should show "deployed" status

4. **Test manually first:**
   ```sql
   SELECT net.http_post(
     url := 'https://wezhqjtelpquyzhaeepj.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications',
     headers := jsonb_build_object(
       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemhxanRlbHBxdXl6aGFlZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODg1MzcsImV4cCI6MjA3NzI2NDUzN30.ymp62w_oNj7QERuByQM7j_0arIeTDwWWmCcagw2uIrQ',
       'Content-Type', 'application/json'
     ),
     body := '{}'::jsonb
   );
   ```
   This should return a response showing if it worked.

---

## 🎉 **Success Checklist**

- ✅ `CREATE EXTENSION` commands succeeded
- ✅ `cron.schedule()` returned a job ID
- ✅ `SELECT * FROM cron.job` shows your job
- ✅ Admin Panel shows "Active" status (refresh after 5 min)
- ✅ Test button sends emails successfully

---

## 📞 **Still Not Working?**

### Alternative Solution: Use External Cron Service

If Supabase pg_cron continues to have issues, you can use a free external cron service:

1. **Go to:** [cron-job.org](https://cron-job.org) (free account)
2. **Create job:**
   - Title: BizDizy Notifications
   - URL: `https://wezhqjtelpquyzhaeepj.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications`
   - Schedule: Every 5 minutes
   - Method: POST
   - Headers:
     ```
     Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemhxanRlbHBxdXl6aGFlZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODg1MzcsImV4cCI6MjA3NzI2NDUzN30.ymp62w_oNj7QERuByQM7j_0arIeTDwWWmCcagw2uIrQ
     Content-Type: application/json
     ```

This will have the exact same effect as pg_cron but managed externally.

---

**Need more help?** Check the main `PGCRON_SETUP_GUIDE.md` for complete setup instructions.
