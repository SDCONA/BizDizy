import { AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { createClient } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

interface TroubleshootingModalProps {
  open: boolean;
  onClose: () => void;
}

export function TroubleshootingModal({ open, onClose }: TroubleshootingModalProps) {
  async function clearAllData() {
    try {
      const supabase = createClient();
      
      // Sign out
      await supabase.auth.signOut();
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      toast.success('All data cleared! Reloading...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error('Failed to clear data');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-600" />
            Troubleshooting Guide
          </DialogTitle>
          <DialogDescription>
            Having issues? Try these solutions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Session Issues */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Session or Login Issues
            </h3>
            <p className="text-sm text-gray-600">
              If you're seeing "JWT" or "token" errors, your session is invalid.
            </p>
            <Button onClick={clearAllData} variant="outline" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All Session Data & Reload
            </Button>
          </div>

          {/* Categories Not Loading */}
          <div className="space-y-3">
            <h3 className="font-medium">Categories Not Loading?</h3>
            <p className="text-sm text-gray-600">
              If categories aren't showing:
            </p>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 ml-2">
              <li>Open Supabase Dashboard</li>
              <li>Go to SQL Editor</li>
              <li>Run the <code className="bg-gray-100 px-1 rounded">/COMPLETE_FRESH_SETUP.sql</code> file</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          {/* Database Setup */}
          <div className="space-y-3">
            <h3 className="font-medium">Fresh Database Setup</h3>
            <p className="text-sm text-gray-600">
              To set up the database from scratch:
            </p>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 ml-2">
              <li>Copy all SQL from <code className="bg-gray-100 px-1 rounded">/COMPLETE_FRESH_SETUP.sql</code></li>
              <li>Go to Supabase → SQL Editor</li>
              <li>Paste and run the SQL</li>
              <li>Clear your session (button above)</li>
              <li>Create a new account</li>
            </ol>
          </div>

          {/* Other Issues */}
          <div className="space-y-3">
            <h3 className="font-medium">Still Having Issues?</h3>
            <p className="text-sm text-gray-600">
              Check the browser console (press F12) for detailed error messages.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
