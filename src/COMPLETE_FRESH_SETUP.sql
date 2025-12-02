-- ============================================
-- BIZDIZY COMPLETE DATABASE SETUP FROM SCRATCH
-- ============================================
-- Run this ONCE in Supabase SQL Editor
-- This will DROP existing tables and recreate everything

-- ============================================
-- 1. DROP ALL EXISTING TABLES (CASCADE)
-- ============================================

DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS policy_notifications CASCADE;
DROP TABLE IF EXISTS terms_and_policies CASCADE;
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
-- Do NOT drop categories - we'll just update it

-- ============================================
-- 2. CATEGORIES TABLE SETUP
-- ============================================

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT UNIQUE NOT NULL,
  group_name TEXT
);

-- Enable RLS on categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view categories" ON categories;
DROP POLICY IF EXISTS "Enable read access for all users" ON categories;
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_public_read" ON categories;

-- Allow everyone to read categories
CREATE POLICY "categories_public_read"
  ON categories
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================
-- 3. BUSINESSES TABLE
-- ============================================

CREATE TABLE businesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Info
  name TEXT NOT NULL,
  description TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  
  -- Privacy Settings
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  
  -- Location
  address TEXT,
  city TEXT,
  zip_code TEXT,
  service_area TEXT,
  
  -- Category
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  
  -- Owner
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Social Media
  facebook_url TEXT,
  instagram_url TEXT,
  twitter_url TEXT,
  linkedin_url TEXT,
  
  -- Portfolio (JSON array of image URLs)
  portfolio JSONB DEFAULT '[]'::jsonb,
  
  -- Business Hours (JSON object)
  hours JSONB,
  
  -- Rating (calculated from reviews)
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  
  -- Verification
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_rating ON businesses(rating DESC);
CREATE INDEX idx_businesses_created ON businesses(created_at DESC);
CREATE INDEX idx_businesses_deleted ON businesses(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
CREATE POLICY "businesses_public_read"
  ON businesses
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "businesses_owner_all"
  ON businesses
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ============================================
-- 4. REVIEWS TABLE
-- ============================================

CREATE TABLE reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  flagged BOOLEAN DEFAULT false,
  
  UNIQUE(business_id, user_id)
);

-- Indexes
CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reviews
CREATE POLICY "reviews_public_read"
  ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "reviews_authenticated_insert"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_owner_update"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reviews_owner_delete"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 5. CONVERSATIONS TABLE
-- ============================================

CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, business_id)
);

-- Indexes
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_business ON conversations(business_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "conversations_participants_all"
  ON conversations
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
  )
  WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id = business_id)
  );

-- ============================================
-- 6. MESSAGES TABLE
-- ============================================

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'business')),
  content TEXT NOT NULL,
  
  read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "messages_conversation_participants"
  ON messages
  FOR ALL
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user_id = auth.uid() OR 
      business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE user_id = auth.uid() OR 
      business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    )
  );

-- ============================================
-- 7. REPORTS TABLE
-- ============================================

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('business', 'review')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_reports_type_target ON reports(report_type, target_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at DESC);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "reports_authenticated_insert"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "reports_reporter_read"
  ON reports
  FOR SELECT
  TO authenticated
  USING (auth.uid() = reporter_id);

-- ============================================
-- 8. CONTACT MESSAGES TABLE
-- ============================================

CREATE TABLE contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'archived')),
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_contact_status ON contact_messages(status);
CREATE INDEX idx_contact_created ON contact_messages(created_at DESC);

-- Enable RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contact messages
CREATE POLICY "contact_messages_public_insert"
  ON contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ============================================
-- 9. TERMS AND POLICIES TABLE
-- ============================================

CREATE TABLE terms_and_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  type TEXT NOT NULL CHECK (type IN ('terms', 'privacy')),
  content TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(type, version)
);

-- Indexes
CREATE INDEX idx_terms_type_current ON terms_and_policies(type, is_current);

-- Enable RLS
ALTER TABLE terms_and_policies ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read current terms
CREATE POLICY "terms_public_read"
  ON terms_and_policies
  FOR SELECT
  TO anon, authenticated
  USING (is_current = true);

-- ============================================
-- 10. POLICY NOTIFICATIONS TABLE
-- ============================================

CREATE TABLE policy_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  policy_id UUID NOT NULL REFERENCES terms_and_policies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  
  UNIQUE(policy_id, user_id)
);

-- Indexes
CREATE INDEX idx_policy_notif_user ON policy_notifications(user_id);
CREATE INDEX idx_policy_notif_policy ON policy_notifications(policy_id);

-- Enable RLS
ALTER TABLE policy_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "policy_notifications_user_all"
  ON policy_notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 11. ANALYTICS EVENTS TABLE
-- ============================================

CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_analytics_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_business ON analytics_events(business_id);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own events
CREATE POLICY "analytics_authenticated_insert"
  ON analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- 12. FAVORITES TABLE (for user favorites)
-- ============================================

CREATE TABLE favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  
  UNIQUE(user_id, business_id)
);

-- Indexes
CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_business ON favorites(business_id);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own favorites
CREATE POLICY "favorites_user_all"
  ON favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 13. INSERT INITIAL CATEGORIES DATA
