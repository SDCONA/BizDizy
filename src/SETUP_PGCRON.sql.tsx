-- ============================================
-- BizDizy - Automated Message Notifications
-- Setup pg_cron for batched email notifications
-- ============================================

-- STEP 1: Enable required extensions (run these first)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- STEP 2: Schedule the cron job to run every 5 minutes
SELECT cron.schedule(
  'send-message-notifications',  -- Job name
  '*/5 * * * *',                  -- Every 5 minutes (cron expression)
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

-- ============================================
-- VERIFICATION QUERIES (run these separately)
-- ============================================

-- Query 1: View all scheduled cron jobs
-- SELECT * FROM cron.job;

-- Query 2: View recent cron job runs with status
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ============================================
-- MANAGEMENT COMMANDS (for future use)
-- ============================================

-- To UNSCHEDULE the job (stop it):
-- SELECT cron.unschedule('send-message-notifications');

-- To RE-SCHEDULE with different interval (e.g., every 10 minutes):
-- SELECT cron.unschedule('send-message-notifications');
-- SELECT cron.schedule(
--   'send-message-notifications',
--   '*/10 * * * *',  -- Every 10 minutes
--   $$
--   SELECT net.http_post(
--     url := 'https://wezhqjtelpquyzhaeepj.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlemhxanRlbHBxdXl6aGFlZXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODg1MzcsImV4cCI6MjA3NzI2NDUzN30.ymp62w_oNj7QERuByQM7j_0arIeTDwWWmCcagw2uIrQ',
--       'Content-Type', 'application/json'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================
-- NOTES
-- ============================================
-- 
-- • This job runs every 5 minutes automatically
-- • It sends batched email notifications for unread messages
-- • Emails are sent via Resend (noreply@bizdizy.com)
-- • You can still manually trigger via Admin Panel
-- • Check logs in Supabase Dashboard → Database → Cron Jobs
-- 
-- ============================================
