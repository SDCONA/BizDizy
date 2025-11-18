// ============================================
// CACHE UTILITY FOR PERFORMANCE OPTIMIZATION
// Implements multi-layer caching strategy:
// 1. Memory cache (fastest, session-only)
// 2. localStorage cache (persistent, with TTL)
// ============================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// In-memory cache for current session
const memoryCache = new Map<string, any>();

const CACHE_KEYS = {
  CATEGORIES: 'bizdizy_cache_categories',
  FEATURED_BUSINESSES: 'bizdizy_cache_featured',
};

// Default TTL: 30 minutes
const DEFAULT_TTL = 30 * 60 * 1000;

// Category cache TTL: 24 hours (categories rarely change)
const CATEGORY_TTL = 24 * 60 * 60 * 1000;

/**
 * Get data from cache (checks memory first, then localStorage)
 */
export function getFromCache<T>(key: string): T | null {
  // 1. Check memory cache first (fastest)
  if (memoryCache.has(key)) {
    return memoryCache.get(key) as T;
  }

  // 2. Check localStorage cache
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cacheItem: CacheItem<T> = JSON.parse(stored);
    const now = Date.now();

    // Check if cache is still valid
    if (now - cacheItem.timestamp < cacheItem.ttl) {
      // Restore to memory cache
      memoryCache.set(key, cacheItem.data);
      return cacheItem.data;
    } else {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }
  } catch (error) {

    return null;
  }
}

/**
 * Save data to cache (both memory and localStorage)
 */
export function saveToCache<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  try {
    // 1. Save to memory cache
    memoryCache.set(key, data);

    // 2. Save to localStorage cache
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  } catch (error) {

  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  memoryCache.delete(key);
  localStorage.removeItem(key);
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  memoryCache.clear();
  
  // Clear all bizdizy cache keys from localStorage
  Object.values(CACHE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

/**
 * Check if cache entry is valid
 */
export function isCacheValid(key: string): boolean {
  return getFromCache(key) !== null;
}

// ============================================
// CATEGORY-SPECIFIC CACHE FUNCTIONS
// ============================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

/**
 * Get cached categories
 */
export function getCachedCategories(): Category[] | null {
  return getFromCache<Category[]>(CACHE_KEYS.CATEGORIES);
}

/**
 * Save categories to cache (24 hour TTL)
 */
export function cacheCategories(categories: Category[]): void {
  saveToCache(CACHE_KEYS.CATEGORIES, categories, CATEGORY_TTL);
}

/**
 * Clear category cache (use when categories are updated)
 */
export function clearCategoryCache(): void {
  clearCache(CACHE_KEYS.CATEGORIES);
}

// ============================================
// FEATURED BUSINESSES CACHE
// ============================================

/**
 * Get cached featured businesses
 */
export function getCachedFeaturedBusinesses(): any[] | null {
  return getFromCache<any[]>(CACHE_KEYS.FEATURED_BUSINESSES);
}

/**
 * Save featured businesses to cache (30 min TTL)
 */
export function cacheFeaturedBusinesses(businesses: any[]): void {
  saveToCache(CACHE_KEYS.FEATURED_BUSINESSES, businesses, DEFAULT_TTL);
}

/**
 * Clear featured businesses cache
 */
export function clearFeaturedCache(): void {
  clearCache(CACHE_KEYS.FEATURED_BUSINESSES);
}

// ============================================
// CACHE STATISTICS (for debugging)
// ============================================

export function getCacheStats() {
  return {
    memorySize: memoryCache.size,
    categories: isCacheValid(CACHE_KEYS.CATEGORIES) ? 'HIT' : 'MISS',
    featured: isCacheValid(CACHE_KEYS.FEATURED_BUSINESSES) ? 'HIT' : 'MISS',
  };
}
