/**
 * BizDizy Cron Job Utilities
 * 
 * This file contains utilities for triggering scheduled tasks.
 * The main cron job sends batched email notifications every 5 minutes.
 */

import { projectId, publicAnonKey } from './supabase/info';

/**
 * Manually trigger the message notification email batch job
 * This is useful for testing or manual execution
 */
export async function triggerMessageNotifications(): Promise<{
  success: boolean;
  sent?: number;
  failed?: number;
  messagesProcessed?: number;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to trigger notification cron:', error);
      return { success: false, error };
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering notification cron:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Set up automatic execution every 5 minutes (browser-based)
 * Note: This only works while the browser tab is open.
 * For production, use Supabase Cron or external cron service.
 */
export function startAutomaticNotifications(): () => void {
  console.log('🕐 Starting automatic message notification cron (every 5 minutes)');
  
  // Run immediately on start
  triggerMessageNotifications();
  
  // Then run every 5 minutes
  const interval = setInterval(() => {
    triggerMessageNotifications();
  }, 5 * 60 * 1000); // 5 minutes in milliseconds
  
  // Return cleanup function
  return () => {
    console.log('🛑 Stopping automatic message notification cron');
    clearInterval(interval);
  };
}

// PRODUCTION SETUP INSTRUCTIONS
// ==============================
// 
// For production, you should use one of these methods:
// 
// 1. SUPABASE CRON (Recommended if available):
//    - Go to Supabase Dashboard > Database > Cron Jobs
//    - Create a new cron job with schedule: every 5 minutes
//    - Use SQL to call the endpoint via net.http_post
// 
// 2. EXTERNAL CRON SERVICE (EasyCron, cron-job.org, etc):
//    - URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-726d4144/cron/send-message-notifications
//    - Method: POST
//    - Headers: Authorization: Bearer YOUR_ANON_KEY
//    - Schedule: Every 5 minutes
// 
// 3. GITHUB ACTIONS (Free):
//    - Create .github/workflows/cron.yml with scheduled workflow
//    - Use curl to POST to the endpoint with Authorization header
//
// See CRON_SETUP_INSTRUCTIONS.md for complete detailed setup examples