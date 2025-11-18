import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Bug, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function MessageDatabaseDebugger() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runDebug = async () => {
    setChecking(true);
    try {
      const supabase = createClient();
      
      // 1. Check total messages count
      const { data: allMessages, error: allError } = await supabase
        .from('messages')
        .select('*');
      
      if (allError) {
        console.error('Error fetching all messages:', allError);
        toast.error(`Database error: ${allError.message}`);
        setResults({ error: allError.message });
        return;
      }
      
      // 2. Check unread messages (read_at IS NULL)
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('*')
        .is('read_at', null);
      
      // 3. Check unread & not notified
      const { data: unnotifiedMessages } = await supabase
        .from('messages')
        .select('*')
        .is('read_at', null)
        .is('email_notified_at', null);
      
      // 4. Check messages with missing sender_id
      const messagesWithoutSender = allMessages?.filter(m => !m.sender_id) || [];
      
      // 5. Sample messages for inspection
      const sampleMessages = allMessages?.slice(0, 5) || [];
      
      const debugData = {
        totalMessages: allMessages?.length || 0,
        unreadMessages: unreadMessages?.length || 0,
        unnotifiedMessages: unnotifiedMessages?.length || 0,
        missingData: {
          noSenderId: messagesWithoutSender.length,
          noSenderType: allMessages?.filter(m => !m.sender_type).length || 0,
        },
        sampleMessages: sampleMessages.map(m => ({
          id: m.id.substring(0, 8),
          message: m.message?.substring(0, 30) + '...',
          read_at: m.read_at ? 'READ' : 'UNREAD',
          email_notified_at: m.email_notified_at ? 'NOTIFIED' : 'NOT NOTIFIED',
          sender_id: m.sender_id ? 'YES' : 'MISSING',
          sender_type: m.sender_type || 'MISSING',
          created_at: new Date(m.created_at).toLocaleString(),
        }))
      };
      
      setResults(debugData);
      console.log('Debug results:', debugData);
      toast.success('Debug complete - check results below');
      
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Debug failed');
      setResults({ error: String(error) });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
      <div className="flex items-center gap-3 mb-4">
        <Bug className="w-6 h-6 text-red-600" />
        <h3 className="font-semibold">Database Debugger</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Deep dive into the messages table to see what's actually stored
      </p>
      
      <Button 
        onClick={runDebug} 
        disabled={checking}
        variant="outline"
        className="w-full mb-4"
      >
        {checking ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Database...
          </>
        ) : (
          <>
            <Bug className="w-4 h-4 mr-2" />
            Run Database Debug
          </>
        )}
      </Button>
      
      {results && !results.error && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-600">{results.totalMessages}</div>
              <div className="text-xs text-muted-foreground">Total Messages</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-600">{results.unreadMessages}</div>
              <div className="text-xs text-muted-foreground">Unread</div>
            </div>
            <div className="p-3 bg-white dark:bg-gray-900 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-600">{results.unnotifiedMessages}</div>
              <div className="text-xs text-muted-foreground">Need Email</div>
            </div>
          </div>
          
          {/* Data Quality Issues */}
          {(results.missingData.noSenderId > 0 || results.missingData.noSenderType > 0) && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                ⚠️ Data Quality Issues Found:
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {results.missingData.noSenderId > 0 && (
                  <li>• {results.missingData.noSenderId} messages missing sender_id</li>
                )}
                {results.missingData.noSenderType > 0 && (
                  <li>• {results.missingData.noSenderType} messages missing sender_type</li>
                )}
              </ul>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                This means messages were created BEFORE the columns were added. They won't trigger email notifications.
              </p>
            </div>
          )}
          
          {/* Sample Messages */}
          {results.sampleMessages.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg border overflow-hidden">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-b">
                <p className="text-sm font-medium">Sample Messages (Last 5)</p>
              </div>
              <div className="divide-y dark:divide-gray-800">
                {results.sampleMessages.map((msg: any, idx: number) => (
                  <div key={idx} className="p-3 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-gray-500">ID: {msg.id}</span>
                      <span className="text-gray-400">{msg.created_at}</span>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300 mb-2">{msg.message}</div>
                    <div className="flex gap-3 text-xs">
                      <span className={msg.read_at === 'UNREAD' ? 'text-orange-600' : 'text-green-600'}>
                        {msg.read_at}
                      </span>
                      <span className={msg.email_notified_at === 'NOT NOTIFIED' ? 'text-red-600' : 'text-blue-600'}>
                        Email: {msg.email_notified_at}
                      </span>
                      <span className={msg.sender_id === 'MISSING' ? 'text-red-600' : 'text-green-600'}>
                        Sender: {msg.sender_id}
                      </span>
                      <span className={msg.sender_type === 'MISSING' ? 'text-red-600' : 'text-purple-600'}>
                        Type: {msg.sender_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {results.totalMessages === 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>No messages found in database!</strong>
                <br />
                <span className="text-xs">
                  Try sending a message from the frontend. Messages should appear in the "Messages" feature.
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      
      {results?.error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium">Error:</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-mono">{results.error}</p>
        </div>
      )}
    </Card>
  );
}
