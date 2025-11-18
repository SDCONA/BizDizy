import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { projectId } from '../utils/supabase/info';

export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'slow'>('checking');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  useEffect(() => {
    checkBackendHealth();
  }, []);

  async function checkBackendHealth() {
    const start = performance.now();
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/health`,
        {
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );
      
      const time = performance.now() - start;
      setResponseTime(Math.round(time));
      
      if (response.ok) {
        if (time > 5000) {
          setStatus('slow');
        } else {
          setStatus('online');
        }
      } else {
        setStatus('offline');
      }
    } catch (error) {
      setStatus('offline');
    }
  }

  if (status === 'checking') {
    return (
      <Alert className="border-blue-500/30 bg-blue-500/5">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <AlertDescription className="ml-2 text-blue-300">
          Checking backend status...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'offline') {
    return (
      <Alert className="border-red-500/30 bg-red-500/5">
        <AlertCircle className="h-4 w-4 text-red-500" />
        <AlertDescription className="ml-2 text-red-300">
          Backend is offline or experiencing issues. Some features may not work.
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'slow') {
    return (
      <Alert className="border-yellow-500/30 bg-yellow-500/5">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="ml-2 text-yellow-300">
          Backend is warming up (responded in {responseTime}ms). This is normal after inactivity.
        </AlertDescription>
      </Alert>
    );
  }

  // Don't show anything if backend is fast and online
  if (responseTime && responseTime < 1000) {
    return null;
  }

  return (
    <Alert className="border-green-500/30 bg-green-500/5">
      <CheckCircle className="h-4 w-4 text-green-500" />
      <AlertDescription className="ml-2 text-green-300">
        Backend is online ({responseTime}ms)
      </AlertDescription>
    </Alert>
  );
}
