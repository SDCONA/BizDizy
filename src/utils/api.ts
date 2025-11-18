import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { 
  Business, 
  Review, 
  Category, 
  SearchFilters,
  Report,
  ContactMessage,
  TermsAndPolicy,
  PolicyNotification,
  Favorite,
  Conversation,
  Message
} from '../types/business';
import { deleteAllBusinessImages } from './supabase/storage';
import { handleAuthError, isAuthError } from './authErrorHandler';
import { 
  getCachedCategories, 
  cacheCategories, 
  clearCategoryCache 
} from './cache';

const supabase = createClient();

// ============================================
// RECAPTCHA VERIFICATION API
// ============================================

export async function verifyRecaptcha(recaptchaToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/auth/verify-recaptcha`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recaptchaToken }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return { success: false, error: data.error || 'reCAPTCHA verification failed' };
    }
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to verify reCAPTCHA' };
  }
}

// ============================================
// CATEGORY API (WITH CACHING)
// ============================================

export async function getCategories(sortByPopularity: boolean = false): Promise<Category[]> {
  // Try to get from cache first (24-hour TTL)
  const cached = getCachedCategories();
  if (cached && !sortByPopularity) {
    return cached;
  }
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  
  if (error) {
    throw new Error(error.message);
  }
  
  const categories = data || [];
  
  // Cache the categories for future requests (only if not sorting by popularity)
  if (!sortByPopularity) {
    cacheCategories(categories);
  }
  
  // If popularity sorting requested, add business counts
  if (sortByPopularity && categories.length > 0) {
    return getCategoriesWithBusinessCount(categories);
  }
  
  return categories;
}

async function getCategoriesWithBusinessCount(categories: Category[]): Promise<Category[]> {
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select('category_id')
    .eq('is_active', true)
    .is('deleted_at', null);
  
  if (error) {
    return categories;
  }
  
  // Count businesses per category
  const countMap = new Map<string, number>();
  businesses?.forEach(business => {
    if (business.category_id) {
      countMap.set(business.category_id, (countMap.get(business.category_id) || 0) + 1);
    }
  });
  
  // Add counts and sort by popularity
  const enriched = categories.map(category => ({
    ...category,
    business_count: countMap.get(category.id) || 0,
  }));
  
  return enriched.sort((a, b) => {
    if ((b.business_count || 0) !== (a.business_count || 0)) {
      return (b.business_count || 0) - (a.business_count || 0);
    }
    return a.name.localeCompare(b.name);
  });
}

// ============================================
// BUSINESS API
// ============================================

export async function searchBusinesses(filters: SearchFilters): Promise<Business[]> {
  let query = supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .is('deleted_at', null);
  
  // Apply filters
  if (filters.query) {
    query = query.or(`name.ilike.%${filters.query}%,description.ilike.%${filters.query}%`);
  }
  
  if (filters.category) {
    query = query.eq('category_id', filters.category);
  }
  
  if (filters.city) {
    query = query.ilike('city', `%${filters.city}%`);
  }
  
  if (filters.zip_code) {
    query = query.eq('zip_code', filters.zip_code);
  }
  
  if (filters.verified_only) {
    query = query.eq('verified', true);
  }
  
  if (filters.featured_only) {
    query = query.eq('is_featured', true);
  }
  
  const { data, error } = await query;
  
  if (error) {
    throw new Error(error.message);
  }
  
  const businesses = data || [];
  
  // Calculate rating and review count for each business
  if (businesses.length > 0) {
    const businessIds = businesses.map(b => b.id);
    
    const { data: reviews } = await supabase
      .from('reviews')
      .select('business_id, rating')
      .in('business_id', businessIds)
      .eq('is_active', true);
    
    // Calculate ratings and count reviews per business
    const businessStats = new Map<string, { totalRating: number; count: number }>();
    reviews?.forEach(review => {
      const stats = businessStats.get(review.business_id) || { totalRating: 0, count: 0 };
      stats.totalRating += review.rating;
      stats.count += 1;
      businessStats.set(review.business_id, stats);
    });
    
    // Add rating and review_count to each business
    businesses.forEach(business => {
      const stats = businessStats.get(business.id);
      if (stats) {
        business.rating = Math.round((stats.totalRating / stats.count) * 10) / 10;
        business.review_count = stats.count;
      } else {
        business.rating = 0;
        business.review_count = 0;
      }
    });
  }
  
  // Apply min_rating filter after calculating ratings
  let filteredBusinesses = businesses;
  if (filters.min_rating !== undefined) {
    filteredBusinesses = businesses.filter(b => b.rating >= filters.min_rating!);
  }
  
  // Sort by rating
  filteredBusinesses.sort((a, b) => b.rating - a.rating);
  
  return filteredBusinesses;
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  
  if (error) {
    return null;
  }
  
  return data;
}

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function getDeletedBusinessesByOwner(ownerId: string): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('owner_id', ownerId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function getAllBusinesses(): Promise<Business[]> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

// Get all deleted businesses (Admin only)
export async function getAllDeletedBusinesses(): Promise<Business[]> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function getHighlyRatedBusinesses(limit: number = 6): Promise<Business[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      category:categories(*)
    `)
    .eq('is_active', true)
    .is('deleted_at', null)
    .gte('rating', 4.0)
    .order('rating', { ascending: false })
    .limit(limit);
  
  if (error) {
    return [];
  }
  
  return data || [];
}

