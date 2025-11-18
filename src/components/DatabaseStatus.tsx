import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { toast } from 'sonner@2.0.3';


interface DatabaseStatus {
  authUsers: number;
  userProfiles: number;
  orphanedProfiles: number;
  missingProfiles: number;
  foreignKeyExists: boolean;
  healthy: boolean;
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/database-status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      toast.error('Failed to check database status');
    } finally {
      setLoading(false);
    }
  };

  const fixDatabase = async () => {
    setFixing(true);
    try {
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/fix-database`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const result = await response.json();
      
      if (result.success) {
        toast.success('Database fixed!', {
          description: `Created ${result.results.missingProfilesCreated} profiles, removed ${result.results.orphanedProfilesRemoved} orphaned records`,
        });
        // Refresh status
        await checkStatus();
      } else {
        toast.error('Fix completed with warnings', {
          description: result.results.errors.join(', '),
        });
      }
    } catch (error) {
      toast.error('Failed to fix database');
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card className="p-6" data-database-status>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h3 className="text-lg">Database Status</h3>
        </div>
        <Button
          onClick={checkStatus}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Check Status
        </Button>
      </div>

      {status && (
        <div className="space-y-4">
          {/* Health Badge */}
          <div className="flex items-center gap-2">
            {status.healthy ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <Badge variant="default" className="bg-green-500">Healthy</Badge>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-yellow-500" />
                <Badge variant="destructive">Needs Attention</Badge>
              </>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Auth Users</div>
              <div className="text-2xl">{status.authUsers}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">User Profiles</div>
              <div className="text-2xl">{status.userProfiles}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Orphaned Profiles</div>
              <div className={`text-2xl ${status.orphanedProfiles > 0 ? 'text-yellow-500' : ''}`}>
                {status.orphanedProfiles}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Missing Profiles</div>
              <div className={`text-2xl ${status.missingProfiles > 0 ? 'text-yellow-500' : ''}`}>
                {status.missingProfiles}
              </div>
            </div>
          </div>

          {/* Foreign Key Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm">Foreign Key (reviews → users)</span>
            {status.foreignKeyExists ? (
              <Badge variant="default" className="bg-green-500">✓ Exists</Badge>
            ) : (
              <Badge variant="destructive">✗ Missing</Badge>
            )}
          </div>

          {/* Fix Button */}
          {!status.healthy && (
            <>
              {(status.orphanedProfiles > 0 || status.missingProfiles > 0) && (
                <Button
                  onClick={fixDatabase}
                  disabled={fixing}
                  className="w-full"
                >
                  {fixing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    'Fix User Profiles'
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {!status && !loading && (
        <div className="text-center text-muted-foreground py-8">
          Click "Check Status" to view database health
        </div>
      )}
    </Card>
  );
}
