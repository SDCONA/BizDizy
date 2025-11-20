import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  MessageSquare, 
  AlertCircle, 
  ArrowLeft,
  Loader2,
  Search,
  Eye,
  Edit2,
  XCircle,
  CheckCircle,
  Trash2,
  Archive,
  FileText
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
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
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import {
  getAdminAnalytics,
  getAllBusinesses,
  updateBusiness,
  deleteBusiness,
  type Business,
  type AuthUser,
} from '../utils/api';
import { AdminRecycleBin } from './AdminRecycleBin';
import { UserManagement } from './UserManagement';
import { ContactMessages } from './ContactMessages';
import { ReportsManagement } from './ReportsManagement';
import { BusinessProfile } from './BusinessProfile';
import { AdminBusinessEditor } from './AdminBusinessEditor';
import { BackendStatus } from './BackendStatus';
import { DatabaseStatus } from './DatabaseStatus';
import { StorageStatus } from './StorageStatus';
import { BackendRedeployNotice } from './BackendRedeployNotice';
import { TermsAndPolicyManagement } from './TermsAndPolicyManagement';
import { AdminCronMonitor } from './AdminCronMonitor';
import { MessageNotificationDiagnostic } from './MessageNotificationDiagnostic';
import { DatabaseMigrationTrigger } from './DatabaseMigrationTrigger';
import { MessageDatabaseDebugger } from './MessageDatabaseDebugger';

interface AdminDashboardProps {
  currentUser: AuthUser;
  onBack: () => void;
}

