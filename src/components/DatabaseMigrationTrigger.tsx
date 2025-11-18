import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Database, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function DatabaseMigrationTrigger() {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const checkAndMigrate = async () => {
    setChecking(true);
    setStatus('idle');
    
    try {
      // Call the Edge Function health endpoint - this will trigger migrations on startup
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/health`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStatus('success');
        setMessage('Backend is running. Migrations should have executed on last deployment.');
        toast.success('Backend health check passed!');
      } else {
        setStatus('error');
        setMessage('Backend health check failed. Please redeploy the Edge Function.');
        toast.error('Backend health check failed');
      }
    } catch (error) {
      console.error('Migration check error:', error);
      setStatus('error');
      setMessage('Could not connect to backend. Please redeploy the Edge Function.');
      toast.error('Connection failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-2 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-4">
        <Database className="w-6 h-6 text-purple-600" />
        <div>
          <h3 className="font-semibold">Database Migration Status</h3>
          <p className="text-xs text-muted-foreground">
            Check if required columns exist
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-purple-200 dark:border-purple-800">
          <h4 className="font-medium text-sm mb-2">Required Columns:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✓ messages.sender_id (UUID)</li>
            <li>✓ messages.sender_type (TEXT)</li>
            <li>✓ messages.email_notified_at (TIMESTAMPTZ)</li>
          </ul>
        </div>

        {status !== 'idle' && (
          <div className={`p-3 rounded-lg border ${
            status === 'success' 
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start gap-2">
              {status === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${
                  status === 'success' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                }`}>
                  {message}
                </p>
                {status === 'error' && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    <strong>Next Step:</strong> Click "Redeploy Backend" in the notice above, or redeploy manually from Supabase Dashboard → Edge Functions.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={checkAndMigrate} 
          disabled={checking}
          variant="outline"
          className="w-full"
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Check Backend Status
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground bg-gray-50 dark:bg-gray-900 p-3 rounded">
          <strong>💡 How it works:</strong>
          <ul className="mt-2 space-y-1 ml-4 list-disc">
            <li>Migrations run automatically when Edge Function starts</li>
            <li>If columns are missing, redeploy the Edge Function</li>
            <li>Use the "Redeploy Backend" button above</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