export async function createBusiness(business: Partial<Business>): Promise<Business> {
  // Check for duplicate business (same name + city + owner) - including deleted ones
  if (business.name && business.city && business.owner_id) {
    const { data: existing } = await supabase
      .from('businesses')
      .select('id, name, city, deleted_at')
      .eq('owner_id', business.owner_id);
    
    // Manually check for case-insensitive duplicates
    if (existing && existing.length > 0) {
      const duplicate = existing.find(b => 
        b.name.toLowerCase() === business.name!.toLowerCase() && 
        b.city.toLowerCase() === business.city!.toLowerCase()
      );
      
      if (duplicate) {
        if (duplicate.deleted_at !== null) {
          throw new Error(`You previously deleted a business named "${business.name}" in ${business.city}. Deleted businesses cannot be re-registered. Please use a different name or city.`);
        }
        throw new Error(`You already have a business named "${business.name}" in ${business.city}. Please use a different name or register in a different city.`);
      }
    }
  }
  
  const { data, error } = await supabase
    .from('businesses')
    .insert([business])
    .select(`
      *,
      category:categories(*)
    `)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function updateBusiness(id: string, updates: Partial<Business>): Promise<Business> {
  // Check for duplicate business when updating name or city (same name + city + owner, but different ID)
  if ((updates.name || updates.city) && updates.owner_id) {
    // Get current business to check against
    const { data: current } = await supabase
      .from('businesses')
      .select('name, city, owner_id')
      .eq('id', id)
      .single();
    
    if (current) {
      const nameToCheck = updates.name || current.name;
      const cityToCheck = updates.city || current.city;
      
      const { data: existing } = await supabase
        .from('businesses')
        .select('id, name, city, deleted_at')
        .eq('owner_id', updates.owner_id || current.owner_id)
        .neq('id', id);
      
      // Manually check for case-insensitive duplicates
      if (existing && existing.length > 0) {
        const duplicate = existing.find(b => 
          b.name.toLowerCase() === nameToCheck.toLowerCase() && 
          b.city.toLowerCase() === cityToCheck.toLowerCase()
        );
        
        if (duplicate) {
          if (duplicate.deleted_at !== null) {
            throw new Error(`You previously deleted a business named "${nameToCheck}" in ${cityToCheck}. You cannot update this business to use that name in that city.`);
          }
          throw new Error(`You already have a business named "${nameToCheck}" in ${cityToCheck}. Please use a different name or city.`);
        }
      }
    }
  }
  
  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function deleteBusiness(id: string): Promise<void> {
  // Soft delete: Mark as deleted instead of actually deleting
  // This prevents re-registration and preserves data integrity
  const { error } = await supabase
    .from('businesses')
    .update({ 
      is_active: false,
      deleted_at: new Date().toISOString()
    })
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Delete all images from storage after marking as deleted
  try {
    await deleteAllBusinessImages(id);
  } catch (error) {
    // Silently handle image deletion errors
  }
}

export async function restoreBusiness(id: string): Promise<Business> {
  // First, check if business can be restored (within 90 days)
  const { data: business, error: fetchError } = await supabase
    .from('businesses')
    .select('*, category:categories(*)')
    .eq('id', id)
    .single();
  
  if (fetchError || !business) {
    throw new Error('Business not found');
  }
  
  if (!business.deleted_at) {
    throw new Error('Business is not deleted');
  }
  
  // Check if within 90 days
  const deletedDate = new Date(business.deleted_at);
  const now = new Date();
  const daysSinceDeletion = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceDeletion > 90) {
    throw new Error('Cannot restore business deleted more than 90 days ago. Please register a new business instead.');
  }
  
  // Restore the business
  const { data, error } = await supabase
    .from('businesses')
    .update({ 
      is_active: true,
      deleted_at: null
    })
    .eq('id', id)
    .select(`
      *,
      category:categories(*)
    `)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function permanentlyDeleteBusiness(id: string): Promise<void> {
  // Permanently delete business and all related data
  // This is irreversible!
  
  // Delete images first
  try {
    await deleteAllBusinessImages(id);
  } catch (error) {
    // Silently handle image deletion errors
  }
  
  // Permanently delete from database
  const { error } = await supabase
    .from('businesses')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================
// REVIEW API
// ============================================

export async function getBusinessReviews(businessId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) {
    return [];
  }
  
  return data || [];
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('id', reviewId)
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
}

export async function createReview(review: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert([review])
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Update business rating
  await updateBusinessRating(review.business_id!);
  
  return data;
}

export async function updateReview(id: string, updates: Partial<Review>): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Update business rating
  await updateBusinessRating(data.business_id);
  
  return data;
}

export async function deleteReview(id: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', id);
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Update business rating
  await updateBusinessRating(businessId);
}

async function updateBusinessRating(businessId: string): Promise<void> {
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('business_id', businessId)
    .eq('is_active', true);
  
  if (!reviews || reviews.length === 0) {
    // No reviews, set rating to 0
    await supabase
      .from('businesses')
      .update({ rating: 0 })
      .eq('id', businessId);
    return;
  }
  
  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const avgRating = totalRating / reviews.length;
  
  await supabase
    .from('businesses')
    .update({ rating: Math.round(avgRating * 10) / 10 })
    .eq('id', businessId);
}



// ============================================
// FAVORITES API
// ============================================

export async function getFavorites(userId: string): Promise<Favorite[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      *,
      business:businesses(*)
    `)
    .eq('user_id', userId);
  
  if (error) {
    return [];
  }
  
  // Filter out favorites where business is deleted
  // (business will be null if deleted due to RLS policy)
  const activeFavorites = (data || []).filter(fav => 
    fav.business && !fav.business.deleted_at
  );
  
  return activeFavorites;
}

export async function addFavorite(userId: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .insert([{ user_id: userId, business_id: businessId }]);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function removeFavorite(userId: string, businessId: string): Promise<void> {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('business_id', businessId);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function isFavorite(userId: string, businessId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single();
  
  return !error && !!data;
}

// ============================================
// REPORT API
// ============================================

export async function createReport(report: Partial<Report>): Promise<void> {
  const { error } = await supabase
    .from('reports')
    .insert([report]);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function getReports(): Promise<Report[]> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function updateReportStatus(
  reportId: string, 
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
  adminNotes?: string
): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const updates: any = { status };
  
  if (status === 'resolved' || status === 'dismissed') {
    updates.resolved_at = new Date().toISOString();
    const { data: { user } } = await supabase.auth.getUser();
    updates.resolved_by = user?.id || null;
  }
  
  if (adminNotes) {
    updates.admin_notes = adminNotes;
  }

  const { error } = await supabase
    .from('reports')
    .update(updates)
    .eq('id', reportId);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteReport(reportId: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', reportId);
  
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================
// CONTACT MESSAGE API
// ============================================

export async function submitContactMessage(message: Partial<ContactMessage> & { recaptchaToken?: string }): Promise<void> {
  // Use backend route to support reCAPTCHA verification
  const session = await getCurrentSession();
  
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/contact`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to submit contact message');
  }
}

