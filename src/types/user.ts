// User Types for BizDizy

export interface User {
  id: string;
  email: string;
  created_at: string;
  
  // User metadata
  name?: string;
  phone?: string;
  avatar_url?: string;
  
  // Role
  role: 'user' | 'admin';
  
  // Preferences
  email_notifications?: boolean;
  
  // Status
  is_active?: boolean;
  last_login?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  access_token: string;
  user_metadata?: {
    name?: string;
    phone?: string;
    avatar_url?: string;
    role?: 'user' | 'admin';
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  name: string;
  phone?: string;
}
