import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function SessionCleaner() {
  const [isClearing, setIsClearing] = useState(false);

  async function clearSession() {
    setIsClearing(true);
    try {
      const supabase = createClient();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all localStorage
      localStorage.removeItem('bizdizy_current_user');
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      toast.success('Session cleared! Reloading page...');
      
      // Reload the page after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Failed to clear session');
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Card className="p-6 bg-orange-50 border-orange-200">
      <div className="flex items-start gap-4">
        <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg mb-2 text-orange-900">Session Error Detected</h3>
          <p className="text-orange-800 text-sm mb-4">
            Your authentication session appears to be invalid. This can happen if your user account was deleted or if there's a session mismatch.
          </p>
          <Button
            onClick={clearSession}
            disabled={isClearing}
            variant="outline"
            className="border-orange-300 text-orange-700 hover:bg-orange-100"
          >
            {isClearing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear Session & Reload
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}