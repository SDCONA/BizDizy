// Business and Category Types for BizDizy

export interface Category {
  id: string;
  created_at: string;
  name: string;
  group_name: string | null;
  business_count?: number; // Calculated field from API
}

export interface Business {
  id: string;
  created_at: string;
  updated_at: string;
  
  // Basic Info
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  
  // Location
  address: string | null;
  city: string | null;
  zip_code: string | null;
  service_area: string | null;
  
  // Category
  category_id: string | null;
  category?: Category; // Populated via join
  
  // Owner
  owner_id: string;
  
  // Social Media
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  
  // Portfolio
  portfolio: string[]; // Array of image URLs
  
  // Business Hours
  hours: BusinessHours | null;
  
  // Rating
  rating: number;
  review_count?: number; // Calculated field from API
  
  // Status
  is_active: boolean;
  is_featured: boolean;
  deleted_at: string | null;
  
  // Verification
  verified: boolean;
  verified_at: string | null;
}

export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface Review {
  id: string;
  created_at: string;
  updated_at: string;
  
  business_id: string;
  user_id: string | null;
  
  rating: number; // 1-5
  comment: string | null;
  
  // Status
  is_active: boolean;
  flagged: boolean;
  
  // User info (populated via join)
  user_name?: string;
  user_email?: string;
}

export interface Report {
  id: string;
  created_at: string;
  
  reporter_id: string | null;
  report_type: 'business' | 'review';
  target_id: string;
  reason: string;
  description: string | null;
  
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface ContactMessage {
  id: string;
  created_at: string;
  
  name: string;
  email: string;
  subject: string;
  message: string;
  
  status: 'new' | 'read' | 'responded' | 'archived';
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
}

export interface TermsAndPolicy {
  id: string;
  created_at: string;
  updated_at: string;
  
  type: 'terms' | 'privacy';
  content: string;
  version: number;
  is_current: boolean;
  
  created_by: string | null;
}

export interface PolicyNotification {
  id: string;
  created_at: string;
  
  policy_id: string;
  user_id: string;
  
  read_at: string | null;
  acknowledged_at: string | null;
  
  // Populated field
  policy?: TermsAndPolicy;
}

export interface AnalyticsEvent {
  id: string;
  created_at: string;
  
  event_type: string;
  user_id: string | null;
  business_id: string | null;
  metadata: Record<string, any>;
}

export interface Favorite {
  id: string;
  created_at: string;
  
  user_id: string;
  business_id: string;
  
  // Populated field
  business?: Business;
}

// Messaging Types
export interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  
  business_id: string;
  user_id: string;
  
  last_message_at: string | null;
  
  // Populated fields
  business?: Business;
}

export interface Message {
  id: string;
  created_at: string;
  
  conversation_id: string;
  sender_type: 'user' | 'business';
  content: string;
  read_at: string | null;
}

// Search and Filter Types
export interface SearchFilters {
  query?: string;
  category?: string;
  city?: string;
  zip_code?: string;
  min_rating?: number;
  verified_only?: boolean;
  featured_only?: boolean;
}

export interface SearchResult {
  businesses: Business[];
  total: number;
  page: number;
  per_page: number;
}

// Category list for forms
export const CATEGORIES = [
  'Locksmith',
  'Handyman',
  'Driving instructor/school',
  'Taxi/Transfer',
  'Car Rental / Car Sharing',
  'Heavy lifting/Furniture Removal',
  'HVAC',
  'Auto Mechanic',
  'Builder/Contractor',
  'Appliance Repair and Installation',
  'Moving',
  'Delivery/Shopping/Pickup',
  'Accounting/Bookkeeping/Tax Prepare',
  'Fitness Coach/Nutritionist',
  'Car Washing/Detailing/Wrapping',
  'Photographer/Videographer',
  'Junk Removal',
  'Tours/Guides',
  'Lawyer/Attorney',
  'Marketing / Content Creation',
  'Teacher/Tutor',
  'Sewing/Seamstress/Tailoring',
  'Auto Body / Collision Shop',
  'Hair /Nails /Brows /Lips',
  'Windshield Replacement',
  'House Remodeling/Renovation',
  'Pool Services',
  'Electronic / Computer Repair',
  'Wedding Planner /DJ /Event',
  'Babysitter / Nanny',
  'Lawn Care / Tree / Landscaping',
  'Fence Installation & Services',
  'Software/Apps/Website/Design',
  'Uncategorized Section',
  'Pet Care / Dog Walking / Grooming',
  'Pest Control',
  'Electrical Services',
  'Plumbing',
  'Painting',
  'Roofing',
  'Flooring',
  'Cleaning Services',
  'Window Cleaning',
  'Carpet Cleaning',
  'Interior Design',
  'Real Estate',
  'Insurance',
  'Financial Planning',
  'Consulting',
  'Graphic Design',
  'Video Production',
  'Music Lessons',
  'Dance Lessons',
  'Martial Arts',
  'Yoga/Pilates',
  'Massage Therapy',
  'Spa Services',
  'Veterinary',
  'Pet Training',
  'Pet Grooming',
  'Catering',
  'Restaurant',
  'Food Truck',
  'Bakery',
  'Coffee Shop',
  'Bar/Pub',
  'Event Venue',
  'Hotel/Lodging',
  'Travel Agency',
  'Transportation',
  'Storage',
  'Security Services',
  'Home Automation',
  'Solar Installation',
  'Landscaping Design',
  'Snow Removal',
  'Gutter Cleaning',
  'Pressure Washing',
  'Septic Services',
  'Well Services',
  'Appliance Sales',
  'Furniture Sales',
  'Home Decor',
  'Clothing/Retail',
  'Jewelry',
  'Salon',
  'Barber Shop',
  'Tattoo/Piercing',
  'Gym/Fitness Center',
  'Medical Services',
  'Dental Services',
  'Optometry',
  'Pharmacy',
  'Chiropractor',
  'Physical Therapy',
  'Mental Health Services',
  'Daycare',
  'Senior Care',
  'Home Healthcare',
  'Other',
];