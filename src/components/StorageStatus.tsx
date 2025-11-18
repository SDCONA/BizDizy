import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StorageStatusData {
  success: boolean;
  bucketExists: boolean;
  bucketName?: string;
  totalBuckets?: number;
  allBuckets?: string[];
  error?: string;
}

export function StorageStatus() {
  const [status, setStatus] = useState<StorageStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  async function checkStatus() {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/storage/status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      const data = await response.json();
      setStatus(data);
    } catch (error) {
      setStatus({
        success: false,
        bucketExists: false,
        error: String(error)
      });
    } finally {
      setLoading(false);
    }
  }

  async function initializeBucket() {
    try {
      setInitializing(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/init-storage`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      // Recheck status after initialization
      await checkStatus();
    } catch (error) {
      // Silently handle bucket initialization errors
    } finally {
      setInitializing(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  if (loading) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="ml-2 text-blue-800">
          Checking storage status...
        </AlertDescription>
      </Alert>
    );
  }

  if (!status) {
    return null;
  }

  if (status.bucketExists) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="ml-2 text-green-800">
          Storage is configured and ready for uploads
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="ml-2">
        <div className="flex items-center justify-between">
          <div className="text-orange-800">
            <p className="font-medium">Storage bucket not found</p>
            <p className="text-sm mt-1">
              Click initialize to set up image storage
            </p>
          </div>
          <div className="flex gap-2 ml-4">
            <Button
              onClick={initializeBucket}
              disabled={initializing}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700"
            >
              {initializing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Initialize Storage
                </>
              )}
            </Button>
            <Button
              onClick={checkStatus}
              disabled={loading}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