// ============================================
// TERMS & POLICY API
// ============================================

export async function getCurrentTerms(): Promise<TermsAndPolicy | null> {
  const { data, error } = await supabase
    .from('terms_and_policies')
    .select('*')
    .eq('type', 'terms')
    .eq('is_current', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {

    return null;
  }
  
  return data;
}

export async function getCurrentPrivacy(): Promise<TermsAndPolicy | null> {
  const { data, error } = await supabase
    .from('terms_and_policies')
    .select('*')
    .eq('type', 'privacy')
    .eq('is_current', true)
    .single();
  
  if (error && error.code !== 'PGRST116') {

    return null;
  }
  
  return data;
}

export interface PolicyDocument {
  id: string;
  type: 'terms_of_service' | 'privacy_policy';
  content: string;
  version: number;
  updated_at: string;
}

export async function getTermsAndPolicies(): Promise<PolicyDocument[]> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { data, error } = await supabase
    .from('terms_and_policies')
    .select('*')
    .eq('is_current', true)
    .order('updated_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Map the data to match PolicyDocument interface
  const policies: PolicyDocument[] = (data || []).map(policy => ({
    id: policy.id,
    type: policy.type === 'terms' ? 'terms_of_service' : 'privacy_policy',
    content: policy.content,
    version: policy.version,
    updated_at: policy.updated_at,
  }));
  
  return policies;
}

export async function updateTermsAndPolicies(
  type: 'terms_of_service' | 'privacy_policy',
  content: string
): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const policyType = type === 'terms_of_service' ? 'terms' : 'privacy';
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  // Get current policy to increment version
  const { data: currentPolicy } = await supabase
    .from('terms_and_policies')
    .select('version')
    .eq('type', policyType)
    .eq('is_current', true)
    .single();

  const newVersion = (currentPolicy?.version || 0) + 1;

  // Mark old policy as not current
  if (currentPolicy) {
    await supabase
      .from('terms_and_policies')
      .update({ is_current: false })
      .eq('type', policyType)
      .eq('is_current', true);
  }

  // Insert new policy
  const { error } = await supabase
    .from('terms_and_policies')
    .insert([{
      type: policyType,
      content,
      version: newVersion,
      is_current: true,
      created_by: user.id,
    }]);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function notifyPolicyChange(
  type: 'terms_of_service' | 'privacy_policy'
): Promise<{ notifiedCount: number }> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const policyType = type === 'terms_of_service' ? 'terms' : 'privacy';

  // Get the current policy
  const { data: policy } = await supabase
    .from('terms_and_policies')
    .select('id')
    .eq('type', policyType)
    .eq('is_current', true)
    .single();

  if (!policy) {
    throw new Error('Policy not found');
  }

  // Get all authenticated users from auth.users
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/notify-policy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        policyId: policy.id,
        policyType: type 
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to notify users');
  }

  const data = await response.json();
  return { notifiedCount: data.notifiedCount || 0 };
}

