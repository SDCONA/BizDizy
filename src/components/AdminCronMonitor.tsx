import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { triggerMessageNotifications } from '../utils/cron';
import { getCronJobStatus } from '../utils/api';
import { Clock, Mail, PlayCircle, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function AdminCronMonitor() {
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const [lastManualRun, setLastManualRun] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<{
    sent: number;
    failed: number;
    messagesProcessed: number;
  } | null>(null);
  
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCronStatus = async () => {
    setLoading(true);
    try {
      const status = await getCronJobStatus();
      setCronStatus(status);
    } catch (error) {
      console.error('Failed to fetch cron status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCronStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCronStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTrigger = async () => {
    setIsManualTrigger(true);
    try {
      const result = await triggerMessageNotifications();
      
      if (result.success) {
        setLastManualRun(new Date());
        setLastResult({
          sent: result.sent || 0,
          failed: result.failed || 0,
          messagesProcessed: result.messagesProcessed || 0
        });
        toast.success(`Email batch sent: ${result.sent || 0} emails, ${result.messagesProcessed || 0} messages`);
      } else {
        toast.error(`Failed to send notifications: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Failed to trigger notification job');
      console.error(error);
    } finally {
      setIsManualTrigger(false);
      // Refresh status after manual trigger
      setTimeout(fetchCronStatus, 2000);
    }
  };

  const messageNotificationJob = cronStatus?.jobs?.find((job: any) => 
    job.command?.includes('send-message-notifications')
  );

  const recentRuns = cronStatus?.recentRuns?.filter((run: any) =>
    run.command?.includes('send-message-notifications')
  ) || [];

  const lastAutoRun = recentRuns[0];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Message Notification Cron</h2>
            <p className="text-sm text-muted-foreground">
              Batch email notifications via Supabase pg_cron
            </p>
          </div>
        </div>
        <Button
          onClick={fetchCronStatus}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {/* Supabase Cron Status */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Supabase pg_cron Status:</span>
            {messageNotificationJob ? (
              <Badge variant="default" className="bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>

          {messageNotificationJob && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Schedule:</span>
                <code className="px-2 py-0.5 bg-background rounded text-xs">
                  {messageNotificationJob.schedule}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Job ID:</span>
                <span className="font-mono text-xs">{messageNotificationJob.jobid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Job Name:</span>
                <span className="font-mono text-xs">{messageNotificationJob.jobname}</span>
              </div>
            </div>
          )}

          {!messageNotificationJob && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                ⚠️ <strong>Setup Required:</strong> Supabase pg_cron not configured. Run the SQL command to set up automatic email notifications.
              </p>
            </div>
          )}
        </div>

        {/* Last Automatic Run */}
        {lastAutoRun && (
          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Last Automatic Run:</span>
              <span className="text-sm text-muted-foreground">
                {new Date(lastAutoRun.start_time).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {lastAutoRun.status === 'succeeded' ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Success
                </Badge>
              ) : lastAutoRun.status === 'failed' ? (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" />
                  Failed
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {lastAutoRun.status}
                </Badge>
              )}
              {lastAutoRun.return_message && (
                <span className="text-xs text-muted-foreground">
                  {lastAutoRun.return_message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Last Manual Run Info */}
        {lastManualRun && lastResult && (
          <div className="p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Last Manual Test:</span>
              <span className="text-sm text-muted-foreground">
                {lastManualRun.toLocaleTimeString()}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {lastResult.sent}
                </div>
                <div className="text-xs text-muted-foreground">Sent</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {lastResult.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {lastResult.messagesProcessed}
                </div>
                <div className="text-xs text-muted-foreground">Messages</div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Trigger Button */}
        <Button
          onClick={handleManualTrigger}
          disabled={isManualTrigger}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
        >
          {isManualTrigger ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Sending Emails...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Test Email Notifications Now (Manual)
            </>
          )}
        </Button>

        {/* Recent Runs Table */}
        {recentRuns.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer hover:text-foreground font-medium mb-2">
              📋 Recent Cron Runs ({recentRuns.length})
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left">Time</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.slice(0, 10).map((run: any, idx: number) => {
                    const duration = run.end_time && run.start_time
                      ? Math.round((new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 1000)
                      : null;
                    
                    return (
                      <tr key={idx} className="border-t border-muted">
                        <td className="p-2">
                          {new Date(run.start_time).toLocaleString()}
                        </td>
                        <td className="p-2">
                          {run.status === 'succeeded' ? (
                            <span className="text-green-600">✓ Success</span>
                          ) : run.status === 'failed' ? (
                            <span className="text-red-600">✗ Failed</span>
                          ) : (
                            <span className="text-muted-foreground">{run.status}</span>
                          )}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {duration ? `${duration}s` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Setup Instructions */}
        {!messageNotificationJob && (
          <details className="text-xs text-muted-foreground" open>
            <summary className="cursor-pointer hover:text-foreground font-medium">
              📚 Setup Instructions - Click to Enable Automation
            </summary>
            <div className="mt-2 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200 dark:border-amber-800 rounded space-y-3">
              <p className="font-semibold text-amber-900 dark:text-amber-100">⚠️ Automated emails are NOT running yet!</p>
              <p><strong>Quick Setup (2 minutes):</strong></p>
              <ol className="list-decimal list-inside space-y-2 ml-2 text-sm">
                <li>
                  <strong>Enable Extensions:</strong>
                  <div className="ml-6 mt-1 text-muted-foreground">
                    Supabase Dashboard → Database → Extensions
                    <br />Enable: <code className="bg-muted px-1 rounded">pg_cron</code> and <code className="bg-muted px-1 rounded">http</code>
                  </div>
                </li>
                <li>
                  <strong>Run SQL Script:</strong>
                  <div className="ml-6 mt-1 text-muted-foreground">
                    SQL Editor → New Query → Copy/paste from <code className="bg-muted px-1 rounded">SETUP_PGCRON.sql</code>
                  </div>
                </li>
                <li>
                  <strong>Verify:</strong>
                  <div className="ml-6 mt-1 text-muted-foreground">
                    Refresh this page - you should see "Active" status above
                  </div>
                </li>
              </ol>
              <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-amber-300 dark:border-amber-700">
                <p className="text-xs font-mono">
                  📄 Full guide: <strong>PGCRON_SETUP_GUIDE.md</strong>
                  <br />
                  📝 SQL script: <strong>SETUP_PGCRON.sql</strong>
                </p>
              </div>
            </div>
          </details>
        )}
      </div>
    </Card>
  );
}