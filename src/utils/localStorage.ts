import { Business } from "../types/business";
import * as api from "./api";

// ============================================
// IMPORTANT: This file has been migrated to use Supabase backend
// instead of browser localStorage for better data persistence
// and multi-device sync when logged in.
// ============================================

const STORAGE_KEYS = {
  BUSINESSES: "bizdizy_businesses", // Legacy - not used
  FAVORITES: "bizdizy_favorites", // Now stored in Supabase
  RECENT_SEARCHES: "bizdizy_recent_searches", // Now stored in Supabase
  USER_BUSINESS: "bizdizy_user_business", // Legacy - not used
};

export interface SearchHistory {
  service: string;
  location: string;
  timestamp: number;
}

// ============================================
// BUSINESS OPERATIONS (LEGACY - NOT USED)
// These are kept for backwards compatibility but
// businesses are now managed entirely in Supabase
// ============================================

export const saveBusinesses = (businesses: Business[]) => {
  // No-op - businesses are managed in Supabase
};

export const loadBusinesses = (): Business[] => {
  // No-op - businesses are fetched from Supabase via API
  return [];
};

export const addBusiness = (business: Business) => {
  // No-op - use api.createBusiness() instead
};

export const updateBusiness = (updatedBusiness: Business) => {
  // No-op - use api.updateBusiness() instead
};

export const deleteBusiness = (businessId: string) => {
  // No-op - use api.deleteBusiness() instead
};

// ============================================
// FAVORITES OPERATIONS (MIGRATED TO SUPABASE)
// ============================================

export const saveFavorites = async (favorites: string[]) => {
  // This function is no longer needed - favorites are managed via API
};

export const loadFavorites = async (): Promise<string[]> => {
  try {
    // Try to load from Supabase first
    const favorites = await api.getFavorites();
    return favorites;
  } catch (error) {
    // Fallback to localStorage for backwards compatibility
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return data ? JSON.parse(data) : [];
    } catch (localError) {
      return [];
    }
  }
};

export const toggleFavorite = async (businessId: string): Promise<boolean> => {
  try {
    // Get current favorites from Supabase
    const favorites = await api.getFavorites();
    const isFavorited = favorites.includes(businessId);
    
    if (isFavorited) {
      // Remove from favorites
      await api.removeFavorite(businessId);
      return false;
    } else {
      // Add to favorites
      await api.addFavorite(businessId);
      return true;
    }
  } catch (error) {
    // Fallback to localStorage for backwards compatibility
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      const favorites = data ? JSON.parse(data) : [];
      const index = favorites.indexOf(businessId);
      
      if (index > -1) {
        favorites.splice(index, 1);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        return false;
      } else {
        favorites.push(businessId);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        return true;
      }
    } catch (localError) {
      throw error; // Re-throw original error
    }
  }
};

// ============================================
// RECENT SEARCHES OPERATIONS (MIGRATED TO SUPABASE)
// ============================================

export const saveRecentSearch = async (service: string, location: string) => {
  try {
    // Save to Supabase via API
    await api.addRecentSearch(service, location);
  } catch (error) {
    // Fallback to localStorage for backwards compatibility
    try {
      const searches = await loadRecentSearchesFromLocalStorage();
      const newSearch: SearchHistory = {
        service,
        location,
        timestamp: Date.now(),
      };
      
      // Remove duplicates and keep only last 5
      const filtered = searches.filter(
        (s) => !(s.service === service && s.location === location)
      );
      filtered.unshift(newSearch);
      
      const limited = filtered.slice(0, 5);
      localStorage.setItem(STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(limited));
    } catch (localError) {
      // Silently handle errors
    }
  }
};

export const loadRecentSearches = async (): Promise<SearchHistory[]> => {
  try {
    // Try to load from Supabase first
    const searches = await api.getRecentSearches();
    return searches;
  } catch (error) {
    // Fallback to localStorage for backwards compatibility
    return loadRecentSearchesFromLocalStorage();
  }
};

// Helper function to load from localStorage
const loadRecentSearchesFromLocalStorage = (): SearchHistory[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_SEARCHES);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

// ============================================
// USER BUSINESS OPERATIONS (LEGACY - NOT USED)
// User's businesses are now fetched from Supabase
// ============================================

export const saveUserBusiness = (business: Business | null) => {
  // No-op - user businesses are managed in Supabase
};

export const loadUserBusiness = (): Business | null => {
  // No-op - use api.getBusinessesByOwner() instead
  return null;
};
