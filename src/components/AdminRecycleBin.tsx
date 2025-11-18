import { useState, useEffect } from 'react';
import { Business } from '../types/business';
import { getAllDeletedBusinesses, restoreBusiness, permanentlyDeleteBusiness } from '../utils/api';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { RefreshCw, Trash2, AlertTriangle, Archive, Calendar, Search, User, Building2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LoadingState } from './LoadingState';
import { EmptyState } from './EmptyState';

interface AdminRecycleBinProps {
  onBusinessRestored?: () => void;
}

export function AdminRecycleBin({ onBusinessRestored }: AdminRecycleBinProps) {
  const [deletedBusinesses, setDeletedBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadDeletedBusinesses();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(deletedBusinesses);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = deletedBusinesses.filter(business => 
        business.name.toLowerCase().includes(query) ||
        business.city?.toLowerCase().includes(query) ||
        business.category?.name?.toLowerCase().includes(query) ||
        business.owner?.email?.toLowerCase().includes(query)
      );
      setFilteredBusinesses(filtered);
    }
  }, [searchQuery, deletedBusinesses]);

  const loadDeletedBusinesses = async () => {
    try {
      setLoading(true);
      const businesses = await getAllDeletedBusinesses();
      setDeletedBusinesses(businesses);
      setFilteredBusinesses(businesses);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load deleted businesses');
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
      return <Badge variant="destructive">Expired - Cannot Restore</Badge>;
    } else if (daysRemaining <= 7) {
      return <Badge variant="destructive">{daysRemaining} days left</Badge>;
    } else if (daysRemaining <= 30) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">{daysRemaining} days left</Badge>;
    } else {
      return <Badge variant="secondary">{daysRemaining} days left</Badge>;
    }
  };

  if (loading) {
    return <LoadingState message="Loading deleted businesses..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl">Recycle Bin</h2>
          <p className="text-muted-foreground mt-1">
            All deleted businesses • {deletedBusinesses.length} total
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

      {/* Search */}
      {deletedBusinesses.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by business name, city, category, or owner email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Warning Message */}
      {deletedBusinesses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-900 mb-1">
              <strong>Important:</strong> Deleted businesses can be restored within 90 days.
            </p>
            <p className="text-amber-700">
              After 90 days, businesses are automatically permanently deleted and cannot be recovered.
            </p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredBusinesses.length === 0 && !searchQuery && (
        <EmptyState
          icon={Archive}
          title="Recycle Bin is Empty"
          description="Deleted businesses will appear here and can be restored within 90 days"
        />
      )}

      {/* No Search Results */}
      {filteredBusinesses.length === 0 && searchQuery && (
        <EmptyState
          icon={Search}
          title="No businesses found"
          description={`No deleted businesses match "${searchQuery}"`}
        />
      )}

      {/* Deleted Businesses List */}
      {filteredBusinesses.length > 0 && (
        <div className="grid gap-4">
          {filteredBusinesses.map((business) => {
            const daysRemaining = getDaysRemaining(business.deleted_at);
            const isRestorable = canRestore(business.deleted_at);
            const isRestoring = restoringId === business.id;
            const isDeleting = deletingId === business.id;
            const ownerEmail = (business as any).owner?.email || 'Unknown';

            return (
              <Card key={business.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Business Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <h3 className="text-xl">{business.name}</h3>
                      {getStatusBadge(daysRemaining)}
                      {business.verified && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      {business.city && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{business.city}</span>
                        </div>
                      )}
                      {business.category?.name && (
                        <div className="flex items-center gap-2">
                          <span>🏷️</span>
                          <span>{business.category.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="truncate">{ownerEmail}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Deleted {new Date(business.deleted_at!).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {business.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {business.description}
                      </p>
                    )}

                    {!isRestorable && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-700">
                          ⚠️ This business was deleted more than 90 days ago and cannot be restored. 
                          You can only permanently delete it.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 min-w-[220px]">
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
                              Delete Forever
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Permanently Delete Business?</AlertDialogTitle>
                          <AlertDialogDescription className="space-y-3">
                            <p>
                              Are you sure you want to permanently delete <strong>{business.name}</strong> 
                              owned by <strong>{ownerEmail}</strong>?
                            </p>
                            <div className="bg-red-50 border border-red-200 rounded p-3 text-red-900 text-sm">
                              <p className="font-semibold mb-2">⚠️ This action CANNOT be undone!</p>
                              <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>All business data will be permanently removed from the database</li>
                                <li>All reviews, ratings, and portfolio images will be deleted</li>
                                <li>The business owner will NOT be able to re-register with this name in {business.city}</li>
                                <li>This business will be completely removed from the system</li>
                              </ul>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              If there's any chance this business might need to be restored, click "Cancel" instead.
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
      )}

      {/* Footer Info */}
      {filteredBusinesses.length > 0 && (
        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
          <p className="mb-2"><strong>💡 Admin Tips:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Restore:</strong> Makes the business visible again on BizDizy and accessible to the owner</li>
            <li><strong>Delete Forever:</strong> Permanently removes all business data - use with caution</li>
            <li><strong>Auto-cleanup:</strong> Businesses older than 90 days are automatically purged from the system</li>
            <li><strong>Owner notification:</strong> Consider notifying the business owner before permanently deleting</li>
          </ul>
        </div>
      )}
    </div>
  );
}