-- ============================================

INSERT INTO categories (name, group_name) VALUES
  ('Locksmith', 'Automotive'),
  ('Auto Mechanic', 'Automotive'),
  ('Auto Body / Collision Shop', 'Automotive'),
  ('Windshield Replacement', 'Automotive'),
  ('Roadside Assistance', 'Automotive'),
  ('Car Rental / Car Sharing', 'Automotive'),
  ('Taxi/Transfer', 'Automotive'),
  ('Driving instructor/school', 'Automotive'),
  ('Car Washing / Detailing / Wrapping', 'Automotive'),
  ('Tow Truck / Towing', 'Automotive'),
  ('Vehicle Inspection / Emissions', 'Automotive'),
  ('Motorcycle Repair', 'Automotive'),
  ('Bicycle Repair', 'Automotive'),
  ('Handyman', 'Home Services'),
  ('Builder / Contractor', 'Home Services'),
  ('House Remodeling / Renovation', 'Home Services'),
  ('Fence Installation & Services', 'Home Services'),
  ('Pool Services', 'Home Services'),
  ('Lawn Care / Tree / Landscaping', 'Home Services'),
  ('Pest Control', 'Home Services'),
  ('HVAC', 'Home Services'),
  ('Plumber', 'Home Services'),
  ('Electrician', 'Home Services'),
  ('Housekeeper', 'Home Services'),
  ('Painter', 'Home Services'),
  ('Plasterer', 'Home Services'),
  ('Decorator', 'Home Services'),
  ('Carpenter', 'Home Services'),
  ('Roofing', 'Home Services'),
  ('Flooring (Tile, Hardwood, Carpet)', 'Home Services'),
  ('Windows / Doors Installation', 'Home Services'),
  ('Heavy Lifting / Furniture Removal', 'Moving & Delivery'),
  ('Moving', 'Moving & Delivery'),
  ('Delivery / Shopping / Pickup', 'Moving & Delivery'),
  ('Junk Removal', 'Moving & Delivery'),
  ('Courier / Parcel Delivery', 'Moving & Delivery'),
  ('Long-distance Freight / Trucking', 'Moving & Delivery'),
  ('Electronic / Computer Repair', 'Technology'),
  ('Phone / Tablet Repair', 'Technology'),
  ('Software / Apps / Website / Design', 'Technology'),
  ('AI Development & Integration', 'Technology'),
  ('Smart Home Installation (IoT, Cameras, Security)', 'Technology'),
  ('Security Systems / CCTV Installation', 'Technology'),
  ('Accounting / Bookkeeping / Tax Prepare', 'Professional Services'),
  ('Lawyer / Attorney', 'Professional Services'),
  ('Notary', 'Professional Services'),
  ('Insurance Services (Auto, Home, Health)', 'Professional Services'),
  ('Marketing / Content Creation', 'Professional Services'),
  ('Business Consulting / Coaching', 'Professional Services'),
  ('HR & Recruiting', 'Professional Services'),
  ('Fitness Coach / Nutritionist', 'Health & Wellness'),
  ('Massage Therapist', 'Health & Wellness'),
  ('Spa / Wellness', 'Health & Wellness'),
  ('Doctor / Nurse / Medical Services', 'Health & Wellness'),
  ('Dentist', 'Health & Wellness'),
  ('Optician / Eye Care', 'Health & Wellness'),
  ('Mental Health / Therapist', 'Health & Wellness'),
  ('Photographer / Videographer', 'Events & Entertainment'),
  ('Wedding Planner / DJ / Event', 'Events & Entertainment'),
  ('Tours / Guides', 'Events & Entertainment'),
  ('Travel Agency', 'Events & Entertainment'),
  ('Party Equipment Rental', 'Events & Entertainment'),
  ('Musician / Band / Performer', 'Events & Entertainment'),
  ('Catering / Cook', 'Personal Services'),
  ('Babysitter / Nanny', 'Personal Services'),
  ('Pet Care / Dog Walking / Grooming', 'Personal Services'),
  ('Hair / Nails / Brows / Lips', 'Personal Services'),
  ('Sewing / Seamstress / Tailoring', 'Personal Services'),
  ('Teacher / Tutor', 'Education'),
  ('Music / Art Teacher', 'Education'),
  ('Language Courses', 'Education'),
  ('Real Estate Agent / Realtor', 'Real Estate'),
  ('Property Management', 'Real Estate'),
  ('Home Staging', 'Real Estate'),
  ('Carpet Cleaning', 'Cleaning Services'),
  ('Upholstery Cleaning', 'Cleaning Services'),
  ('Window Cleaning', 'Cleaning Services'),
  ('Gutter Cleaning', 'Cleaning Services'),
  ('Pressure Washing', 'Cleaning Services'),
  ('Uncategorized Section', NULL)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 14. CREATE FUNCTIONS FOR TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reviews_updated_at ON reviews;
CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_terms_updated_at ON terms_and_policies;
CREATE TRIGGER update_terms_updated_at
  BEFORE UPDATE ON terms_and_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- You can now use your BizDizy app!
