# 📧 BizDizy Message Notification System

## What's New?

BizDizy now has a **smart batched email notification system** for messaging between customers and businesses!

---

## 🎯 Key Features

### ✅ Batched Notifications (Every 5 Minutes)
- **No more spam!** Messages are grouped and sent every 5 minutes
- **Prevents rate limiting** - Stays well under Resend email limits
- **Better UX** - Users get organized summaries instead of individual emails

### ✅ Smart Grouping
- Multiple unread messages are combined into one email
- Shows unread count: "You have 3 new messages"
- Displays latest message preview
- Direct link to view full conversation

### ✅ Bidirectional Notifications
- **Customer → Business**: Business owner gets notified
- **Business → Customer**: Customer gets notified
- Both directions tracked separately

### ✅ Admin Monitoring
- Real-time status dashboard
- Manual trigger for testing
- Auto-mode for development
- View sent/failed counts

---

## 🔄 System Flow

```
1. User sends message
   ↓
2. Message saved (email_notified_at = NULL)
   ↓
3. [5 minutes later]
   ↓
4. Cron job runs:
   - Finds unread messages (email_notified_at IS NULL)
   - Groups by recipient
   - Sends batch emails
   - Updates email_notified_at timestamp
   ↓
5. Recipient receives organized email summary
```

---

## 📊 Database Changes

### New Column: `email_notified_at`

Added to `messages` table to track when notification emails were sent:

```sql
ALTER TABLE messages ADD COLUMN email_notified_at TIMESTAMPTZ;
```

This migration runs automatically on server startup.

### Message States

| State | read_at | email_notified_at | Meaning |
|-------|---------|-------------------|---------|
| **Unread & Not Notified** | NULL | NULL | Will be emailed in next cron run |
| **Unread & Notified** | NULL | timestamp | Email sent, waiting for user to read |
| **Read** | timestamp | timestamp | User has read the message |

---

## 🚀 Setup Required

### 1. Resend API Key ✅ Already Done!

The `RESEND_API_KEY` has been added to Supabase Edge Function Secrets.

### 2. Set Up Cron Job (Required for Production)

Choose one of these methods:

#### 🌟 Recommended: External Cron Service (5 minutes)

1. Go to [cron-job.org](https://cron-job.org) (free)
2. Create new job:
   ```
   URL: https://YOUR_PROJECT.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
   Schedule: */5 * * * * (every 5 minutes)
   Method: POST
   Headers:
     Authorization: Bearer YOUR_SUPABASE_ANON_KEY
     Content-Type: application/json
   ```
3. Save and enable

**See `CRON_SETUP_INSTRUCTIONS.md` for detailed setup guides** including:
- External cron services (cron-job.org, EasyCron)
- GitHub Actions
- Supabase Cron (pg_cron)
- Vercel Cron

---

## 🧪 Testing

### Manual Testing

1. **Admin Dashboard** → System tab
2. Find "Message Notification Cron" card
3. Click **"Send Now (Manual)"** to trigger immediately
4. View results: emails sent, failed, messages processed

### Development Auto-Mode

1. **Admin Dashboard** → System tab  
2. Click **"Start Auto (5 min)"**
3. Cron runs every 5 minutes while browser is open
4. Click **"Stop Auto"** when done

⚠️ **Warning:** Browser auto-mode only works while the page is open. Use external cron for production!

### API Testing

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://YOUR_PROJECT.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
```

---

## 📧 Email Template

Recipients receive beautiful HTML emails with:

- **BizDizy branding** - Gradient header with logo
- **Unread count badge** - "3 Unread Messages" (if multiple)
- **Message preview** - Latest message (up to 300 chars)
- **Action button** - "View Full Conversation" → https://bizdizy.com/messages
- **Mobile responsive** - Looks great on all devices

### Example Email Subject Lines:

- Customer to Business: `💬 New message for ABC Plumbing`
- Multiple messages: `💬 New messages (3) for ABC Plumbing`
- Business reply: `💬 ABC Plumbing replied to your message`

---

## 🛠️ Technical Details

### Endpoint

```
POST /make-server-726d4144/cron/send-message-notifications
```

### Response

```json
{
  "success": true,
  "sent": 5,
  "failed": 0,
  "messagesProcessed": 8
}
```

### Implementation Files

- `/supabase/functions/server/index.tsx` - Cron endpoint & email logic
- `/utils/cron.ts` - Frontend utilities for triggering cron
- `/components/AdminCronMonitor.tsx` - Admin dashboard component
- `/CRON_SETUP_INSTRUCTIONS.md` - Detailed setup guide

---

## 🔍 Monitoring & Logs

### Supabase Edge Function Logs

1. **Supabase Dashboard** → Edge Functions → `make-server-726d4144`
2. **Logs tab**
3. Look for:
   ```
   🕐 Starting batched email notification cron job...
   📧 Found 8 unread messages to process
   👥 Grouped into 3 recipients
   ✅ Email sent to user@example.com (3 messages)
   🎉 Cron job complete: 3 sent, 0 failed
   ```

### Admin Dashboard Monitor

Real-time monitoring card shows:
- ✅ Status: Running / Stopped
- 📊 Last run time
- 📈 Emails sent
- ❌ Emails failed
- 📝 Messages processed

---

## ⚠️ Important Notes

### Rate Limiting Prevention

✅ **Old system:** Email sent immediately → 2 email limit hit quickly  
✅ **New system:** Batched every 5 minutes → Stays under limits

### Email Delivery Guarantee

- Messages are **never lost** if emails fail
- System retries on next cron run (5 min later)
- Messages marked as notified only after successful email send

### User Experience

- Users don't get spammed with individual emails
- Receive organized summaries every 5 minutes
- Direct link to messages page for full conversation

---

## 🎉 Benefits

| Before | After |
|--------|-------|
| ❌ Email sent immediately | ✅ Batched every 5 minutes |
| ❌ One email per message | ✅ One email with summary |
| ❌ Rate limiting after 2 emails | ✅ No rate limiting |
| ❌ Email spam | ✅ Organized notifications |
| ❌ No tracking | ✅ Full tracking & monitoring |

---

## 🚀 Next Steps

1. ✅ **DONE:** Add `RESEND_API_KEY` to Supabase Secrets
2. ✅ **DONE:** Deploy updated Edge Function
3. ⏳ **TODO:** Set up production cron (see `CRON_SETUP_INSTRUCTIONS.md`)
4. ✅ **DONE:** Test with Admin Dashboard monitor
5. ✅ **DONE:** Monitor logs and performance

---

## 📚 Documentation

- `CRON_SETUP_INSTRUCTIONS.md` - Detailed cron setup guides
- Admin Dashboard → System tab - Real-time monitoring
- Edge Function logs - Detailed execution logs

---

## 🤝 Support

If you need help:

1. Check `CRON_SETUP_INSTRUCTIONS.md` for troubleshooting
2. View Supabase Edge Function logs
3. Use Admin Dashboard monitor to debug
4. Test manually with "Send Now" button

---

**Your message notification system is ready!** 🎉

Just set up the production cron job and you're all set. Messages will be reliably delivered every 5 minutes without any rate limiting issues.
