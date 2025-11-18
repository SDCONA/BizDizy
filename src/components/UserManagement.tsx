import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Shield, 
  ShieldOff, 
  Trash2, 
  Search,
  Building2,
  Calendar,
  Mail,
  ChevronLeft,
  ChevronRight,
  Grid3x3,
  List
} from 'lucide-react';
import {
  getAllUsers,
  promoteUserToAdmin,
  demoteUserFromAdmin,
  deleteUserAsAdmin,
  type AdminUser,
} from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
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

export function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [actionType, setActionType] = useState<'promote' | 'demote' | 'delete' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const USERS_PER_PAGE = 20;

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.username.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query)
        )
      );
      setCurrentPage(1); // Reset to first page when searching
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
      setError('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      
      if (errorMessage.includes('Admin privileges required') || errorMessage.includes('not allowed')) {
        setError('Admin access required. Please contact an administrator to grant you admin privileges.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAction() {
    if (!actionUser || !actionType) return;

    try {
      setProcessing(true);

      if (actionType === 'promote') {
        await promoteUserToAdmin(actionUser.id);
        toast.success(`${actionUser.username} promoted to admin`);
      } else if (actionType === 'demote') {
        await demoteUserFromAdmin(actionUser.id);
        toast.success(`${actionUser.username} demoted from admin`);
      } else if (actionType === 'delete') {
        await deleteUserAsAdmin(actionUser.id);
        toast.success(`User ${actionUser.username} deleted`);
      }

      setActionUser(null);
      setActionType(null);
      await loadUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <p className="font-semibold">{error}</p>
            {error.includes('Admin') && (
              <div className="mt-3 text-sm space-y-1">
                <p>To fix this issue:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Open Supabase SQL Editor</li>
                  <li>Run the commands in <code className="bg-red-900/20 px-1 rounded">ADMIN_SETUP.sql</code></li>
                  <li>Make yourself an admin using your user ID</li>
                  <li>Log out and log back in</li>
                </ol>
                <p className="mt-2">See <code className="bg-red-900/20 px-1 rounded">ADMIN_SETUP_INSTRUCTIONS.md</code> for detailed steps.</p>
              </div>
            )}
          </AlertDescription>
        </Alert>
        <Button onClick={loadUsers} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const currentUsers = filteredUsers.slice(
    (currentPage - 1) * USERS_PER_PAGE,
    currentPage * USERS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl">User Management</h2>
            <p className="text-gray-500">{users.length} total users</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="h-8 px-3"
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="h-8 px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Users Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {currentUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {user.username}
                        {user.role === 'admin' && (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <Building2 className="w-4 h-4" />
                        <span className="text-sm">Businesses</span>
                      </div>
                      <p className="text-2xl">{user.businessCount}</p>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Joined</span>
                      </div>
                      <p className="text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Last Sign In */}
                  {user.lastSignIn && (
                    <p className="text-xs text-gray-500">
                      Last sign in: {new Date(user.lastSignIn).toLocaleString()}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    {user.role !== 'admin' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActionUser(user);
                          setActionType('promote');
                        }}
                        className="flex-1"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Make Admin
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setActionUser(user);
                          setActionType('demote');
                        }}
                        className="flex-1"
                      >
                        <ShieldOff className="w-4 h-4 mr-2" />
                        Remove Admin
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setActionUser(user);
                        setActionType('delete');
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Users List View */}
      {viewMode === 'list' && (
        <Card className="shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Businesses</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Joined</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Last Sign In</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.username}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? (
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">User</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{user.businessCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.lastSignIn 
                        ? new Date(user.lastSignIn).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {user.role !== 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionUser(user);
                              setActionType('promote');
                            }}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Make Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setActionUser(user);
                              setActionType('demote');
                            }}
                          >
                            <ShieldOff className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setActionUser(user);
                            setActionType('delete');
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-8 p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
          <div className="text-sm text-gray-600">
            Showing {(currentPage - 1) * USERS_PER_PAGE + 1} - {Math.min(currentPage * USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="h-9 px-3"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page ? 'h-9 px-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' : 'h-9 px-3'}
                    >
                      {page}
                    </Button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="px-1 text-gray-400">...</span>;
                }
                return null;
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-9 px-3"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'promote' && 'Promote to Admin'}
              {actionType === 'demote' && 'Remove Admin Role'}
              {actionType === 'delete' && 'Delete User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'promote' &&
                `Are you sure you want to promote ${actionUser?.username} to admin? They will have full access to the admin panel.`}
              {actionType === 'demote' &&
                `Are you sure you want to remove admin role from ${actionUser?.username}? They will lose access to the admin panel.`}
              {actionType === 'delete' &&
                `Are you sure you want to delete ${actionUser?.username}? This will permanently delete their account and all associated businesses. This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={processing}
              className={
                actionType === 'delete'
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
              }
            >
              {processing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}