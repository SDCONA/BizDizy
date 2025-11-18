import { createClient } from './supabase/client';
import { toast } from 'sonner@2.0.3';

/**
 * Global handler for JWT/Auth errors
 * Call this when you detect an invalid token error
 */
export async function handleAuthError(error?: any) {

  
  const supabase = createClient();
  
  try {
    // Clear Supabase session
    await supabase.auth.signOut();
  } catch (signOutError) {

  }
  
  // Clear all local storage
  try {
    localStorage.removeItem('bizdizy_current_user');
    localStorage.removeItem('sb-' + window.location.hostname + '-auth-token');
    
    // Get all keys that start with 'sb-'
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all Supabase-related keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    

  } catch (clearError) {

  }
  
  toast.error('Your session has expired. Please log in again.');
}

/**
 * Check if an error is an auth-related error
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  const errorCode = error.code || '';
  
  const authErrorPatterns = [
    'JWT',
    'token',
    'Unauthorized',
    'sub claim',
    'does not exist',
    'expired',
    'invalid',
    'Authentication',
    '403',
  ];
  
  return authErrorPatterns.some(pattern => 
    errorMessage.includes(pattern) || errorCode.includes(pattern)
  );
}

/**
 * Wrapper for API calls that handles auth errors automatically
 */
export async function withAuthErrorHandling<T>(
  apiCall: () => Promise<T>,
  defaultValue: T
): Promise<T> {
  try {
    return await apiCall();
  } catch (error: any) {
    if (isAuthError(error)) {
      await handleAuthError(error);
      // Return default value after handling error
      return defaultValue;
    }
    // Re-throw non-auth errors
    throw error;
  }
}
