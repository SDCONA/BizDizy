import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function MessageNotificationDiagnostic() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDiagnostic = async () => {
    setChecking(true);
    try {
      const supabase = createClient();
      
      // Check for unread messages that need notification
      const { data: unnotifiedMessages, error } = await supabase
        .from('messages')
        .select('id, created_at')
        .is('read_at', null)
        .is('email_notified_at', null);
      
      if (error) {
        console.error('Diagnostic error:', error);
        toast.error(`Failed to run diagnostic: ${error.message}`);
        return;
      }
      
      // Get all unread messages (including already notified)
      const { data: allUnread } = await supabase
        .from('messages')
        .select('id')
        .is('read_at', null);
      
      const diagnostic = {
        unreadTotal: allUnread?.length || 0,
        needingEmail: unnotifiedMessages?.length || 0,
        alreadyNotified: (allUnread?.length || 0) - (unnotifiedMessages?.length || 0),
        messages: unnotifiedMessages || []
      };
      
      setResults(diagnostic);
      
      if (diagnostic.needingEmail > 0) {
        toast.info(`Found ${diagnostic.needingEmail} message(s) waiting for email notification`);
      } else if (diagnostic.unreadTotal > 0) {
        toast.success(`${diagnostic.unreadTotal} unread message(s) - all already notified`);
      } else {
        toast.success('No unread messages');
      }
      
    } catch (error) {
      console.error('Diagnostic error:', error);
      toast.error('Diagnostic failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
      <div className="flex items-center gap-3 mb-4">
        <AlertCircle className="w-6 h-6 text-blue-600" />
        <h3 className="font-semibold">Email Notification Diagnostic</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Check how many unread messages are waiting for email notifications
      </p>
      
      <Button 
        onClick={runDiagnostic} 
        disabled={checking}
        variant="outline"
        className="w-full mb-4"
      >
        {checking ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            Run Diagnostic
          </>
        )}
      </Button>
      
      {results && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {results.unreadTotal}
              </div>
              <div className="text-xs text-muted-foreground">Total Unread</div>
            </div>
            
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {results.needingEmail}
              </div>
              <div className="text-xs text-muted-foreground">Need Email</div>
            </div>
            
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {results.alreadyNotified}
              </div>
              <div className="text-xs text-muted-foreground">Already Sent</div>
            </div>
          </div>
          
          {results.needingEmail > 0 && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                ⚠️ <strong>{results.needingEmail} message(s)</strong> waiting for email notification.
                <br />
                <span className="text-xs">
                  Click "Send Now (Manual)" above to send emails immediately, or start auto-mode.
                </span>
              </p>
            </div>
          )}
          
          {results.needingEmail === 0 && results.unreadTotal > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✅ All unread messages have been emailed.
              </p>
            </div>
          )}
          
          {results.unreadTotal === 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No unread messages found.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}