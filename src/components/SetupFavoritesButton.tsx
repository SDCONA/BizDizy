import { useState } from 'react';
import { Button } from './ui/button';
import { Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';

export function SetupFavoritesButton() {
  const [isRunning, setIsRunning] = useState(false);
  const [isFixingRLS, setIsFixingRLS] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const runMigration = async () => {
    setIsRunning(true);
    setStatus('idle');
    
    try {
      
      toast.loading('Setting up favorites and recent searches tables...');
      
      // Call the fix-database endpoint which will create all tables
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/fix-database`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      

      const result = await response.json();
      
      toast.dismiss();
      
      if (response.ok && result.success) {
        setStatus('success');
        toast.success('✅ Database tables created successfully!');
        
        // Reload the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setStatus('error');
        toast.error('Failed to create tables.');
      }
    } catch (error) {
      setStatus('error');
      toast.dismiss();
      toast.error('Failed to run migration');
    } finally {
      setIsRunning(false);
    }
  };

  const fixRLS = async () => {
    setIsFixingRLS(true);
    
    try {
      
      toast.loading('Enabling Row Level Security...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/fix-rls`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      

      const result = await response.json();
      
      toast.dismiss();
      
      if (response.ok && result.success) {
        toast.success('✅ Row Level Security enabled successfully!');
        
        // Reload the page after 2 seconds
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.error('Failed to enable RLS.');
      }
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to enable RLS');
    } finally {
      setIsFixingRLS(false);
    }
  };

  return null;
}
