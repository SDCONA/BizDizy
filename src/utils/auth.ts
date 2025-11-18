import { createClient } from './supabase/client';
import { projectId, publicAnonKey } from './supabase/info';
import { AuthUser, LoginCredentials, SignupCredentials, User } from '../types/user';
import { verifyRecaptcha } from './api';

const supabase = createClient();
const CURRENT_USER_KEY = 'bizdizy_current_user';

// ============================================
// AUTH STATE MANAGEMENT
// ============================================

export function saveCurrentUser(user: AuthUser | null): void {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function getCurrentUser(): AuthUser | null {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.user_metadata?.role === 'admin';
}

// ============================================
// SIGN UP
// ============================================

export async function signup(credentials: SignupCredentials & { recaptchaToken?: string }): Promise<{ success: boolean; error?: string; user?: AuthUser; requiresEmailVerification?: boolean; message?: string }> {
  try {
    console.log('🔵 [FRONTEND] Starting signup process...');
    console.log('   Email:', credentials.email);
    console.log('   Name:', credentials.name);
    console.log('   Phone:', credentials.phone || 'Not provided');
    console.log('   reCAPTCHA token:', credentials.recaptchaToken ? 'Present' : 'Not present');
    
    // Call backend signup endpoint (uses admin API)
    const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-726d4144/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify({
        email: credentials.email,
        username: credentials.name, // Backend expects 'username'
        password: credentials.password,
        phone: credentials.phone || '',
        captchaToken: credentials.recaptchaToken
      })
    });

    console.log('🔵 [FRONTEND] Backend response status:', response.status);
    
    const data = await response.json();
    console.log('🔵 [FRONTEND] Backend response data:', data);

    if (!response.ok || data.error) {
      console.error('❌ [FRONTEND] Signup failed:', data.error);
      return { success: false, error: data.error || 'Signup failed' };
    }

    // Account created successfully - email verification required
    // Return success without logging in (user must verify email first)
    console.log('✅ [FRONTEND] Signup successful! Email verification required.');
    console.log('📧 [FRONTEND] Verification email should be sent to:', credentials.email);
    console.log('⚠️  [FRONTEND] Check browser console AND Supabase logs for email status');
    
    return { 
      success: true, 
      requiresEmailVerification: true,
      message: 'Account created! Please check your email to verify your account before logging in.'
    };
  } catch (error: any) {
    console.error('❌ [FRONTEND] Signup error:', error);
    return { success: false, error: error.message || 'Signup failed' };
  }
}

// ============================================
// LOGIN
// ============================================

export async function login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data.user || !data.session) {
      return { success: false, error: 'No user data returned' };
    }

    const authUser: AuthUser = {
      id: data.user.id,
      email: data.user.email!,
      access_token: data.session.access_token,
      user_metadata: data.user.user_metadata
    };

    saveCurrentUser(authUser);
    
    return { success: true, user: authUser };
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' };
  }
}

// ============================================
// LOGOUT
// ============================================

export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    saveCurrentUser(null);
  } catch (error) {
    // Silently handle logout errors
    // Clear local storage anyway
    saveCurrentUser(null);
  }
}

// ============================================
// SESSION MANAGEMENT
// ============================================

export async function checkSession(): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      // Session doesn't exist - this is normal, just clear and return
      saveCurrentUser(null);
      return null;
    }

    // Verify the user actually exists by making a getUser call
    const { data: userData, error: userError } = await supabase.auth.getUser(data.session.access_token);
    
    if (userError || !userData.user) {
      // User was deleted or token is invalid - clean up silently
      const errorMsg = userError?.message || '';
      
      // Only log if it's not the common "user doesn't exist" error
      // Clear the invalid session silently
      await supabase.auth.signOut().catch(() => {});
      saveCurrentUser(null);
      return null;
    }

    const authUser: AuthUser = {
      id: userData.user.id,
      email: userData.user.email!,
      access_token: data.session.access_token,
      user_metadata: userData.user.user_metadata
    };

    saveCurrentUser(authUser);
    return authUser;
  } catch (error: any) {
    // Clear any invalid session data
    saveCurrentUser(null);
    await supabase.auth.signOut().catch(() => {});
    return null;
  }
}

// ============================================
// PASSWORD RESET
// ============================================

export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the current site URL (works for both local and production)
    const siteUrl = window.location.origin;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Password reset exception:', error);
    return { success: false, error: error.message || 'Password reset failed' };
  }
}

// ============================================
// UPDATE USER METADATA
// ============================================

export async function updateUserMetadata(metadata: Partial<User>): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Update local storage
    const currentUser = getCurrentUser();
    if (currentUser) {
      currentUser.user_metadata = { ...currentUser.user_metadata, ...metadata };
      saveCurrentUser(currentUser);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Update failed' };
  }
}

// ============================================
// DELETE ACCOUNT
// ============================================

export async function deleteAccount(): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'No user logged in' };
    }

    // This would require admin privileges on the server side
    // For now, just sign out
    await logout();
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Account deletion failed' };
  }
}