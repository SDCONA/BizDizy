-- ============================================
-- DATABASE PERFORMANCE INDEXES FOR BIZDIZY
-- Optimized for 10,000+ users
-- ============================================

-- These indexes dramatically improve query performance by allowing
-- the database to quickly locate rows without scanning entire tables.

-- ============================================
-- BUSINESSES TABLE INDEXES
-- ============================================

-- Index on category_id (for filtering businesses by category)
-- Used in: Search by category, category page listings
CREATE INDEX IF NOT EXISTS idx_businesses_category_id 
ON businesses(category_id) 
WHERE is_active = true AND deleted_at IS NULL;

-- Index on city (for location-based searches)
-- Used in: "Businesses near me" searches
CREATE INDEX IF NOT EXISTS idx_businesses_city 
ON businesses(city) 
WHERE is_active = true AND deleted_at IS NULL;

-- Index on zip_code (for precise location searches)
-- Used in: Zip code searches
CREATE INDEX IF NOT EXISTS idx_businesses_zip_code 
ON businesses(zip_code) 
WHERE is_active = true AND deleted_at IS NULL;

-- Index on owner_id (for "my businesses" queries)
-- Used in: User dashboard, business management
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id 
ON businesses(owner_id);

-- Index on is_active and deleted_at (for soft delete filtering)
-- Used in: All business queries
CREATE INDEX IF NOT EXISTS idx_businesses_active_status 
ON businesses(is_active, deleted_at);

-- Composite index for location + category searches
-- Used in: "Plumbers in Miami" type searches
CREATE INDEX IF NOT EXISTS idx_businesses_location_category 
ON businesses(city, category_id) 
WHERE is_active = true AND deleted_at IS NULL;

-- Full-text search index on name and description
-- Used in: Search bar queries
CREATE INDEX IF NOT EXISTS idx_businesses_search 
ON businesses USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')))
WHERE is_active = true AND deleted_at IS NULL;

-- ============================================
-- REVIEWS TABLE INDEXES
-- ============================================

-- Index on business_id (for fetching all reviews for a business)
-- Used in: Business profile page
CREATE INDEX IF NOT EXISTS idx_reviews_business_id 
ON reviews(business_id) 
WHERE deleted_at IS NULL;

-- Index on user_id (for fetching user's reviews)
-- Used in: User profile, "my reviews"
CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
ON reviews(user_id) 
WHERE deleted_at IS NULL;

-- Composite index for business reviews sorted by date
-- Used in: Business profile reviews section
CREATE INDEX IF NOT EXISTS idx_reviews_business_created 
ON reviews(business_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- Index on rating (for filtering by star rating)
-- Used in: "Show only 5-star reviews"
CREATE INDEX IF NOT EXISTS idx_reviews_rating 
ON reviews(business_id, rating) 
WHERE deleted_at IS NULL;

-- ============================================
-- FAVORITES TABLE INDEXES
-- ============================================

-- Index on user_id (for fetching user's favorites)
-- Used in: Favorites page, checking if business is favorited
CREATE INDEX IF NOT EXISTS idx_favorites_user_id 
ON favorites(user_id);

-- Index on business_id (for favorite counts per business)
-- Used in: Business card "X favorites"
CREATE INDEX IF NOT EXISTS idx_favorites_business_id 
ON favorites(business_id);

-- Composite unique index for user-business pair
-- Prevents duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_business 
ON favorites(user_id, business_id);

-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================

-- Index on conversation_id (for fetching messages in a conversation)
-- Used in: Chat window
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
ON messages(conversation_id, created_at DESC);

-- Index on sender_id (for sent messages)
-- Used in: User message history
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
ON messages(sender_id);

-- ============================================
-- CONVERSATIONS TABLE INDEXES
-- ============================================

-- Index on user_id (for user's conversations)
-- Used in: User inbox
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON conversations(user_id, updated_at DESC);

-- Index on business_id (for business conversations)
-- Used in: Business inbox
CREATE INDEX IF NOT EXISTS idx_conversations_business_id 
ON conversations(business_id, updated_at DESC);

-- Index on last_message_at (for sorting conversations)
-- Used in: Inbox sorted by recent activity
CREATE INDEX IF NOT EXISTS idx_conversations_last_message 
ON conversations(last_message_at DESC NULLS LAST);

-- ============================================
-- CATEGORIES TABLE INDEXES
-- ============================================

-- Index on name (for alphabetical sorting)
-- Used in: Category dropdown, category grid
CREATE INDEX IF NOT EXISTS idx_categories_name 
ON categories(name);

-- ============================================
-- REPORTS TABLE INDEXES
-- ============================================

-- Index on reported_business_id (for business reports)
-- Used in: Admin dashboard
CREATE INDEX IF NOT EXISTS idx_reports_business_id 
ON reports(reported_business_id);

-- Index on reported_review_id (for review reports)
-- Used in: Admin dashboard
CREATE INDEX IF NOT EXISTS idx_reports_review_id 
ON reports(reported_review_id);

-- Index on status (for filtering pending/resolved reports)
-- Used in: Admin dashboard
CREATE INDEX IF NOT EXISTS idx_reports_status 
ON reports(status, created_at DESC);

-- Index on reporter_id (for tracking user reports)
-- Used in: Abuse prevention
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id 
ON reports(reporter_id);

-- ============================================
-- CONTACT_MESSAGES TABLE INDEXES
-- ============================================

-- Index on status (for filtering read/unread)
-- Used in: Admin contact management
CREATE INDEX IF NOT EXISTS idx_contact_messages_status 
ON contact_messages(status, created_at DESC);

-- Index on email (for finding messages from a user)
-- Used in: Contact history lookup
CREATE INDEX IF NOT EXISTS idx_contact_messages_email 
ON contact_messages(email);

-- ============================================
-- RECENT_SEARCHES TABLE INDEXES
-- ============================================

-- Index on user_id (for user's search history)
-- Used in: Search suggestions
CREATE INDEX IF NOT EXISTS idx_recent_searches_user_id 
ON recent_searches(user_id, created_at DESC);

-- ============================================
-- VERIFY INDEXES
-- ============================================

-- Run this query to verify all indexes were created:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- ============================================
-- PERFORMANCE MONITORING
-- ============================================

-- To check index usage statistics:
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   idx_tup_read as tuples_read,
--   idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- To find unused indexes (consider removing if idx_scan is 0):
-- SELECT 
--   schemaname,
--   tablename,
--   indexname
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND idx_scan = 0
--   AND indexname NOT LIKE '%_pkey';

-- ============================================
-- MAINTENANCE
-- ============================================

-- Analyze tables to update statistics (run periodically)
-- This helps the query planner make better decisions
ANALYZE businesses;
ANALYZE reviews;
ANALYZE favorites;
ANALYZE messages;
ANALYZE conversations;
ANALYZE categories;
ANALYZE reports;
ANALYZE contact_messages;
ANALYZE recent_searches;

-- Vacuum tables to reclaim space (run periodically)
-- VACUUM ANALYZE businesses;
-- VACUUM ANALYZE reviews;
-- VACUUM ANALYZE favorites;

-- Note: Supabase typically handles VACUUM automatically,
-- but you can run it manually if needed.

COMMIT;