export function AdminDashboard({ currentUser, onBack }: AdminDashboardProps) {
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filteredBusinesses, setFilteredBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingBusinessId, setUpdatingBusinessId] = useState<string | null>(null);
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBusinesses(businesses);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredBusinesses(
        businesses.filter(
          (b) =>
            b.name.toLowerCase().includes(query) ||
            b.city?.toLowerCase().includes(query) ||
            b.email?.toLowerCase().includes(query) ||
            b.phone?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, businesses]);

  async function loadData() {
    try {
      const [analyticsData, businessesData] = await Promise.all([
        getAdminAnalytics(),
        getAllBusinesses(),
      ]);
      setAnalytics(analyticsData);
      setBusinesses(businessesData);
      setFilteredBusinesses(businessesData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load admin data';
      
      if (errorMessage.includes('Admin privileges required') || errorMessage.includes('not allowed')) {
        toast.error('Admin access required. Please see ADMIN_SETUP_INSTRUCTIONS.md');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleToggleActive(businessId: string, currentStatus: boolean) {
    try {
      setUpdatingBusinessId(businessId);
      await updateBusiness(businessId, { is_active: !currentStatus });
      setBusinesses(
        businesses.map((b) =>
          b.id === businessId ? { ...b, is_active: !currentStatus } : b
        )
      );
      toast.success(`Business ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update business';
      console.error('Error toggling active status:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function handleToggleVerified(businessId: string, currentStatus: boolean) {
    try {
      setUpdatingBusinessId(businessId);
      await updateBusiness(businessId, { verified: !currentStatus });
      setBusinesses(
        businesses.map((b) =>
          b.id === businessId ? { ...b, verified: !currentStatus } : b
        )
      );
      toast.success(`Business ${!currentStatus ? 'verified' : 'unverified'} successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update business';
      console.error('Error toggling verified status:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function handleDeleteBusiness() {
    if (!businessToDelete) return;

    setIsDeleting(true);
    try {
      await deleteBusiness(businessToDelete.id);
      setBusinesses(businesses.filter((b) => b.id !== businessToDelete.id));
      setBusinessToDelete(null);
      toast.success('Business moved to Recycle Bin');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete business';
      console.error('Error deleting business:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  }

  function handleViewBusiness(business: Business) {
    setViewingBusiness(business);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <h1 className="text-4xl mb-8">Admin Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span className="text-3xl">{analytics?.totalBusinesses || 0}</span>
            </div>
            <h3 className="text-gray-600">Total Businesses</h3>
            <p className="text-sm text-gray-500 mt-1">
              {analytics?.activeBusinesses || 0} active
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-green-600" />
              <span className="text-3xl">{analytics?.verifiedBusinesses || 0}</span>
            </div>
            <h3 className="text-gray-600">Verified</h3>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <MessageSquare className="w-8 h-8 text-purple-600" />
              <span className="text-3xl">{analytics?.totalReviews || 0}</span>
            </div>
            <h3 className="text-gray-600">Total Reviews</h3>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <span className="text-3xl">{analytics?.pendingReports || 0}</span>
            </div>
            <h3 className="text-gray-600">Pending Reports</h3>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="businesses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 max-w-6xl">
            <TabsTrigger value="businesses">Businesses</TabsTrigger>
            <TabsTrigger value="recycle">
              <Archive className="w-4 h-4 mr-1" />
              Recycle Bin
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="policies">
              <FileText className="w-4 h-4 mr-1" />
              Policies
            </TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Business Management Tab */}
          <TabsContent value="businesses">
            <Card className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl">Business Management</h2>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search businesses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-80"
                    />
                  </div>
                  <Badge variant="outline">
                    {filteredBusinesses.length} businesses
                  </Badge>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBusinesses.map((business) => (
                      <TableRow key={business.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{business.name}</div>
                            {business.verified && (
                              <Badge variant="outline" className="mt-1">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{business.category?.name || 'N/A'}</TableCell>
                        <TableCell>{business.city || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {business.email && <div>{business.email}</div>}
                            {business.phone && <div>{business.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {business.is_active ? (
                            <Badge className="bg-green-500">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span>{business.rating.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewBusiness(business)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingBusinessId(business.id)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleToggleActive(business.id, business.is_active)
                              }
                              disabled={updatingBusinessId === business.id}
                            >
                              {business.is_active ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setBusinessToDelete(business)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* Recycle Bin Tab */}
          <TabsContent value="recycle">
            <Card className="p-8">
              <AdminRecycleBin onBusinessRestored={loadData} />
            </Card>
          </TabsContent>

          {/* User Management Tab */}
          <TabsContent value="users">
            <Card className="p-8">
              <UserManagement />
            </Card>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="p-8">
              <ContactMessages />
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <Card className="p-8">
              <ReportsManagement currentUser={currentUser} />
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies">
            <Card className="p-8">
              <TermsAndPolicyManagement />
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <BackendRedeployNotice />
              
              {/* Database Debugger - NEW */}
              <MessageDatabaseDebugger />
              
              {/* Database Migration Trigger */}
              <DatabaseMigrationTrigger />
              
              {/* Diagnostic Tool */}
              <MessageNotificationDiagnostic />
              
              {/* Cron Job Monitor */}
              <AdminCronMonitor />
              
              <Card className="p-8">
                <h2 className="text-2xl mb-6">System Status</h2>
                <div className="space-y-8">
                  <BackendStatus />
                  <DatabaseStatus />
                  <StorageStatus />
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!businessToDelete}
        onOpenChange={(open) => !open && setBusinessToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move Business to Recycle Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{businessToDelete?.name}</strong>?
              It can be restored within 90 days from the Recycle Bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBusiness}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Move to Recycle Bin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Business Profile View Dialog */}
      <Dialog open={!!viewingBusiness} onOpenChange={(open) => !open && setViewingBusiness(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Business Details</DialogTitle>
          </DialogHeader>
          {viewingBusiness && (
            <BusinessProfile
              business={viewingBusiness}
              currentUser={currentUser}
              onBack={() => setViewingBusiness(null)}
              onEdit={() => {
                setEditingBusinessId(viewingBusiness.id);
                setViewingBusiness(null);
              }}
              onLoginRequired={() => {}}
              isAdminView={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Business Editor Dialog */}
      <Dialog open={!!editingBusinessId} onOpenChange={(open) => !open && setEditingBusinessId(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>
              Make changes to business information, photos, and reviews
            </DialogDescription>
          </DialogHeader>
          {editingBusinessId && (
            <AdminBusinessEditor
              businessId={editingBusinessId}
              onClose={() => {
                setEditingBusinessId(null);
                loadData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}