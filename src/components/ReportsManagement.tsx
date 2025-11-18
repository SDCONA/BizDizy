import { useState, useEffect } from 'react';
import { Eye, CheckCircle, XCircle, Trash2, Loader2, Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Report } from '../types/business';
import { getReports, updateReportStatus, deleteReport, getBusinessById, getReviewById, deleteReviewAsAdmin } from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { BusinessProfile } from './BusinessProfile';
import { AuthUser } from '../types/user';

interface ReportsManagementProps {
  currentUser?: AuthUser;
}

export function ReportsManagement({ currentUser }: ReportsManagementProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewingReport, setViewingReport] = useState<Report | null>(null);
  const [viewingBusiness, setViewingBusiness] = useState<any>(null);
  const [viewingReview, setViewingReview] = useState<any>(null);
  const [deletingReview, setDeletingReview] = useState<any>(null);
  const [resolvingReport, setResolvingReport] = useState<Report | null>(null);
  const [dismissingReport, setDismissingReport] = useState<Report | null>(null);
  const [deletingReport, setDeletingReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reports, searchQuery, statusFilter, typeFilter]);

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const data = await getReports();
      setReports(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  function applyFilters() {
    let filtered = [...reports];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(r => r.report_type === typeFilter);
    }

    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          r.reason.toLowerCase().includes(query) ||
          r.description?.toLowerCase().includes(query) ||
          r.target_id.toLowerCase().includes(query)
      );
    }

    setFilteredReports(filtered);
  }

  async function handleResolve() {
    if (!resolvingReport) return;

    setIsProcessing(true);
    try {
      await updateReportStatus(resolvingReport.id, 'resolved', adminNotes);
      setReports(reports.map(r => 
        r.id === resolvingReport.id 
          ? { ...r, status: 'resolved', admin_notes: adminNotes, resolved_at: new Date().toISOString() }
          : r
      ));
      setResolvingReport(null);
      setAdminNotes('');
      toast.success('Report marked as resolved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resolve report';
      console.error('Error resolving report:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deletingReport) return;

    setIsProcessing(true);
    try {
      await deleteReport(deletingReport.id);
      setReports(reports.filter(r => r.id !== deletingReport.id));
      setDeletingReport(null);
      toast.success('Report deleted');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete report';
      console.error('Error deleting report:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteReview() {
    if (!deletingReview) return;

    setIsProcessing(true);
    try {
      await deleteReviewAsAdmin(deletingReview.id);
      
      // Update the report status to 'deleted' instead of removing it
      setReports(reports.map(r => 
        r.target_id === deletingReview.id && r.report_type === 'review'
          ? { ...r, status: 'deleted', resolved_at: new Date().toISOString() }
          : r
      ));
      
      setDeletingReview(null);
      toast.success('Review deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete review';
      console.error('Error deleting review:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleViewTarget(report: Report) {
    if (report.report_type === 'business') {
      try {
        const business = await getBusinessById(report.target_id);
        if (business) {
          setViewingBusiness(business);
        } else {
          toast.error('Business not found');
        }
      } catch (error) {
        toast.error('Failed to load business');
      }
    } else if (report.report_type === 'review') {
      try {
        const review = await getReviewById(report.target_id);
        if (review) {
          setViewingReview(review);
        } else {
          toast.error('Review not found');
        }
      } catch (error) {
        toast.error('Failed to load review');
      }
    } else {
      toast.info('Review viewing coming soon...');
    }
  }

  function getStatusBadge(status: string) {
    const variants: { [key: string]: any } = {
      pending: { className: 'bg-yellow-500', text: 'Pending' },
      reviewed: { className: 'bg-blue-500', text: 'Reviewed' },
      resolved: { className: 'bg-green-500', text: 'Resolved' },
      dismissed: { className: 'bg-gray-500', text: 'Dismissed' },
      deleted: { className: 'bg-red-500', text: 'Deleted' },
    };

    const variant = variants[status] || variants.pending;
    return <Badge className={variant.className}>{variant.text}</Badge>;
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl">Reports Management</h2>
        <div className="flex items-center gap-3">
          <Badge variant="outline">{filteredReports.length} reports</Badge>
          {reports.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">
              No reports submitted yet. Reports will appear here when users flag content.
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="deleted">Deleted</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="review">Review</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports Table */}
      <div className="overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {report.report_type === 'business' ? 'Business' : 'Review'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{report.reason}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {report.description || 'No description'}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(report.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingReport(report)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewTarget(report)}
                        title="View Target"
                      >
                        <Eye className="w-4 h-4 text-blue-500" />
                      </Button>
                      {report.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResolvingReport(report)}
                            title="Resolve"
                          >
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletingReport(report)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Report Details Dialog */}
      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-medium">
                    {viewingReport.report_type === 'business' ? 'Business' : 'Review'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewingReport.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="font-medium">{viewingReport.reason}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reported</p>
                  <p className="text-sm">{formatDate(viewingReport.created_at)}</p>
                </div>
              </div>

              {viewingReport.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{viewingReport.description}</p>
                </div>
              )}

              {viewingReport.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                  <p className="text-sm bg-blue-50 p-3 rounded-lg">{viewingReport.admin_notes}</p>
                </div>
              )}

              {viewingReport.resolved_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Resolved At</p>
                  <p className="text-sm">{formatDate(viewingReport.resolved_at)}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => handleViewTarget(viewingReport)}
                  className="flex-1"
                >
                  View {viewingReport.report_type === 'business' ? 'Business' : 'Review'}
                </Button>
                {viewingReport.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        setResolvingReport(viewingReport);
                        setViewingReport(null);
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Resolve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Report Dialog */}
      <Dialog open={!!resolvingReport} onOpenChange={(open) => !open && setResolvingReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Add notes about the resolution (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Admin notes..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResolvingReport(null);
                setAdminNotes('');
              }}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Resolving...' : 'Resolve Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Report Dialog */}
      <AlertDialog
        open={!!deletingReport}
        onOpenChange={(open) => !open && setDeletingReport(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this report? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Deleting...' : 'Delete Report'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Review Dialog */}
      <AlertDialog
        open={!!deletingReview}
        onOpenChange={(open) => !open && setDeletingReview(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this review? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReview}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Deleting...' : 'Delete Review'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Business Dialog */}
      <Dialog open={!!viewingBusiness} onOpenChange={(open) => !open && setViewingBusiness(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reported Business</DialogTitle>
          </DialogHeader>
          {viewingBusiness && currentUser && (
            <BusinessProfile
              business={viewingBusiness}
              currentUser={currentUser}
              onBack={() => setViewingBusiness(null)}
              onLoginRequired={() => {}}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Review Dialog */}
      <Dialog open={!!viewingReview} onOpenChange={(open) => !open && setViewingReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reported Review</DialogTitle>
            <DialogDescription>
              Review details and business information
            </DialogDescription>
          </DialogHeader>
          {viewingReview && (
            <div className="space-y-6">
              {/* Review Details */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50/30 p-6 rounded-xl border-2 border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Rating</p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-5 h-5 ${
                            star <= viewingReview.rating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300'
                          }`}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                      <span className="ml-2 font-semibold text-lg">{viewingReview.rating}/5</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Posted</p>
                    <p className="text-sm">{formatDate(viewingReview.created_at)}</p>
                  </div>
                </div>

                {viewingReview.comment && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Comment</p>
                    <p className="text-gray-700 bg-white/70 p-4 rounded-lg border border-gray-200">
                      {viewingReview.comment}
                    </p>
                  </div>
                )}
              </div>

              {/* Business Info */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Business ID</p>
                <p className="text-sm font-mono bg-gray-100 px-3 py-2 rounded">
                  {viewingReview.business_id}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={async () => {
                    try {
                      const business = await getBusinessById(viewingReview.business_id);
                      if (business) {
                        setViewingBusiness(business);
                        setViewingReview(null);
                      } else {
                        toast.error('Business not found');
                      }
                    } catch (error) {
                      toast.error('Failed to load business');
                    }
                  }}
                >
                  View Business Profile
                </Button>
              </div>

              {/* Review Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <Badge variant={viewingReview.is_active ? 'default' : 'secondary'}>
                    {viewingReview.is_active ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flagged</p>
                  <Badge variant={viewingReview.flagged ? 'destructive' : 'secondary'}>
                    {viewingReview.flagged ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    setDeletingReview(viewingReview);
                    setViewingReview(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Review
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}