import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Star, 
  ArrowLeft, 
  Edit, 
  Flag,
  MessageCircle,
  Share2,
  Heart,
  Clock,
  CheckCircle2,
  ThumbsUp,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { Business, Review, AuthUser } from '../types/business';
import * as api from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { ReportModal } from './ReportModal';
import { ReviewReportModal } from './ReviewReportModal';
import { ReviewModal } from './ReviewModal';
import { ImageLightbox } from './ImageLightbox';
import { OptimizedImage } from './OptimizedImage';

const REVIEWS_PER_PAGE = 5;
const MAX_COMMENT_LENGTH = 300;

interface BusinessProfileProps {
  business: Business;
  currentUser: AuthUser | null;
  onBack: () => void;
  onEdit?: (business: Business) => void;
  onLoginRequired?: () => void;
  onContactBusiness?: (business: Business) => void;
}

export function BusinessProfile({ business, currentUser, onBack, onEdit, onLoginRequired, onContactBusiness }: BusinessProfileProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showReviewReportModal, setShowReviewReportModal] = useState(false);
  const [reviewToReport, setReviewToReport] = useState<Review | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [currentBusiness, setCurrentBusiness] = useState<Business>(business);
  const [isUpdatingHero, setIsUpdatingHero] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [revealedContacts, setRevealedContacts] = useState({ phone: false, email: false });
  const isOwner = currentUser?.id === business.owner_id;

  useEffect(() => {
    loadReviews();
  }, [business.id]);
  
  // Helper function to check if a review can be deleted (within 15 days)
  function canDeleteReview(review: Review): boolean {
    if (!currentUser || review.user_id !== currentUser.id) return false;
    
    const reviewDate = new Date(review.created_at);
    const now = new Date();
    const daysSinceReview = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceReview <= 15;
  }

  // Calculate which reviews to display
  function getDisplayedReviews(): Review[] {
    // Always use pagination mode with 5 reviews per page
    const startIndex = (currentPage - 1) * REVIEWS_PER_PAGE;
    const endIndex = startIndex + REVIEWS_PER_PAGE;
    return reviews.slice(startIndex, endIndex);
  }
  
  // Truncate review comment with ellipsis
  function truncateComment(comment: string | null | undefined): string {
    if (!comment) return '';
    if (comment.length <= MAX_COMMENT_LENGTH) return comment;
    return comment.substring(0, MAX_COMMENT_LENGTH) + '...';
  }

  const totalPages = Math.ceil(reviews.length / REVIEWS_PER_PAGE);
  const displayedReviews = getDisplayedReviews();
  const showPagination = reviews.length > REVIEWS_PER_PAGE;

  async function loadReviews() {
    setIsLoadingReviews(true);
    try {
      const data = await api.getBusinessReviews(business.id);
      setReviews(data);
    } catch (error) {
      toast.error('Failed to load reviews');
    } finally {
      setIsLoadingReviews(false);
    }
  }

  async function handleSubmitReview(reviewData: any) {
    if (!currentUser) {
      if (onLoginRequired) {
        onLoginRequired();
      } else {
        toast.error('Please log in to leave a review');
      }
      return;
    }

    try {
      await api.createReview({
        business_id: business.id,
        user_id: currentUser.id,
        user_name: currentUser.user_metadata?.name || currentUser.email,
        rating: reviewData.rating,
        comment: reviewData.comment,
        is_active: true,
        flagged: false,
      });
      
      toast.success('Review submitted successfully!');
      loadReviews();
      setShowReviewModal(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    }
  }

  async function handleDeleteReview(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    try {
      await api.deleteReview(reviewId, business.id);
      toast.success('Review deleted successfully!');
      loadReviews();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
    }
  }

  async function handleSetHeroImage(imageIndex: number) {
    if (!isOwner || !currentBusiness.portfolio || imageIndex === 0) {
      return; // Already the hero image
    }

    setIsUpdatingHero(true);
    try {
      // Reorder portfolio array to put selected image first
      const newPortfolio = [...currentBusiness.portfolio];
      const [selectedImage] = newPortfolio.splice(imageIndex, 1);
      newPortfolio.unshift(selectedImage);

      // Update business in database
      const updatedBusiness = await api.updateBusiness(currentBusiness.id, {
        portfolio: newPortfolio
      });

      setCurrentBusiness(updatedBusiness);
      toast.success('Hero image updated!');
    } catch (error) {
      toast.error('Failed to update hero image');
    } finally {
      setIsUpdatingHero(false);
    }
  }

  const socialLinks = [
    { url: currentBusiness.facebook_url, icon: Facebook, label: 'Facebook', color: 'hover:text-blue-600' },
    { url: currentBusiness.instagram_url, icon: Instagram, label: 'Instagram', color: 'hover:text-pink-600' },
    { url: currentBusiness.twitter_url, icon: Twitter, label: 'Twitter', color: 'hover:text-sky-500' },
    { url: currentBusiness.linkedin_url, icon: Linkedin, label: 'LinkedIn', color: 'hover:text-blue-700' },
  ].filter(link => link.url);

  // Calculate average rating
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  // Owner View - Matches Customer Design with Owner Functionality
  if (isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Button & Edit Button */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              onClick={onBack} 
              variant="ghost" 
              className="hover:bg-white/50 transition-all"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button 
                  onClick={() => onEdit(currentBusiness)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Business
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left Side */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business Header Card */}
              <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/50 bg-white/80 backdrop-blur-sm">
                {/* Hero Image */}
                {currentBusiness.portfolio && currentBusiness.portfolio.length > 0 ? (
                  <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                    <img
                      src={currentBusiness.portfolio[0]}
                      alt={currentBusiness.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div className="relative h-64 w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 mx-auto mb-3 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <ImageIcon className="w-10 h-10 text-blue-600" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Business Info - Centered */}
                <div className="p-8 pt-4 md:pt-8">
                  <div className="text-center mb-6">
                    <div className="flex-1">
                      <div className="flex flex-col items-center justify-center gap-2 mb-3">
                        <h1 className="text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          {currentBusiness.name}
                        </h1>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          {currentBusiness.verified && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                              ✓ Verified
                            </Badge>
                          )}
                          {currentBusiness.is_featured && (
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                              ⭐ Featured
                            </Badge>
                          )}
                          <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 shadow-sm">
                            {currentBusiness.category?.name}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-200 shadow-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-5 h-5 fill-blue-500 text-blue-500" />
                              <span className="text-xl text-gray-800">
                                {averageRating.toFixed(1)}
                              </span>
                            </div>
                            <div className="w-px h-5 bg-gray-300"></div>
                            <span className="text-sm text-gray-600">
                              {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {currentBusiness.description && (
                    <>
                      <Separator className="my-6" />
                      <div>
                        <h3 className="text-lg mb-3 text-gray-800 flex items-center gap-2">
                          <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                          About
                        </h3>
                        <p className="text-gray-700 leading-relaxed pl-4">{currentBusiness.description}</p>
                      </div>
                    </>
                  )}
                </div>
              </Card>

              {/* Portfolio Gallery - OWNER VERSION with set hero functionality */}
              {currentBusiness.portfolio && currentBusiness.portfolio.length > 1 && (
                <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl text-gray-800 flex items-center gap-2">
                      <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
                      Gallery
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                      <ImageIcon className="w-4 h-4" />
                      Tap any image to set as main
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {currentBusiness.portfolio.slice(0, 4).map((image, index) => (
                      <div
                        key={index}
                        onClick={() => handleSetHeroImage(index)}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all ${
                          index === 0 ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Portfolio ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        {index === 0 && (
                          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-md text-blue-600 px-2.5 py-1 rounded-full text-xs shadow-lg flex items-center gap-1 border border-white/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Main
                          </div>
                        )}
                        {/* Show +N indicator on 4th image if there are more */}
                        {index === 3 && currentBusiness.portfolio.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-3xl">
                              +{currentBusiness.portfolio.length - 4}
                            </span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-all duration-300 flex items-end justify-center pb-3">
                          <span className="text-white text-xs bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30">
                            {index === 0 ? '✓ Current Main' : 'Set as Main'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {currentBusiness.portfolio.length > 4 && (
                    <p className="text-sm text-gray-500 mt-4 text-center">
                      Showing 4 of {currentBusiness.portfolio.length} images. Click any image to set as main.
                    </p>
                  )}
                </Card>
              )}

              {/* Reviews Section */}
              <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow" data-reviews-section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl text-gray-800 flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
                    Reviews ({reviews.length})
                  </h3>
                </div>

                {isLoadingReviews ? (
                  <div className="text-center py-8 text-gray-500">Loading reviews...</div>
                ) : reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No reviews yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayedReviews.map((review) => (
                      <div key={review.id} className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'text-amber-500 fill-amber-500'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-700">{review.user_name || 'Anonymous'}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-500 text-xs">
                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {isOwner && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReviewToReport(review);
                                  setShowReviewReportModal(true);
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all relative z-10"
                                title="Report this review"
                              >
                                <Flag className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-gray-700 text-sm leading-relaxed mt-2">{truncateComment(review.comment)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}



                {/* Pagination */}
                {showPagination && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="outline"
                      size="sm"
                      className="disabled:opacity-50"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={currentPage === page 
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" 
                            : ""}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="outline"
                      size="sm"
                      className="disabled:opacity-50"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar - Right Side */}
            <div className="space-y-6">
              {/* Contact Card */}
              <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow sticky top-6">
                <h3 className="text-lg mb-4 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {currentBusiness.phone && (
                    <>
                      {revealedContacts.phone ? (
                        <a 
                          href={`tel:${currentBusiness.phone}`}
                          className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs text-gray-600">Phone</p>
                            <p className="text-gray-700 text-sm truncate">{currentBusiness.phone}</p>
                          </div>
                        </a>
                      ) : (
                        <button
                          onClick={() => setRevealedContacts(prev => ({ ...prev, phone: true }))}
                          className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                            <Phone className="w-5 h-5 text-white" />
                          </div>
                          <div className="overflow-hidden text-left">
                            <p className="text-xs text-gray-600">Phone</p>
                            <p className="text-blue-600 text-sm">Click to show</p>
                          </div>
                        </button>
                      )}
                    </>
                  )}
                  {currentBusiness.email && (
                    <>
                      {revealedContacts.email ? (
                        <a 
                          href={`mailto:${currentBusiness.email}`}
                          className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs text-gray-600">Email</p>
                            <p className="text-gray-700 text-sm truncate">{currentBusiness.email}</p>
                          </div>
                        </a>
                      ) : (
                        <button
                          onClick={() => setRevealedContacts(prev => ({ ...prev, email: true }))}
                          className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div className="overflow-hidden text-left">
                            <p className="text-xs text-gray-600">Email</p>
                            <p className="text-blue-600 text-sm">Click to show</p>
                          </div>
                        </button>
                      )}
                    </>
                  )}
                  {currentBusiness.website && (
                    <a 
                      href={currentBusiness.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                        <Globe className="w-5 h-5 text-white" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-gray-600">Website</p>
                        <p className="text-gray-700 text-sm truncate">{currentBusiness.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                      </div>
                    </a>
                  )}
                  {currentBusiness.city && (
                    <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Location</p>
                        <p className="text-gray-700 text-sm">
                          {currentBusiness.city}
                          {currentBusiness.zip_code && `, ${currentBusiness.zip_code}`}
                        </p>
                      </div>
                    </div>
                  )}
                  {currentBusiness.address && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Full Address</p>
                      <p className="text-gray-700 text-sm">{currentBusiness.address}</p>
                    </div>
                  )}
                  {currentBusiness.service_area && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                      <p className="text-xs text-gray-600 mb-1">Service Area</p>
                      <p className="text-gray-700 text-sm">{currentBusiness.service_area}</p>
                    </div>
                  )}
                </div>

                {/* Social Media */}
                {socialLinks.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="text-sm mb-3 text-gray-700">Social Media</h4>
                      <div className="flex gap-2 flex-wrap">
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
                              <Icon className="w-5 h-5" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </Card>
            </div>
          </div>
        </div>

        {/* Image Lightbox */}
        {lightboxIndex !== null && currentBusiness.portfolio && (
          <ImageLightbox
            images={currentBusiness.portfolio}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        {/* ReviewReportModal for Owner View */}
        <ReviewReportModal
          open={showReviewReportModal}
          onOpenChange={setShowReviewReportModal}
          reviewId={reviewToReport?.id || ''}
          reviewAuthor={reviewToReport?.user_name || 'Anonymous'}
          businessName={currentBusiness.name}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // Customer View - Multi-Card Layout (Original Design)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            onClick={onBack} 
            variant="ghost" 
            className="hover:bg-white/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Results
          </Button>
          <Button
            onClick={() => {
              if (!currentUser) {
                if (onLoginRequired) {
                  onLoginRequired();
                } else {
                  toast.error('Please log in to report a business');
                }
                return;
              }
              setShowReportModal(true);
            }}
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-red-600 hover:bg-red-50 transition-all duration-300 hover:scale-110"
            title="Report this business"
          >
            <Flag className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Header Card */}
            <Card className="relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white/50 bg-white/80 backdrop-blur-sm">
              {/* Hero Image */}
              {currentBusiness.portfolio && currentBusiness.portfolio.length > 0 ? (
                <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                  <img
                    src={currentBusiness.portfolio[0]}
                    alt={currentBusiness.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="relative h-64 w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-3 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <ImageIcon className="w-10 h-10 text-blue-600" />
                    </div>
                  </div>
                </div>
              )}

              {/* Business Info - Centered */}
              <div className="p-8 pt-4 md:pt-8">
                <div className="text-center mb-6">
                  <div className="flex-1">
                    <div className="flex flex-col items-center justify-center gap-2 mb-3">
                      <h1 className="text-4xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        {currentBusiness.name}
                      </h1>
                      <div className="flex items-center gap-2 flex-wrap justify-center">
                        {currentBusiness.verified && (
                          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                            ✓ Verified
                          </Badge>
                        )}
                        {currentBusiness.is_featured && (
                          <Badge className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 shadow-lg">
                            ⭐ Featured
                          </Badge>
                        )}
                        <Badge className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 shadow-sm">
                          {currentBusiness.category?.name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full border border-blue-200 shadow-sm">
                          <div className="flex items-center gap-1">
                            <Star className="w-5 h-5 fill-blue-500 text-blue-500" />
                            <span className="text-xl text-gray-800">
                              {averageRating.toFixed(1)}
                            </span>
                          </div>
                          <div className="w-px h-5 bg-gray-300"></div>
                          <span className="text-sm text-gray-600">
                            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {currentBusiness.description && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="text-lg mb-3 text-gray-800 flex items-center gap-2">
                        <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                        About
                      </h3>
                      <p className="text-gray-700 leading-relaxed pl-4">{currentBusiness.description}</p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Portfolio Gallery */}
            {currentBusiness.portfolio && currentBusiness.portfolio.length > 1 && (
              <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow">
                <h3 className="text-xl mb-4 text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-purple-600 to-pink-600 rounded-full"></div>
                  Gallery
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {currentBusiness.portfolio.slice(1, 5).map((image, index) => (
                    <div
                      key={index}
                      onClick={() => setLightboxIndex(index + 1)}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group shadow-md hover:shadow-xl transition-all"
                    >
                      <img
                        src={image}
                        alt={`Portfolio ${index + 2}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Show +N indicator on 4th image if there are more */}
                      {index === 3 && currentBusiness.portfolio.length > 5 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white text-3xl">
                            +{currentBusiness.portfolio.length - 5}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                    </div>
                  ))}
                </div>
                {currentBusiness.portfolio.length > 5 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing 4 of {currentBusiness.portfolio.length - 1} gallery images. Click any image to view full gallery.
                  </p>
                )}
              </Card>
            )}

            {/* Reviews Section */}
            <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow" data-reviews-section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl text-gray-800 flex items-center gap-2">
                  <div className="w-1 h-6 bg-gradient-to-b from-amber-600 to-orange-600 rounded-full"></div>
                  Reviews ({reviews.length})
                </h3>
                <Button
                  onClick={() => {
                    if (!currentUser) {
                      if (onLoginRequired) {
                        onLoginRequired();
                      } else {
                        toast.error('Please log in to leave a review');
                      }
                      return;
                    }
                    setShowReviewModal(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Write a Review
                </Button>
              </div>

              {isLoadingReviews ? (
                <div className="text-center py-8 text-gray-500">Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedReviews.map((review) => (
                    <div key={review.id} className="p-4 bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">{review.user_name || 'Anonymous'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-500 text-xs">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {canDeleteReview(review) && (
                            <Button
                              onClick={() => handleDeleteReview(review.id)}
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                              title="Delete your review (within 15 days)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!currentUser) {
                                if (onLoginRequired) {
                                  onLoginRequired();
                                } else {
                                  toast.error('Please log in to report a review');
                                }
                                return;
                              }
                              setReviewToReport(review);
                              setShowReviewReportModal(true);
                            }}
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all relative z-10"
                            title="Report this review"
                          >
                            <Flag className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm leading-relaxed mt-2">{truncateComment(review.comment)}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}



              {/* Pagination */}
              {showPagination && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className={currentPage === page 
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white" 
                          : ""}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    variant="outline"
                    size="sm"
                    className="disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar - Right Side */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card className="p-6 shadow-xl border-2 border-white/50 bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-shadow sticky top-6">
              <h3 className="text-lg mb-4 text-gray-800 flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-600 to-purple-600 rounded-full"></div>
                Contact Information
              </h3>
              <div className="space-y-3">
                {currentBusiness.phone && (
                  <>
                    {revealedContacts.phone ? (
                      <a 
                        href={`tel:${currentBusiness.phone}`}
                        className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs text-gray-600">Phone</p>
                          <p className="text-gray-700 text-sm truncate">{currentBusiness.phone}</p>
                        </div>
                      </a>
                    ) : (
                      <button
                        onClick={() => setRevealedContacts(prev => ({ ...prev, phone: true }))}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <Phone className="w-5 h-5 text-white" />
                        </div>
                        <div className="overflow-hidden text-left">
                          <p className="text-xs text-gray-600">Phone</p>
                          <p className="text-blue-600 text-sm">Click to show</p>
                        </div>
                      </button>
                    )}
                  </>
                )}
                {currentBusiness.email && (
                  <>
                    {revealedContacts.email ? (
                      <a 
                        href={`mailto:${currentBusiness.email}`}
                        className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="text-gray-700 text-sm truncate">{currentBusiness.email}</p>
                        </div>
                      </a>
                    ) : (
                      <button
                        onClick={() => setRevealedContacts(prev => ({ ...prev, email: true }))}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                          <Mail className="w-5 h-5 text-white" />
                        </div>
                        <div className="overflow-hidden text-left">
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="text-blue-600 text-sm">Click to show</p>
                        </div>
                      </button>
                    )}
                  </>
                )}
                {currentBusiness.website && (
                  <a 
                    href={currentBusiness.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200 hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                      <Globe className="w-5 h-5 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-gray-600">Website</p>
                      <p className="text-gray-700 text-sm truncate">{currentBusiness.website.replace(/^https?:\/\/(www\.)?/, '')}</p>
                    </div>
                  </a>
                )}
                {currentBusiness.city && (
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Location</p>
                      <p className="text-gray-700 text-sm">
                        {currentBusiness.city}
                        {currentBusiness.zip_code && `, ${currentBusiness.zip_code}`}
                      </p>
                    </div>
                  </div>
                )}
                {currentBusiness.address && (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Full Address</p>
                    <p className="text-gray-700 text-sm">{currentBusiness.address}</p>
                  </div>
                )}
                {currentBusiness.service_area && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 mb-1">Service Area</p>
                    <p className="text-gray-700 text-sm">{currentBusiness.service_area}</p>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {socialLinks.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <h4 className="text-sm mb-3 text-gray-700">Social Media</h4>
                    <div className="flex gap-2 flex-wrap">
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
                            <Icon className="w-5 h-5" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {onContactBusiness && (
                <>
                  <Separator className="my-4" />
                  <Button
                    onClick={() => onContactBusiness(currentBusiness)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Business
                  </Button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxIndex !== null && currentBusiness.portfolio && (
        <ImageLightbox
          images={currentBusiness.portfolio}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Review Modal */}
      <ReviewModal
        open={showReviewModal}
        onOpenChange={setShowReviewModal}
        onSubmitReview={handleSubmitReview}
        businessName={currentBusiness.name}
        currentUser={currentUser}
        onLoginRequired={onLoginRequired || (() => {})}
      />

      {/* Report Modal */}
      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        businessId={currentBusiness.id}
        businessName={currentBusiness.name}
        currentUser={currentUser}
      />

      {/* ReviewReportModal */}
      <ReviewReportModal
        open={showReviewReportModal}
        onOpenChange={setShowReviewReportModal}
        reviewId={reviewToReport?.id || ''}
        reviewAuthor={reviewToReport?.user_name || 'Anonymous'}
        businessName={currentBusiness.name}
        currentUser={currentUser}
      />
    </div>
  );
}