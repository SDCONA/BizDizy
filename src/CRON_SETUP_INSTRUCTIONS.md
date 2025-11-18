# 📧 BizDizy Message Notification Cron Setup

## Overview

BizDizy uses a **batched email notification system** that sends email alerts for unread messages **every 5 minutes** instead of sending emails immediately. This approach:

✅ **Prevents rate limiting** - Avoids hitting email provider limits  
✅ **Reduces spam** - Groups multiple messages into single emails  
✅ **Improves efficiency** - Batch processing is more performant  
✅ **Better user experience** - Users receive organized summaries instead of individual emails for each message

---

## 🔧 How It Works

### Database Schema
```sql
messages (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_type TEXT,  -- 'user' or 'business'
  message TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,           -- NULL = unread
  email_notified_at TIMESTAMPTZ  -- NULL = not yet emailed
)
```

### Process Flow

1. **User sends message** → Saved to database with `email_notified_at = NULL`
2. **Cron runs every 5 minutes** → Finds all messages where:
   - `read_at IS NULL` (message not read)
   - `email_notified_at IS NULL` (email not yet sent)
3. **Groups by recipient** → Batches messages by who should receive them
4. **Sends summary emails** → One email per recipient with all unread messages
5. **Updates tracking** → Sets `email_notified_at` to current timestamp

---

## 🚀 Production Setup Options

### Option 1: External Cron Service (Recommended)

Use a free external cron service like **cron-job.org**, **EasyCron**, or **Uptime Robot**.

#### Setup Instructions:

1. **Go to [cron-job.org](https://cron-job.org)** (or similar service)

2. **Create a new cron job** with these settings:
   ```
   URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
   Method: POST
   Schedule: Every 5 minutes (*/5 * * * *)
   ```

3. **Add Headers:**
   ```
   Authorization: Bearer YOUR_SUPABASE_ANON_KEY
   Content-Type: application/json
   ```

4. **Get your credentials:**
   - Find `YOUR_PROJECT_ID` in Supabase Dashboard → Project Settings → API
   - Find `YOUR_SUPABASE_ANON_KEY` in Supabase Dashboard → Project Settings → API → anon public

5. **Test the cron job** and enable it

#### Example with cron-job.org:
```
Title: BizDizy Message Notifications
URL: https://abcdefghijklmnop.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
Schedule: */5 * * * * (Every 5 minutes)
Request Method: POST
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
```

---

### Option 2: GitHub Actions (Free, Reliable)

Use GitHub Actions for free automated cron jobs.

#### Setup Instructions:

1. **Create file:** `.github/workflows/message-notifications.yml`

2. **Add this configuration:**
```yaml
name: Send Message Notifications

on:
  schedule:
    # Runs every 5 minutes
    - cron: '*/5 * * * *'
  
  # Allows manual trigger from GitHub UI
  workflow_dispatch:

jobs:
  send-notifications:
    runs-on: ubuntu-latest
    
    steps:
      - name: Trigger notification cron
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://${{ secrets.SUPABASE_PROJECT_ID }}.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
```

3. **Add GitHub Secrets:**
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add secrets:
     - `SUPABASE_PROJECT_ID`: Your Supabase project ID
     - `SUPABASE_ANON_KEY`: Your Supabase anon/public key

4. **Commit and push** - The workflow will start automatically

5. **Monitor:** GitHub Actions → Select workflow → View runs

---

### Option 3: Supabase Cron (If Available)

Some Supabase plans support pg_cron for database-level scheduled tasks.

#### Setup Instructions:

1. **Check availability:** Go to Supabase Dashboard → Database → Extensions
2. **Enable pg_cron** extension if available
3. **Go to:** Database → Cron Jobs (or use SQL Editor)
4. **Create cron job:**

```sql
-- Create a cron job that runs every 5 minutes
SELECT cron.schedule(
  'send-message-notifications',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

5. **Replace** `YOUR_PROJECT_ID` and `YOUR_SUPABASE_ANON_KEY`

6. **Verify:** Check cron job status with:
```sql
SELECT * FROM cron.job;
```

---

### Option 4: Vercel Cron (If using Vercel)

If your frontend is deployed on Vercel, you can use Vercel Cron.

#### Setup Instructions:

1. **Create file:** `vercel.json` in your project root

2. **Add configuration:**
```json
{
  "crons": [
    {
      "path": "/api/cron/message-notifications",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

3. **Create API route:** `pages/api/cron/message-notifications.ts`
```typescript
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verify this is coming from Vercel Cron
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const response = await fetch(
    `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  return res.status(200).json(data);
}
```

4. **Add environment variables** in Vercel Dashboard
5. **Deploy** - Cron will start automatically

---

## 🧪 Testing

### Manual Testing (Browser)

1. **Log in as admin** → Go to Admin Dashboard → System tab
2. **Click "Send Now (Manual)"** to trigger immediately
3. **Check console logs** for results
4. **Verify emails** were sent

### Browser-Based Auto Mode (Development Only)

⚠️ **Warning:** Only works while browser tab is open!

1. **Admin Dashboard → System tab**
2. **Click "Start Auto (5 min)"**
3. Cron will run automatically every 5 minutes
4. **Click "Stop Auto"** when done

### API Testing (cURL)

Test the endpoint directly:

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
```

**Expected Response:**
```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "messagesProcessed": 5
}
```

---

## 📊 Monitoring

### Check Logs

**Supabase Edge Function Logs:**
1. Go to Supabase Dashboard
2. Edge Functions → `make-server-726d4144`
3. Logs tab
4. Look for:
   - `🕐 Starting batched email notification cron job...`
   - `✅ Email sent to user@example.com (3 messages)`
   - `🎉 Cron job complete: X sent, Y failed`

### Admin Dashboard

Monitor cron status in real-time:
1. Admin Dashboard → System tab
2. View "Message Notification Cron" card
3. Shows:
   - Last run time
   - Emails sent
   - Failed emails
   - Messages processed

---

## 🔍 Troubleshooting

### No emails being sent

1. **Check RESEND_API_KEY:**
   ```bash
   # Verify in Supabase Dashboard → Edge Functions → Secrets
   ```

2. **Check cron is running:**
   - External service: Check service dashboard
   - GitHub Actions: Check workflow runs
   - Supabase Cron: Query `SELECT * FROM cron.job;`

3. **Check edge function logs:**
   - Look for errors or warnings
   - Verify `RESEND_API_KEY not configured` message

4. **Test manually:**
   ```bash
   curl -X POST ...  # See API Testing section above
   ```

### Emails delayed

- **Check cron schedule:** Ensure it's set to `*/5 * * * *`
- **Check external service status:** Some free services may have delays
- **Consider upgrading:** To a paid cron service for guaranteed execution

### Rate limiting still occurring

- **Increase interval:** Change from 5 minutes to 10 or 15 minutes
- **Check Resend limits:** Free tier has daily limits
- **Upgrade Resend plan:** For higher limits

---

## 🎯 Recommended Setup

For production, we recommend:

1. **Primary:** External cron service (cron-job.org) - Simple, reliable, free
2. **Backup:** GitHub Actions - Redundancy in case primary fails
3. **Monitor:** Use Admin Dashboard to track performance

---

## 📝 Summary

| Method | Reliability | Cost | Setup Difficulty | Best For |
|--------|-------------|------|------------------|----------|
| External Cron | ⭐⭐⭐⭐⭐ | Free | Easy | **Recommended** |
| GitHub Actions | ⭐⭐⭐⭐ | Free | Medium | Redundancy |
| Supabase Cron | ⭐⭐⭐⭐⭐ | Paid plans | Easy | Enterprise |
| Vercel Cron | ⭐⭐⭐⭐ | Free | Medium | Vercel users |
| Browser Auto | ⭐⭐ | Free | Easy | Development only |

---

## 🚀 Quick Start (5 minutes)

1. Go to **[cron-job.org](https://cron-job.org)**
2. Sign up (free)
3. Create new job:
   - URL: `https://YOUR_PROJECT.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications`
   - Schedule: `*/5 * * * *`
   - Method: POST
   - Header: `Authorization: Bearer YOUR_KEY`
4. Save and enable
5. Done! ✅

---

**Questions?** Check the logs in Supabase Dashboard or use the Admin Dashboard monitor to track performance.