// Get unread policy notifications for current user
export async function getUserPolicyNotifications(): Promise<PolicyNotification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from('policy_notifications')
    .select(`
      *,
      policy:terms_and_policies(*)
    `)
    .eq('user_id', user.id)
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching policy notifications:', error);
    return [];
  }
  
  return data || [];
}

// Mark policy notification as read
export async function markPolicyNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('policy_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  
  if (error) {
    throw new Error(error.message);
  }
}

// Acknowledge policy notification
export async function acknowledgePolicyNotification(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('policy_notifications')
    .update({ 
      acknowledged_at: new Date().toISOString(),
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);
  
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================
// ADDITIONAL UTILITY FUNCTIONS
// ============================================

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .is('read_at', null);
  
  if (error) {

  }
}

export async function getUnreadCounts(businessId: string): Promise<{ [key: string]: number }> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('business_id', businessId);
  
  if (!conversations) return {};
  
  const counts: { [key: string]: number } = {};
  
  for (const conv of conversations) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conv.id)
      .is('read_at', null)
      .eq('sender_type', 'user');
    
    counts[conv.id] = messages?.length || 0;
  }
  
  return counts;
}

export async function getAdminAnalytics(): Promise<any> {
  // Get business stats (excluding deleted businesses)
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .is('deleted_at', null);
  
  // Get user stats (from auth)
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*');
  
  const { data: contactMessages } = await supabase
    .from('contact_messages')
    .select('*');
  
  const { data: reports } = await supabase
    .from('reports')
    .select('*');
  
  return {
    totalBusinesses: businesses?.length || 0,
    activeBusinesses: businesses?.filter(b => b.is_active).length || 0,
    verifiedBusinesses: businesses?.filter(b => b.verified).length || 0,
    totalReviews: reviews?.length || 0,
    totalContactMessages: contactMessages?.length || 0,
    pendingReports: reports?.filter(r => r.status === 'pending').length || 0,
    newContactMessages: contactMessages?.filter(m => m.status === 'new').length || 0,
  };
}

