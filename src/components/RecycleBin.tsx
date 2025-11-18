import { useState, useEffect } from 'react';
import { Business } from '../types/business';
import { getDeletedBusinessesByOwner, restoreBusiness, permanentlyDeleteBusiness } from '../utils/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { RefreshCw, Trash2, AlertTriangle, Archive, Calendar } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

interface RecycleBinProps {
  userId: string;
  onBusinessRestored?: () => void;
}

export function RecycleBin({ userId, onBusinessRestored }: RecycleBinProps) {
  const [deletedBusinesses, setDeletedBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedBusinesses();
  }, [userId]);

  const loadDeletedBusinesses = async () => {
    try {
      setLoading(true);
      const businesses = await getDeletedBusinessesByOwner(userId);
      setDeletedBusinesses(businesses);
    } catch (error: any) {
      toast.error('Failed to load deleted businesses');
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (deletedAt: string | null) => {
    if (!deletedAt) return 0;
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const daysSinceDeletion = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, 90 - daysSinceDeletion);
  };

  const canRestore = (deletedAt: string | null) => {
    return getDaysRemaining(deletedAt) > 0;
  };

  const handleRestore = async (business: Business) => {
    try {
      setRestoringId(business.id);
      await restoreBusiness(business.id);
      toast.success(`${business.name} has been restored!`);
      loadDeletedBusinesses();
      onBusinessRestored?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to restore business');
    } finally {
      setRestoringId(null);
    }
  };

  const handlePermanentDelete = async (business: Business) => {
    try {
      setDeletingId(business.id);
      await permanentlyDeleteBusiness(business.id);
      toast.success(`${business.name} has been permanently deleted`);
      loadDeletedBusinesses();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete business');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (daysRemaining: number) => {
    if (daysRemaining === 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysRemaining <= 7) {
      return <Badge variant="destructive">{daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">{daysRemaining} days left</Badge>;
    } else {
      return <Badge variant="secondary">{daysRemaining} days left</Badge>;
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (deletedBusinesses.length === 0) {
    return (
      <EmptyState
        icon={Archive}
        title="Recycle Bin is Empty"
        description="Deleted businesses will appear here and can be restored within 90 days"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl">Recycle Bin</h2>
          <p className="text-muted-foreground mt-1">
            Deleted businesses can be restored within 90 days
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDeletedBusinesses}
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Warning Message */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-amber-900 mb-1">
            <strong>Important:</strong> Businesses are automatically and permanently deleted 90 days after being moved to the recycle bin.
          </p>
          <p className="text-amber-700">
            Once permanently deleted, the business name cannot be used again in the same city.
          </p>
        </div>
      </div>

      {/* Deleted Businesses List */}
      <div className="grid gap-4">
        {deletedBusinesses.map((business) => {
          const daysRemaining = getDaysRemaining(business.deleted_at);
          const isRestorable = canRestore(business.deleted_at);
          const isRestoring = restoringId === business.id;
          const isDeleting = deletingId === business.id;

          return (
            <Card key={business.id} className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Business Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3 flex-wrap">
                    <h3 className="text-xl">{business.name}</h3>
                    {getStatusBadge(daysRemaining)}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    {business.city && (
                      <span>📍 {business.city}</span>
                    )}
                    {business.category?.name && (
                      <span>🏷️ {business.category.name}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Deleted {new Date(business.deleted_at!).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>

                  {!isRestorable && (
                    <p className="text-sm text-red-600">
                      This business was deleted more than 90 days ago and cannot be restored.
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 min-w-[200px]">
                  {/* Restore Button */}
                  <Button
                    onClick={() => handleRestore(business)}
                    disabled={!isRestorable || isRestoring || isDeleting}
                    className="flex-1"
                    variant="default"
                  >
                    {isRestoring ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Restore
                      </>
                    )}
                  </Button>

                  {/* Permanent Delete Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={isRestoring || isDeleting}
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        {isDeleting ? (
                          <>
                            <Trash2 className="w-4 h-4 mr-2 animate-pulse" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently Delete Business?</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>
                            Are you sure you want to permanently delete <strong>{business.name}</strong>?
                          </p>
                          <div className="bg-red-50 border border-red-200 rounded p-3 text-red-900 text-sm">
                            <p className="font-semibold mb-1">⚠️ This action cannot be undone!</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              <li>All business data will be permanently removed</li>
                              <li>Reviews and messages will be deleted</li>
                              <li>You will NOT be able to use this business name in {business.city} again</li>
                            </ul>
                          </div>
                          <p className="text-sm">
                            If you might want to use this business name again in the future, click "Cancel" instead.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handlePermanentDelete(business)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Yes, Delete Forever
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
        <p className="mb-2"><strong>💡 Tips:</strong></p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Restoring a business will make it visible again on BizDizy</li>
          <li>Permanently deleting a business will prevent you from using that name in the same city ever again</li>
          <li>If you want to register a new business with the same name, permanently delete it first</li>
        </ul>
      </div>
    </div>
  );
}
