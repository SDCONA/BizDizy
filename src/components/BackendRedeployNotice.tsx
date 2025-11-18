import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function BackendRedeployNotice() {
  const [checking, setChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  const handleRefresh = () => {
    window.location.reload();
  };
  
  const checkHealth = async () => {
    setChecking(true);
    try {
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/health`;
      
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(5000),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setHealthStatus(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
      setHealthStatus({ error: errorMessage });
    } finally {
      setChecking(false);
    }
  };
  
  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <Alert className="border-amber-500/50 bg-slate-900 max-w-4xl mx-auto">
      <AlertCircle className="h-5 w-5 text-amber-400" />
      <AlertTitle className="text-amber-100 ml-2">Backend Connection Issue</AlertTitle>
      <AlertDescription className="text-slate-200 ml-7 mt-2">
        <div className="space-y-3">
          <p>
            The Edge Function is not responding. This could mean it's being redeployed or there's a configuration issue.
          </p>
          
          {/* Diagnostic Info */}
          <div className="bg-slate-800 rounded-lg p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
              ) : healthStatus?.status === 'ok' ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <XCircle className="h-4 w-4 text-red-400" />
              )}
              <span className="text-slate-100">
                {checking ? 'Checking backend...' : healthStatus?.status === 'ok' ? 'Backend is online!' : 'Backend is offline'}
              </span>
            </div>
            
            {healthStatus?.status === 'ok' && (
              <div className="ml-6 space-y-1 text-xs text-slate-300">
                <div>✅ Edge Function: Running</div>
                <div>✅ Timestamp: {healthStatus.timestamp}</div>
                {healthStatus.env && (
                  <>
                    <div className={healthStatus.env.hasSupabaseUrl ? '✅' : '❌'}>
                      {healthStatus.env.hasSupabaseUrl ? '✅' : '❌'} SUPABASE_URL: {healthStatus.env.hasSupabaseUrl ? 'Set' : 'Missing'}
                    </div>
                    <div className={healthStatus.env.hasServiceRoleKey ? '✅' : '❌'}>
                      {healthStatus.env.hasServiceRoleKey ? '✅' : '❌'} SERVICE_ROLE_KEY: {healthStatus.env.hasServiceRoleKey ? 'Set' : 'Missing'}
                    </div>
                  </>
                )}
              </div>
            )}
            
            {healthStatus?.error && (
              <div className="ml-6 text-xs text-red-400">
                Error: {healthStatus.error}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={checkHealth}
              disabled={checking}
              variant="outline"
              size="sm"
              className="border-blue-500 bg-blue-500/20 hover:bg-blue-500/30 text-blue-100"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Check Again
            </Button>
            
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-amber-500 bg-amber-500/20 hover:bg-amber-500/30 text-amber-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload App
            </Button>
            
            {healthStatus?.status === 'ok' && (
              <span className="text-sm text-green-400">
                ✅ Backend is online! Reload the app to continue.
              </span>
            )}
          </div>
          
          <details className="text-sm text-slate-300">
            <summary className="cursor-pointer hover:text-slate-100">What should I do?</summary>
            <div className="mt-2 space-y-2 ml-4">
              <p><strong>If "Backend is online":</strong> Click "Reload App" to continue.</p>
              <p><strong>If "Backend is offline":</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Wait 60 seconds for auto-deployment</li>
                <li>Click "Check Again" to verify status</li>
                <li>Check Supabase Dashboard → Edge Functions for deployment status</li>
                <li>Check Edge Function logs for error messages</li>
              </ul>
            </div>
          </details>
        </div>
      </AlertDescription>
    </Alert>
  );
}