// For backwards compatibility - some components may still use this
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// Get current session
async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ============================================
// USER PROFILE API
// ============================================

export async function updateUserProfile(userId: string, updates: { phone?: string; name?: string }): Promise<void> {
  const { error } = await supabase.auth.updateUser({
    data: updates
  });
  
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================
// CONTACT MESSAGES API (ADMIN)
// ============================================

export async function getContactMessages(): Promise<ContactMessage[]> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { data, error } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

export async function markContactMessageAsRead(messageId: string): Promise<void> {
  const isAdmin = await isCurrentUserAdmin();
  
  if (!isAdmin) {
    throw new Error('Access denied: Admin privileges required');
  }

  const { error } = await supabase
    .from('contact_messages')
    .update({ status: 'read', read_at: new Date().toISOString() })
    .eq('id', messageId);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteContactMessage(messageId: string): Promise<void> {
  const { error } = await supabase
    .from('contact_messages')
    .delete()
    .eq('id', messageId);
  
  if (error) {
    throw new Error(error.message);
  }
}

export async function replyToContactMessage(messageId: string, reply: string): Promise<void> {
  const { error } = await supabase
    .from('contact_messages')
    .update({ 
      status: 'replied', 
      reply: reply,
      replied_at: new Date().toISOString() 
    })
    .eq('id', messageId);
  
  if (error) {
    throw new Error(error.message);
  }
}

// ============================================
// USER MANAGEMENT API (ADMIN)
// ============================================

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  created_at: string;
  lastSignIn: string | null;
  businessCount: number;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return false;
  }
  
  return user.user_metadata?.is_admin === true || user.user_metadata?.role === 'admin';
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/users`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch users');
  }

  const data = await response.json();
  return data.users || [];
}

export async function promoteUserToAdmin(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/signup`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to promote user');
  }
}

export async function demoteUserFromAdmin(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/demote/${userId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to demote user');
  }
}

export async function deleteUserAsAdmin(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/users/${userId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete user');
  }
}

