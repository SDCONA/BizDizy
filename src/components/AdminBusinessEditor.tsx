import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Save,
  Trash2,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Building2,
  Image as ImageIcon,
  MessageSquare,
  Shield,
  AlertTriangle
} from 'lucide-react';
import {
  getBusinessById,
  getBusinessReviews,
  updateBusinessAsAdmin,
  deletePhotoAsAdmin,
  deleteReviewAsAdmin,
  type Business,
  type Review
} from '../utils/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
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

interface AdminBusinessEditorProps {
  businessId: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function AdminBusinessEditor({ businessId, onClose, onUpdate }: AdminBusinessEditorProps) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'photo' | 'review'; id: string } | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    zip_code: '',
    service_area: '',
    is_active: true,
    verified: false,
    is_featured: false,
  });

  useEffect(() => {
    loadBusinessData();
  }, [businessId]);

  async function loadBusinessData() {
    try {
      setLoading(true);
      const [businessData, reviewsData] = await Promise.all([
        getBusinessById(businessId),
        getBusinessReviews(businessId)
      ]);

      if (businessData) {
        setBusiness(businessData);
        setFormData({
          name: businessData.name || '',
          description: businessData.description || '',
          phone: businessData.phone || '',
          email: businessData.email || '',
          website: businessData.website || '',
          address: businessData.address || '',
          city: businessData.city || '',
          zip_code: businessData.zip_code || '',
          service_area: businessData.service_area || '',
          is_active: businessData.is_active ?? true,
          verified: businessData.verified ?? false,
          is_featured: businessData.is_featured ?? false,
        });
      }

      setReviews(reviewsData);
    } catch (error) {
      toast.error('Failed to load business data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateBusinessAsAdmin(businessId, formData);
      toast.success('Business updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update business');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePhoto(photoId: string) {
    try {
      await deletePhotoAsAdmin(photoId);
      toast.success('Photo deleted');
      setDeleteTarget(null);
      await loadBusinessData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete photo');
    }
  }

  async function handleDeleteReview(reviewId: string) {
    try {
      await deleteReviewAsAdmin(reviewId);
      toast.success('Review deleted');
      setDeleteTarget(null);
      await loadBusinessData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete review');
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500">Loading business data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen px-4 py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl">Admin: Edit Business</h2>
                  <p className="text-sm text-gray-600">{business.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* Business Info Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Business Name</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Input value={business.category?.name || 'N/A'} disabled />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={formData.website}
                        onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>ZIP Code</Label>
                      <Input
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Service Area</Label>
                      <Input
                        value={formData.service_area}
                        onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                        placeholder="e.g., 50 miles from downtown"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                    />
                  </div>

                  {/* Status Toggles */}
                  <div className="flex gap-4 pt-4 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.verified}
                        onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Verified</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-sm">Featured</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Photos Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Photos ({business.photos?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {business.photos && business.photos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {business.photos.map((photo) => (
                        <div key={photo.id} className="relative group">
                          <img
                            src={photo.url}
                            alt="Business"
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDeleteTarget({ type: 'photo', id: photo.id })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No photos</p>
                  )}
                </CardContent>
              </Card>

              {/* Reviews Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reviews ({reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="p-4 bg-gray-50 rounded-lg relative group">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{review.reviewer_name}</p>
                                <div className="flex gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${
                                        i < review.rating
                                          ? 'text-yellow-400 fill-yellow-400'
                                          : 'text-gray-300'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(review.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeleteTarget({ type: 'review', id: review.id })}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <p className="text-gray-700">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No reviews</p>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Delete {deleteTarget?.type === 'photo' ? 'Photo' : 'Review'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
              {deleteTarget?.type === 'review' && ' The business rating will be recalculated.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget?.type === 'photo') {
                  handleDeletePhoto(deleteTarget.id);
                } else if (deleteTarget?.type === 'review') {
                  handleDeleteReview(deleteTarget.id);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}