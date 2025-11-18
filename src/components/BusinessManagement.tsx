import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Edit, Eye, Loader2, Trash2, Star, MapPin, Phone, Mail, Globe, Image as ImageIcon, Facebook, Instagram, Twitter, Linkedin, Archive } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
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
import { Business } from '../types/business';
import { AuthUser } from '../types/user';
import { toast } from 'sonner@2.0.3';
import { getBusinessesByOwner, deleteBusiness } from '../utils/api';
import { RecycleBin } from './RecycleBin';

interface BusinessManagementProps {
  currentUser: AuthUser;
  onRegisterNew: () => void;
  onEditBusiness: (business: Business) => void;
  onViewBusiness: (business: Business) => void;
}

export function BusinessManagement({
  currentUser,
  onRegisterNew,
  onEditBusiness,
  onViewBusiness,
}: BusinessManagementProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('businesses');

  useEffect(() => {
    loadBusinesses();
  }, [currentUser.id]);

  async function loadBusinesses() {
    try {
      const data = await getBusinessesByOwner(currentUser.id);
      setBusinesses(data);
    } catch (error) {
      toast.error('Failed to load your businesses');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteBusiness() {
    if (!businessToDelete) return;

    setIsDeleting(true);
    try {
      await deleteBusiness(businessToDelete.id);
      toast.success('Business moved to Recycle Bin. You can restore it within 90 days.');
      
      // Remove from local state
      setBusinesses(businesses.filter(b => b.id !== businessToDelete.id));
      setBusinessToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete business');
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your businesses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl mb-2">My Businesses</h1>
            <p className="text-gray-600">Manage your registered businesses</p>
          </div>
          <Button
            onClick={onRegisterNew}
            className="hidden md:flex bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Register New Business
          </Button>
        </div>

        {/* Tabs for Active Businesses and Recycle Bin */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="businesses" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              Active Businesses
            </TabsTrigger>
            <TabsTrigger value="recycle-bin" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Archive className="w-4 h-4 mr-2" />
              Recycle Bin
            </TabsTrigger>
          </TabsList>

          {/* Active Businesses Tab */}
          <TabsContent value="businesses" className="space-y-6">
        {/* Business List */}
        {businesses.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-2xl mb-2">No Businesses Yet</h3>
              <p className="text-gray-600 mb-6">
                Start by registering your first business on BizDizy
              </p>
              <Button
                onClick={onRegisterNew}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Register Your First Business
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {businesses.map((business) => {
              const socialLinks = [
                { url: business.facebook_url, icon: Facebook, label: 'Facebook', color: 'hover:text-blue-600' },
                { url: business.instagram_url, icon: Instagram, label: 'Instagram', color: 'hover:text-pink-600' },
                { url: business.twitter_url, icon: Twitter, label: 'Twitter', color: 'hover:text-sky-500' },
                { url: business.linkedin_url, icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-700' },
              ].filter(link => link.url);

              return (
                <Card key={business.id} className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/50 bg-white/80 backdrop-blur-sm">
                  {/* Hero Image */}
                  {business.portfolio && business.portfolio.length > 0 ? (
                    <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                      <img
                        src={business.portfolio[0]}
                        alt={business.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="relative h-48 w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-3 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <ImageIcon className="w-8 h-8 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Business Info */}
                  <div className="p-6">
                    <div className="text-center mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <h3 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {business.name}
                          </h3>
                          {business.verified && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                              ✓ Verified
                            </Badge>
                          )}
                          {business.is_featured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                              ⭐ Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mb-2">{business.category?.name}</p>
                      </div>
                      
                      {/* Rating Display - Centered */}
                      <div className="inline-block mt-3">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-5 h-5 ${
                                  i < Math.round(business.rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-200 text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                              {business.rating.toFixed(1)}
                            </span>
                            <span className="text-gray-500 text-sm">
                              ({business.review_count || 0} {(business.review_count || 0) === 1 ? 'review' : 'reviews'})
                            </span>
                          </div>
                        </div>
                      </div>


                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <Button
                        onClick={() => onViewBusiness(business)}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-blue-50 hover:border-blue-300 transition-all"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        onClick={() => onEditBusiness(business)}
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => setBusinessToDelete(business)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>

                    {/* Description */}
                    {business.description && (
                      <div className="mb-4">
                        <h4 className="text-sm mb-2 bg-gradient-to-r from-gray-700 to-gray-900 bg-clip-text text-transparent">
                          About This Business
                        </h4>
                        <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">{business.description}</p>
                      </div>
                    )}

                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {business.phone && (
                        <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                            <Phone className="w-4 h-4 text-white" />
                          </div>
                          <a href={`tel:${business.phone}`} className="hover:underline text-gray-700 text-sm truncate">
                            {business.phone}
                          </a>
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                            <Mail className="w-4 h-4 text-white" />
                          </div>
                          <a href={`mailto:${business.email}`} className="hover:underline text-gray-700 text-sm truncate">
                            {business.email}
                          </a>
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 md:col-span-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                            <Globe className="w-4 h-4 text-white" />
                          </div>
                          <a href={business.website} target="_blank" rel="noopener noreferrer" className="hover:underline text-gray-700 text-sm truncate">
                            {business.website}
                          </a>
                        </div>
                      )}
                      {business.city && (
                        <div className="flex items-center gap-2 p-2 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 md:col-span-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                            <MapPin className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-gray-700 text-sm">
                            {business.city}
                            {business.zip_code && `, ${business.zip_code}`}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Address */}
                    {business.address && (
                      <div className="mb-4 p-3 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                        <h4 className="text-xs text-gray-600 mb-1">Full Address</h4>
                        <p className="text-gray-800 text-sm">{business.address}</p>
                      </div>
                    )}

                    {/* Service Area */}
                    {business.service_area && (
                      <div className="mb-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h4 className="text-xs text-gray-600 mb-1">Service Area</h4>
                        <p className="text-gray-800 text-sm">{business.service_area}</p>
                      </div>
                    )}

                    {/* Social Media Links */}
                    {socialLinks.length > 0 && (
                      <div>
                        <Separator className="mb-3" />
                        <h4 className="text-xs text-gray-600 mb-2">Connect with us</h4>
                        <div className="flex gap-2 justify-center">
                          {socialLinks.map((link, index) => {
                            const Icon = link.icon;
                            return (
                              <a
                                key={index}
                                href={link.url!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`w-10 h-10 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${link.color}`}
                                title={link.label}
                              >
                                <Icon className="w-4 h-4" />
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Portfolio Count */}
                    {business.portfolio && business.portfolio.length > 0 && (
                      <div className="mt-4 p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <ImageIcon className="w-4 h-4 text-purple-600" />
                          <span className="text-sm text-gray-700">
                            {business.portfolio.length} Portfolio {business.portfolio.length === 1 ? 'Image' : 'Images'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
          </TabsContent>

          {/* Recycle Bin Tab */}
          <TabsContent value="recycle-bin">
            <Card className="bg-white/80 backdrop-blur-sm p-6">
              <RecycleBin 
                userId={currentUser.id} 
                onBusinessRestored={loadBusinesses}
              />
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!businessToDelete} onOpenChange={(open) => !open && setBusinessToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move Business to Recycle Bin?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{businessToDelete?.name}</strong>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 mt-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                <p className="text-blue-900 mb-1">
                  <strong>Don't worry!</strong> Your business will be moved to the Recycle Bin.
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
                  <li>You can restore it within 90 days</li>
                  <li>All data (reviews, messages) will be preserved</li>
                  <li>Images will be removed to free up storage</li>
                </ul>
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteBusiness}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Business
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}