// Admin business management functions
export async function updateBusinessAsAdmin(businessId: string, updates: Partial<Business>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/businesses/${businessId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update business');
  }
}

export async function deletePhotoAsAdmin(photoId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/photos/${photoId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete photo');
  }
}

export async function deleteReviewAsAdmin(reviewId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/reviews/${reviewId}`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete review');
  }
}

// ============================================
// MESSAGING API
// ============================================

// Get all conversations for a user (as consumer or business owner)
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      business:businesses(*)
    `)
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

// Get all conversations for a business (messages from consumers)
export async function getBusinessConversations(businessId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

// Get or create a conversation between a user and a business
export async function getOrCreateConversation(userId: string, businessId: string): Promise<Conversation> {
  // First, try to find existing conversation
  const { data: existing, error: findError } = await supabase
    .from('conversations')
    .select(`
      *,
      business:businesses(*)
    `)
    .eq('user_id', userId)
    .eq('business_id', businessId)
    .single();
  
  if (existing && !findError) {
    return existing;
  }
  
  // Create new conversation if it doesn't exist
  const { data: newConv, error: createError } = await supabase
    .from('conversations')
    .insert([{
      user_id: userId,
      business_id: businessId,
      updated_at: new Date().toISOString(),
    }])
    .select(`
      *,
      business:businesses(*)
    `)
    .single();
  
  if (createError) {
    throw new Error(createError.message);
  }
  
  return newConv;
}

// Get messages for a conversation
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data || [];
}

// Send a message in a conversation
export async function sendMessage(
  conversationId: string, 
  senderType: 'user' | 'business', 
  content: string
): Promise<Message> {
  // Get current user to set sender_id
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: user?.id, // ADD sender_id for email notifications
      content: content,
    }])
    .select()
    .single();
  
  if (error) {
    throw new Error(error.message);
  }
  
  // Update conversation's last_message_at
  const { error: updateError } = await supabase
    .from('conversations')
    .update({ 
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId);
  
  return data;
}

// Delete a conversation
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId);
  
  if (error) {
    throw new Error(error.message);
  }
}

// Get total unread message count for a user
export async function getUserUnreadCount(userId: string): Promise<number> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', userId);
  
  if (!conversations || conversations.length === 0) return 0;
  
  let totalUnread = 0;
  
  for (const conv of conversations) {
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conv.id)
      .is('read_at', null)
      .eq('sender_type', 'business');
    
    totalUnread += messages?.length || 0;
  }
  
  return totalUnread;
}

// Get total unread message count for all businesses owned by a user
export async function getBusinessOwnerUnreadCount(ownerId: string): Promise<number> {
  // Get all businesses owned by this user
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', ownerId)
    .is('deleted_at', null);
  
  if (!businesses || businesses.length === 0) return 0;
  
  let totalUnread = 0;
  
  for (const business of businesses) {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('business_id', business.id);
    
    if (conversations) {
      for (const conv of conversations) {
        const { data: messages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .is('read_at', null)
          .eq('sender_type', 'user');
        
        totalUnread += messages?.length || 0;
      }
    }
  }
  
  return totalUnread;
}

// ============================================
// CRON JOB MONITORING
// ============================================

export async function getCronJobStatus(): Promise<{
  success: boolean;
  jobs?: Array<{
    jobid: number;
    schedule: string;
    command: string;
    nodename: string;
    nodeport: number;
    database: string;
    username: string;
    active: boolean;
    jobname: string;
  }>;
  recentRuns?: Array<{
    jobid: number;
    runid: number;
    job_pid: number;
    database: string;
    username: string;
    command: string;
    status: string;
    return_message: string;
    start_time: string;
    end_time: string;
  }>;
  error?: string;
}> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/cron-status`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch cron status');
    }

    return await response.json();
  } catch (error: any) {
    if (isAuthError(error)) {
      handleAuthError(error);
    }
    console.error('Error fetching cron status:', error);
    return { success: false, error: error.message };
  }
}
