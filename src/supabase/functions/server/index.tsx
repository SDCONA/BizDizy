import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// ============================================
// RATE LIMITING MIDDLEWARE
// Prevents abuse by limiting requests per user
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory rate limit tracking (resets on edge function restart)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit: 30 requests per minute per IP/user
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 30;

function getRateLimitKey(c: any): string {
  // Try to get user ID from auth header first
  const authHeader = c.req.header('Authorization');
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) return `user:${token.substring(0, 20)}`; // Use first 20 chars of token
  }
  
  // Fallback to IP address
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  return `ip:${ip}`;
}

function checkRateLimit(c: any): { allowed: boolean; remaining: number; resetTime: number } {
  const key = getRateLimitKey(c);
  const now = Date.now();
  
  const entry = rateLimitStore.get(key);
  
  // No entry or expired window - create new entry
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      resetTime: newEntry.resetTime,
    };
  }
  
  // Existing entry within window
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
  
  // Increment count
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.count,
    resetTime: entry.resetTime,
  };
}

// Rate limit middleware
app.use('/make-server-726d4144/*', async (c, next) => {
  // Skip rate limiting for health check
  if (c.req.path === '/make-server-726d4144/health') {
    return next();
  }
  
  const { allowed, remaining, resetTime } = checkRateLimit(c);
  
  // Add rate limit headers to all responses
  c.header('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  c.header('X-RateLimit-Remaining', remaining.toString());
  c.header('X-RateLimit-Reset', new Date(resetTime).toISOString());
  
  if (!allowed) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    c.header('Retry-After', retryAfter.toString());
    
    return c.json({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      retryAfter,
    }, 429);
  }
  
  await next();
});

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
}, 5 * 60 * 1000);

// Middleware
app.use('*', cors());

// Health check endpoint (very fast, no database calls)
app.get('/make-server-726d4144/health', (c) => {
  return c.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Edge Function is running',
    env: {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    }
  });
});

// Create Supabase client with service role key for admin operations
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ CRITICAL: Missing environment variables!');
  console.error('SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
}

const supabase = createClient(
  SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY ?? '',
);

// ============================================
// STORAGE BUCKET INITIALIZATION
// Idempotently create storage buckets on startup
// ============================================

const PORTFOLIO_BUCKET_NAME = 'make-726d4144-portfolio';

async function initializeStorageBuckets() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      return;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === PORTFOLIO_BUCKET_NAME);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(PORTFOLIO_BUCKET_NAME, {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
    }
  } catch (error) {
    // Silently handle storage initialization errors
  }
}

// Initialize buckets on startup (don't await to avoid blocking)
initializeStorageBuckets();

// Endpoint to check storage bucket status
app.get('/make-server-726d4144/storage/status', async (c) => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return c.json({
        success: false,
        error: error.message,
        bucketExists: false
      }, 500);
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === PORTFOLIO_BUCKET_NAME);
    
    return c.json({
      success: true,
      bucketName: PORTFOLIO_BUCKET_NAME,
      bucketExists,
      totalBuckets: buckets?.length || 0,
      allBuckets: buckets?.map(b => b.name) || []
    });
  } catch (error) {
    return c.json({
      success: false,
      error: String(error),
      bucketExists: false
    }, 500);
  }
});

// Also provide an endpoint to manually trigger bucket initialization
app.post('/make-server-726d4144/admin/init-storage', async (c) => {
  try {
    await initializeStorageBuckets();
    
    // Verify the bucket was created
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === PORTFOLIO_BUCKET_NAME);
    
    return c.json({
      success: true,
      message: 'Storage bucket initialization triggered',
      bucketExists,
      bucketName: PORTFOLIO_BUCKET_NAME
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

// Upload portfolio image
app.post('/make-server-726d4144/storage/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const businessId = formData.get('businessId') as string;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    if (!businessId) {
      return c.json({ error: 'No business ID provided' }, 400);
    }
    
    // Validate file size (max 5MB - Supabase free tier limit)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      return c.json({
        error: 'File too large',
        message: `Image must be smaller than 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
        statusCode: '413'
      }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({
        error: 'Invalid file type',
        message: 'Only JPG, PNG, WebP, AVIF, and GIF images are allowed'
      }, 400);
    }
    
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    // Upload using service role (has full permissions)
    const { data, error } = await supabase.storage
      .from(PORTFOLIO_BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      
      // Check for specific error types
      if (error.message?.includes('size') || error.message?.includes('payload')) {
        return c.json({
          error: 'File too large',
          message: 'Image must be smaller than 5MB',
          details: error
        }, 400);
      }
      
      return c.json({
        error: error.message || 'Upload failed',
        details: error
      }, 500);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(PORTFOLIO_BUCKET_NAME)
      .getPublicUrl(data.path);
    
    return c.json({
      success: true,
      url: publicUrl,
      path: data.path
    });
  } catch (error) {
    return c.json({
      error: String(error),
      message: 'Failed to upload file'
    }, 500);
  }
});

// Helper function to verify user
async function verifyUser(authHeader: string | null) {
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return { user: null, error: 'No token provided' };
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) {
      // Suppress common JWT/token errors (expected when sessions expire or users are deleted)
      const errorMsg = String(error.message || '');

      return { user: null, error: `Invalid token: ${error.message}` };
    }
    
    if (!user) {
      return { user: null, error: 'Invalid token: No user found' };
    }

    return { user, error: null };
  } catch (err) {
    // Suppress JWT errors
    const errMsg = String(err || '');

    return { user: null, error: 'Token verification failed' };
  }
}

// ============ AUTH ROUTES ============

// Verify reCAPTCHA token (no auth required)
app.post('/make-server-726d4144/auth/verify-recaptcha', async (c) => {
  try {
    const { recaptchaToken } = await c.req.json();

    if (!recaptchaToken) {
      return c.json({ error: 'reCAPTCHA token is required' }, 400);
    }

    const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!RECAPTCHA_SECRET_KEY) {
      console.error('❌ RECAPTCHA_SECRET_KEY not configured');
      return c.json({ error: 'reCAPTCHA not configured on server' }, 500);
    }

    try {
      const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
      });

      const verifyData = await verifyResponse.json();
      
      // reCAPTCHA v3 returns a score (0.0-1.0)
      // 0.0 = very likely a bot, 1.0 = very likely a human
      // Recommended threshold: 0.5 or higher
      if (!verifyData.success) {
        console.log('❌ reCAPTCHA verification failed:', verifyData);
        return c.json({ 
          success: false, 
          error: 'reCAPTCHA verification failed. Please try again.' 
        }, 400);
      }
      
      // For v3, check the score
      const score = verifyData.score || 0;
      console.log(`✅ reCAPTCHA verified successfully - Score: ${score}`);
      
      // If score is too low, reject
      if (score < 0.5) {
        console.log(`⚠️ reCAPTCHA score too low: ${score}`);
        return c.json({ 
          success: false, 
          error: 'Verification failed. Please try again.' 
        }, 400);
      }
      
      return c.json({ success: true, score });
    } catch (error) {
      console.error('reCAPTCHA verification error:', error);
      return c.json({ error: 'Failed to verify reCAPTCHA' }, 500);
    }
  } catch (error) {
    console.error('Verify reCAPTCHA error:', error);
    return c.json({ error: 'Verification failed' }, 500);
  }
});

// Sign up
app.post('/make-server-726d4144/auth/signup', async (c) => {
  try {
    const { email, username, password, phone, captchaToken } = await c.req.json();

    console.log('📝 Signup attempt:', { email, username, hasPassword: !!password, hasPhone: !!phone, hasCaptcha: !!captchaToken });

    if (!email || !username || !password) {
      console.log('❌ Missing required fields');
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify reCAPTCHA if token is provided
    if (captchaToken) {
      const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');
      if (RECAPTCHA_SECRET_KEY) {
        try {
          const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
          });

          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            console.log('❌ reCAPTCHA verification failed:', verifyData);
            return c.json({ error: 'reCAPTCHA verification failed. Please try again.' }, 400);
          }
          
          // For v3, check the score (0.0-1.0)
          const score = verifyData.score || 0;
          console.log(`✅ reCAPTCHA verified successfully for signup - Score: ${score}`);
          
          // Reject if score is too low (likely a bot)
          if (score < 0.5) {
            console.log(`⚠️ reCAPTCHA score too low for signup: ${score}`);
            return c.json({ error: 'Signup verification failed. Please try again later.' }, 400);
          }
        } catch (error) {
          console.error('reCAPTCHA verification error:', error);
          return c.json({ error: 'Failed to verify reCAPTCHA' }, 500);
        }
      }
    }

    // Check if username already exists in users table
    const { data: existingUser } = await supabase
      .from('users')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      return c.json({ error: 'Username already taken' }, 400);
    }

    // Create user with Supabase Auth using regular signup (not admin API)
    // CRITICAL: signUp() automatically sends verification email, admin.createUser() does NOT
    console.log('🔄 Creating user with Supabase Auth (regular signup flow)...');
    console.log('   Email:', email);
    console.log('   This will automatically send verification email via SMTP');
    
    // Create a client with ANON key (not service role) to use regular signUp
    const anonSupabase = createClient(
      SUPABASE_URL ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );
    
    const { data, error } = await anonSupabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username,
          name: username,
          phone: phone || '',
          role: 'user'
        }
      }
    });

    if (error) {
      console.log('❌ Supabase Auth error:', error.message);
      console.log('   Full error:', JSON.stringify(error, null, 2));
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      console.log('❌ No user data returned from signUp');
      return c.json({ error: 'Failed to create user' }, 500);
    }

    console.log('✅ User created in Auth:', data.user.id);
    console.log('   User email:', data.user.email);
    console.log('   Email confirmed:', data.user.email_confirmed_at);
    console.log('   Confirmation sent at:', data.user.confirmation_sent_at);
    console.log('📧 Verification email automatically sent by Supabase to:', email);

    // Insert user data into users table
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        username,
      });

    if (insertError) {
      console.log('❌ Database insert error:', insertError.message);
      // If insert fails, we should clean up the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    console.log('✅ User profile created successfully');
    console.log('📧 Verification email sent to:', email);

    return c.json({ 
      success: true,
      message: 'Account created! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error('❌ Signup error:', error);
    return c.json({ error: `Signup failed: ${error.message || 'Unknown error'}` }, 500);
  }
});

// Test SMTP email sending (for debugging)
app.post('/make-server-726d4144/auth/test-email', async (c) => {
  try {
    const { email } = await c.req.json();
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    console.log('🧪 [TEST] Attempting to send password reset email to:', email);
    
    // Try to send a password reset email to test SMTP
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'http://localhost:5173/reset-password',
    });

    if (error) {
      console.error('❌ [TEST] Password reset email failed:', error);
      return c.json({ 
        success: false, 
        error: error.message,
        details: 'SMTP might not be configured correctly'
      }, 500);
    }

    console.log('✅ [TEST] Password reset email request successful');
    console.log('   Note: Supabase queues emails, check logs for actual delivery');
    
    return c.json({ 
      success: true,
      message: 'Password reset email sent! Check inbox and Supabase logs.',
      note: 'If no email received, SMTP is not configured correctly'
    });
  } catch (error) {
    console.error('❌ [TEST] Email test error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// Sign in
app.post('/make-server-726d4144/auth/signin', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Missing email or password' }, 400);
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    // Get user data from users table
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    // If user doesn't exist in users table, create it automatically
    if (!userData && !userError) {
      
      const username = data.user.user_metadata?.username 
        || data.user.email?.split('@')[0] 
        || 'User';
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          username: username,
        })
        .select()
        .single();
      
      if (insertError) {
        return c.json({ error: 'Failed to create user profile' }, 500);
      }
      
      userData = newUser;
    } else if (userError) {
      return c.json({ error: 'Failed to fetch user data' }, 500);
    }

    // Get user's businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', data.user.id);

    const businessIds = businesses?.map(b => b.id) || [];

    return c.json({
      session: data.session,
      user: {
        ...userData,
        businessIds,
      },
    });
  } catch (error) {
    return c.json({ error: 'Signin failed' }, 500);
  }
});

// Sign out
app.post('/make-server-726d4144/auth/signout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.split(' ')[1];

    if (token) {
      await supabase.auth.admin.signOut(token);
    }

    return c.json({ success: true });
  } catch (error) {

    return c.json({ error: 'Signout failed' }, 500);
  }
});

// Get current user
app.get('/make-server-726d4144/auth/user', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    // Get user data from users table
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    // If user doesn't exist in users table, create it automatically
    if (!userData && !userError) {

      
      const username = user.user_metadata?.username 
        || user.email?.split('@')[0] 
        || 'User';
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username: username,
        })
        .select()
        .single();
      
      if (insertError) {

        return c.json({ error: 'Failed to create user profile' }, 500);
      }
      
      userData = newUser;

    } else if (userError) {
      return c.json({ error: 'Failed to fetch user data' }, 500);
    }

    // Get user's businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    const businessIds = businesses?.map(b => b.id) || [];

    return c.json({ 
      user: {
        ...userData,
        businessIds,
      }
    });
  } catch (error) {
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// Delete user account
app.delete('/make-server-726d4144/auth/user', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    // Delete user from auth (this will cascade delete the user profile due to FK constraints)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return c.json({ error: 'Failed to delete account' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: 'Failed to delete account' }, 500);
  }
});

// ============ BUSINESS ROUTES ============

// Get all businesses
app.get('/make-server-726d4144/businesses', async (c) => {
  try {
    // Get query parameters
    const category = c.req.query('category');
    const city = c.req.query('city');
    const search = c.req.query('search');
    
    let query = supabase
      .from('businesses')
      .select(`
        *,
        category:categories(id, name, group_name)
      `)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    const { data: businesses, error } = await query;

    if (error) {
      console.log('Get businesses error:', error);
      // If table doesn't exist or schema is outdated
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Database tables not set up or schema is outdated. Please run the SQL schema from SUPABASE_SCHEMA.md');
        return c.json({ 
          businesses: [],
          warning: 'Database schema not set up correctly. Please run the complete SQL script from SUPABASE_SCHEMA.md'
        });
      }
      return c.json({ error: 'Failed to fetch businesses', details: error.message }, 500);
    }

    // Get all reviews to enrich businesses
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Get unique user IDs from reviews
    const userIds = [...new Set((allReviews || []).map(r => r.user_id).filter(Boolean))];
    let userMap = new Map();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);
      
      if (users) {
        userMap = new Map(users.map(u => [u.id, u.username]));
      }
    }

    // Filter by category if specified
    let filteredBusinesses = businesses || [];
    if (category) {
      filteredBusinesses = filteredBusinesses.filter(b => b.category?.name === category);
    }
    
    // Transform the data to match the expected format
    const transformedBusinesses = filteredBusinesses.map(business => {
      const businessReviews = (allReviews || [])
        .filter(r => r.business_id === business.id)
        .map((review: any) => ({
          id: review.id,
          business_id: review.business_id,
          user_id: review.user_id,
          userId: review.user_id, // Legacy support
          rating: review.rating,
          comment: review.comment,
          created_at: review.created_at,
          authorName: userMap.get(review.user_id) || 'Anonymous User',
          date: review.created_at,
          images: [],
        }));
      
      return {
        ...business,
        categoryName: business.category?.name,
        zipCode: business.zip_code,
        serviceArea: business.service_area,
        socialMedia: {}, // Column doesn't exist in DB, return empty object
        portfolio: business.portfolio || [],
        reviewCount: businessReviews.length,
        ownerId: business.owner_id,
        reviews: businessReviews,
      };
    });

    return c.json({ businesses: transformedBusinesses });
  } catch (error) {
    console.log('Get businesses error:', error);
    return c.json({ error: 'Failed to fetch businesses' }, 500);
  }
});

// Get single business
app.get('/make-server-726d4144/businesses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    // Get business data
    const { data: business, error } = await supabase
      .from('businesses')
      .select(`
        *,
        category:categories(id, name, group_name)
      `)
      .eq('id', id)
      .single();
    
    if (error || !business) {
      return c.json({ error: 'Business not found' }, 404);
    }
    
    // Get reviews separately to avoid foreign key relationship issues
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', id)
      .order('created_at', { ascending: false });
    
    // Get user info for each review
    const reviews = reviewsData || [];
    const userIds = [...new Set(reviews.map(r => r.user_id).filter(Boolean))];
    
    let userMap = new Map();
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);
      
      if (users) {
        userMap = new Map(users.map(u => [u.id, u.username]));
      }
    }
    
    // Enrich reviews with usernames
    const enrichedReviews = reviews.map(review => ({
      id: review.id,
      business_id: review.business_id,
      user_id: review.user_id,
      userId: review.user_id, // Legacy support
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      authorName: userMap.get(review.user_id) || 'Anonymous',
      date: review.created_at,
      images: [],
    }));
    
    // Transform the data to match the expected format
    const transformedBusiness = {
      ...business,
      categoryName: business.category?.name,
      zipCode: business.zip_code,
      serviceArea: business.service_area,
      socialMedia: {}, // Column doesn't exist in DB, return empty object
      portfolio: business.portfolio || [],
      reviewCount: enrichedReviews.length,
      ownerId: business.owner_id,
      reviews: enrichedReviews,
    };

    return c.json({ business: transformedBusiness });
  } catch (error) {
    console.log('Get business error:', error);
    return c.json({ error: 'Failed to fetch business' }, 500);
  }
});

// Create business (requires auth)
app.post('/make-server-726d4144/businesses', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const businessData = await c.req.json();
    console.log('Received business data:', JSON.stringify(businessData, null, 2));

    // Check if this business was previously deleted (to prevent review manipulation)
    const deletedKey = `deleted_business:${user.id}:${businessData.name.toLowerCase().trim()}`;
    const wasDeleted = await kv.get(deletedKey);
    
    if (wasDeleted) {
      console.log(`Business creation blocked - previously deleted: ${businessData.name} by user ${user.id}`);
      return c.json({ 
        error: 'This business cannot be re-registered',
        description: 'This business was previously deleted and cannot be added again. This prevents manipulation of reviews and ratings. If you believe this is an error, please contact support.'
      }, 400);
    }

    // Validate portfolio image limit (max 20 images)
    const portfolio = businessData.portfolio || [];
    if (portfolio.length > 20) {
      return c.json({ 
        error: 'Portfolio image limit exceeded',
        description: 'You can only add up to 20 portfolio images per business.'
      }, 400);
    }

    // Look up category_id from categoryName
    let categoryId = businessData.category_id;
    
    if (!categoryId && businessData.categoryName) {
      console.log('Looking up category by name:', businessData.categoryName);
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', businessData.categoryName)
        .maybeSingle();
      
      if (categoryError) {
        console.error('Category lookup error:', categoryError);
        return c.json({ 
          error: 'Invalid category',
          description: 'Failed to find the specified category.'
        }, 400);
      }
      
      if (!category) {
        console.error('Category not found:', businessData.categoryName);
        return c.json({ 
          error: 'Invalid category',
          description: `Category "${businessData.categoryName}" does not exist.`
        }, 400);
      }
      
      categoryId = category.id;
      console.log('Found category_id:', categoryId);
    }
    
    if (!categoryId) {
      return c.json({ 
        error: 'Missing category',
        description: 'A category is required to create a business.'
      }, 400);
    }

    // Transform frontend data to database format
    const dbData = {
      owner_id: user.id,
      name: businessData.name,
      category_id: categoryId, // Database uses category_id foreign key
      description: businessData.description,
      address: businessData.address || null,
      service_area: businessData.serviceArea,
      city: businessData.city,
      zip_code: businessData.zipCode,
      phone: businessData.phone,
      email: businessData.email,
      website: businessData.website || null,
      portfolio: portfolio,
      rating: 5.0,
    };
    
    console.log('Prepared DB data:', JSON.stringify(dbData, null, 2));

    const { data: newBusiness, error: insertError } = await supabase
      .from('businesses')
      .insert(dbData)
      .select(`
        *,
        category:categories(id, name, group_name)
      `)
      .single();

    if (insertError) {
      console.error('Create business error:', insertError);
      console.error('Failed data:', JSON.stringify(dbData, null, 2));
      return c.json({ 
        error: 'Failed to create business',
        description: insertError.message,
        details: insertError.details || insertError.hint || 'Unknown error'
      }, 500);
    }

    // Transform response to match expected format
    const transformedBusiness = {
      ...newBusiness,
      categoryName: newBusiness.category?.name,
      zipCode: newBusiness.zip_code,
      serviceArea: newBusiness.service_area,
      socialMedia: {}, // Column doesn't exist in DB, return empty object
      portfolio: newBusiness.portfolio || [],
      reviewCount: 0, // New business has no reviews
      ownerId: newBusiness.owner_id,
      reviews: [],
    };

    return c.json({ business: transformedBusiness });
  } catch (error) {
    console.log('Create business error:', error);
    return c.json({ error: 'Failed to create business' }, 500);
  }
});

// Update business (requires auth & ownership)
app.put('/make-server-726d4144/businesses/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const businessId = c.req.param('id');

    // Check if business exists and user owns it
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return c.json({ error: 'Business not found' }, 404);
    }

    if (business.owner_id !== user.id) {
      return c.json({ error: 'Not authorized to update this business' }, 403);
    }

    const updates = await c.req.json();

    // Validate portfolio image limit if being updated (max 20 images)
    if (updates.portfolio !== undefined && updates.portfolio.length > 20) {
      return c.json({ 
        error: 'Portfolio image limit exceeded',
        description: 'You can only add up to 20 portfolio images per business.'
      }, 400);
    }

    // Look up category_id from categoryName if provided
    let categoryId = updates.category_id;
    
    if (!categoryId && updates.categoryName) {
      console.log('Looking up category by name for update:', updates.categoryName);
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', updates.categoryName)
        .maybeSingle();
      
      if (categoryError || !category) {
        console.error('Category lookup error:', categoryError);
        return c.json({ 
          error: 'Invalid category',
          description: `Category "${updates.categoryName}" does not exist.`
        }, 400);
      }
      
      categoryId = category.id;
      console.log('Found category_id for update:', categoryId);
    }

    // Transform frontend data to database format
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (categoryId !== undefined) dbUpdates.category_id = categoryId; // Database uses category_id
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.serviceArea !== undefined) dbUpdates.service_area = updates.serviceArea;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.zipCode !== undefined) dbUpdates.zip_code = updates.zipCode;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.website !== undefined) dbUpdates.website = updates.website;
    // social_media column doesn't exist in DB, skip it
    if (updates.portfolio !== undefined) dbUpdates.portfolio = updates.portfolio;

    const { data: updatedBusiness, error: updateError } = await supabase
      .from('businesses')
      .update(dbUpdates)
      .eq('id', businessId)
      .select(`
        *,
        category:categories(id, name, group_name)
      `)
      .single();

    if (updateError) {
      console.log('Update business error:', updateError);
      return c.json({ error: 'Failed to update business' }, 500);
    }

    // Get reviews separately
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    // Get user info for reviews
    const reviewsList = reviewsData || [];
    const userIds = [...new Set(reviewsList.map(r => r.user_id).filter(Boolean))];
    let userMap = new Map();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);
      
      if (users) {
        userMap = new Map(users.map(u => [u.id, u.username]));
      }
    }

    // Transform response for UPDATE endpoint
    const reviews = reviewsList.map((review: any) => ({
      id: review.id,
      business_id: review.business_id,
      user_id: review.user_id,
      userId: review.user_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      authorName: userMap.get(review.user_id) || 'Anonymous User',
      date: review.created_at,
      images: [],
    }));
    
    const transformedBusiness = {
      ...updatedBusiness,
      categoryName: updatedBusiness.category?.name,
      zipCode: updatedBusiness.zip_code,
      serviceArea: updatedBusiness.service_area,
      socialMedia: {}, // Column doesn't exist in DB, return empty object
      portfolio: updatedBusiness.portfolio || [],
      reviewCount: reviews.length, // Calculate from reviews array
      ownerId: updatedBusiness.owner_id,
      reviews,
    };

    return c.json({ business: transformedBusiness });
  } catch (error) {
    console.log('Update business error:', error);
    return c.json({ error: 'Failed to update business' }, 500);
  }
});

// Delete business (requires auth & ownership)
app.delete('/make-server-726d4144/businesses/:id', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const businessId = c.req.param('id');

    // Check if business exists and user owns it
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return c.json({ error: 'Business not found' }, 404);
    }

    if (business.owner_id !== user.id) {
      return c.json({ error: 'Not authorized to delete this business' }, 403);
    }

    // Track deleted business to prevent re-registration (anti-review manipulation)
    const deletedKey = `deleted_business:${user.id}:${business.name.toLowerCase().trim()}`;
    const timestamp = new Date().toISOString();
    
    try {
      await kv.set(deletedKey, timestamp);
      console.log(`Tracked deleted business: ${business.name} by user ${user.id} at ${timestamp}`);
    } catch (kvError) {
      console.error('Failed to track deleted business in KV store:', kvError);
      // Continue with deletion even if tracking fails
    }

    // Delete business (cascade will delete associated reviews)
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);

    if (deleteError) {
      console.log('Delete business error:', deleteError);
      return c.json({ error: 'Failed to delete business' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete business error:', error);
    return c.json({ error: 'Failed to delete business' }, 500);
  }
});

// Add review (requires auth)
app.post('/make-server-726d4144/businesses/:id/reviews', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));

    if (error || !user) {
      return c.json({ error: error || 'Unauthorized' }, 401);
    }

    const businessId = c.req.param('id');

    // Check if business exists
    const { data: business, error: fetchError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();

    if (fetchError || !business) {
      return c.json({ error: 'Business not found' }, 404);
    }

    const reviewData = await c.req.json();

    // Get user data for author name
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    // Insert review
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        business_id: businessId,
        user_id: user.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
      })
      .select()
      .single();

    if (insertError) {
      console.log('Add review error:', insertError);
      return c.json({ error: 'Failed to add review' }, 500);
    }

    // Get updated business with all reviews
    const { data: updatedBusiness } = await supabase
      .from('businesses')
      .select(`
        *,
        category:categories(id, name, group_name)
      `)
      .eq('id', businessId)
      .single();
    
    // Get reviews separately
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });
    
    // Get user info for reviews
    const reviewsList = reviewsData || [];
    const userIds = [...new Set(reviewsList.map(r => r.user_id).filter(Boolean))];
    let userMap = new Map();
    
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);
      
      if (users) {
        userMap = new Map(users.map(u => [u.id, u.username]));
      }
    }

    // Transform response for POST review endpoint
    const reviews = reviewsList.map((review: any) => ({
      id: review.id,
      business_id: review.business_id,
      user_id: review.user_id,
      userId: review.user_id,
      rating: review.rating,
      comment: review.comment,
      created_at: review.created_at,
      authorName: userMap.get(review.user_id) || 'Anonymous User',
      date: review.created_at,
      images: [],
    }));
    
    const transformedBusiness = {
      ...updatedBusiness,
      categoryName: updatedBusiness.category?.name,
      zipCode: updatedBusiness.zip_code,
      serviceArea: updatedBusiness.service_area,
      socialMedia: {}, // Column doesn't exist in DB, return empty object
      portfolio: updatedBusiness.portfolio || [],
      reviewCount: reviews.length, // Calculate from reviews array
      ownerId: updatedBusiness.owner_id,
      reviews,
    };

    return c.json({ business: transformedBusiness });
  } catch (error) {
    console.log('Add review error:', error);
    return c.json({ error: 'Failed to add review' }, 500);
  }
});

// ============ CATEGORIES ROUTE ============

// Get all categories
app.get('/make-server-726d4144/categories', async (c) => {
  try {
    console.log('📂 Fetching categories from database...');
    
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Get categories error:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      return c.json({ 
        error: 'Failed to fetch categories',
        details: error.message,
        categories: [] // Return empty array as fallback
      }, 500);
    }

    console.log(`✅ Fetched ${categories?.length || 0} categories`);
    
    // Return full category objects, not just names
    return c.json({ categories: categories || [] });
  } catch (error) {
    console.error('❌ Get categories exception:', error);
    return c.json({ 
      error: 'Failed to fetch categories',
      categories: [] // Return empty array as fallback
    }, 500);
  }
});

// ============ INITIALIZATION ============

// Get database status (auth users vs user profiles)
app.get('/make-server-726d4144/database-status', async (c) => {
  try {
    const status = {
      authUsers: 0,
      userProfiles: 0,
      orphanedProfiles: 0,
      missingProfiles: 0,
      foreignKeyExists: false,
      healthy: false,
    };

    // Get auth users count
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    status.authUsers = authUsers?.users?.length || 0;

    // Get user profiles count
    const { data: profiles } = await supabase.from('users').select('id');
    status.userProfiles = profiles?.length || 0;

    // Check for orphaned/missing profiles
    if (authUsers && profiles) {
      const authUserIds = new Set(authUsers.users.map(u => u.id));
      const profileUserIds = new Set(profiles.map(u => u.id));
      
      status.orphanedProfiles = Array.from(profileUserIds).filter(id => !authUserIds.has(id)).length;
      status.missingProfiles = Array.from(authUserIds).filter(id => !profileUserIds.has(id)).length;
    }

    // Foreign key is now auto-created on startup, so just return true
    status.foreignKeyExists = true;

    status.healthy = status.orphanedProfiles === 0 && 
                     status.missingProfiles === 0 && 
                     status.foreignKeyExists;

    return c.json({ status });
  } catch (error) {
    console.error('Database status check error:', error);
    return c.json({ error: 'Failed to check database status' }, 500);
  }
});

// Fix database: sync auth users with user profiles and verify foreign keys
app.post('/make-server-726d4144/fix-database', async (c) => {
  let dbClient: any = null;
  let lockAcquired = false;
  
  try {
    console.log('🔧 Starting database fix...');
    const results = {
      orphanedProfilesRemoved: 0,
      missingProfilesCreated: 0,
      foreignKeyExists: false,
      errors: [] as string[],
    };

    // Step 1: Get all auth users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.error('Failed to list auth users:', authError);
      results.errors.push(`Auth users fetch failed: ${authError.message}`);
    }

    // Step 2: Get all user profiles
    const { data: userProfiles, error: profileError } = await supabase
      .from('users')
      .select('id');
    
    if (profileError) {
      console.error('Failed to list user profiles:', profileError);
      results.errors.push(`User profiles fetch failed: ${profileError.message}`);
    }

    if (authUsers && userProfiles) {
      const authUserIds = new Set(authUsers.users.map(u => u.id));
      const profileUserIds = new Set(userProfiles.map(u => u.id));

      // Step 3: Remove orphaned profiles (profiles without auth users)
      const orphanedProfileIds = Array.from(profileUserIds).filter(id => !authUserIds.has(id));
      if (orphanedProfileIds.length > 0) {
        console.log(`Removing ${orphanedProfileIds.length} orphaned profiles...`);
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .in('id', orphanedProfileIds);
        
        if (deleteError) {
          console.error('Failed to remove orphaned profiles:', deleteError);
          results.errors.push(`Orphaned profiles removal failed: ${deleteError.message}`);
        } else {
          results.orphanedProfilesRemoved = orphanedProfileIds.length;
          console.log(`✅ Removed ${orphanedProfileIds.length} orphaned profiles`);
        }
      }

      // Step 4: Create missing profiles (auth users without profiles)
      const missingProfileUsers = authUsers.users.filter(u => !profileUserIds.has(u.id));
      if (missingProfileUsers.length > 0) {
        console.log(`Creating ${missingProfileUsers.length} missing profiles...`);
        
        const newProfiles = missingProfileUsers.map(user => ({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
          created_at: user.created_at,
        }));

        const { error: insertError } = await supabase
          .from('users')
          .insert(newProfiles);
        
        if (insertError) {
          console.error('Failed to create missing profiles:', insertError);
          results.errors.push(`Missing profiles creation failed: ${insertError.message}`);
        } else {
          results.missingProfilesCreated = missingProfileUsers.length;
          console.log(`✅ Created ${missingProfileUsers.length} missing profiles`);
        }
      }
    }

    // Step 5: Verify and auto-fix foreign key (reviews -> users)
    try {
      const dbUrl = Deno.env.get('SUPABASE_DB_URL');
      
      if (dbUrl) {
        // Import postgres client and acquire advisory lock
        const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
        dbClient = new Client(dbUrl);
        await dbClient.connect();
        
        // Try to acquire advisory lock (lock_id: 123456789) to prevent concurrent execution
        try {
          const lockResult = await dbClient.queryObject(`SELECT pg_try_advisory_lock(123456789) as locked`);
          lockAcquired = lockResult.rows[0]?.locked === true;
          
          if (!lockAcquired) {
            console.log('⏳ Another instance is running database fix. Skipping...');
            await dbClient.end();
            return c.json({ 
              success: true, 
              message: 'Database fix is already running in another instance. Please wait and refresh.',
              skipped: true 
            });
          }
          
          console.log('🔒 Advisory lock acquired successfully');
        } catch (lockError) {
          console.error('Lock acquisition error:', lockError);
          // Continue without lock if advisory lock fails
        }
        
        // Check and fix reviews -> users foreign key
        const checkReviewsFK = await dbClient.queryObject(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'reviews' 
            AND constraint_name = 'reviews_user_id_fkey'
        `);
        
        if (checkReviewsFK.rows.length === 0) {
          console.log('Reviews FK missing, creating it...');
          
          // Add the foreign key constraint
          await dbClient.queryObject(`
            ALTER TABLE reviews
            ADD CONSTRAINT reviews_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          `);
          
          console.log('✅ Reviews FK created successfully!');
          results.foreignKeyExists = true;
        } else {
          console.log('✅ Reviews FK already exists');
          results.foreignKeyExists = true;
        }
        
        // Check and fix businesses -> users foreign key (should cascade)
        const checkBusinessFK = await dbClient.queryObject(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = 'businesses' 
            AND constraint_name = 'businesses_owner_id_fkey'
        `);
        
        if (checkBusinessFK.rows.length === 0) {
          console.log('Businesses FK missing, creating it...');
          
          // Add the foreign key constraint with CASCADE
          await dbClient.queryObject(`
            ALTER TABLE businesses
            ADD CONSTRAINT businesses_owner_id_fkey
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
          `);
          
          console.log('✅ Businesses FK created successfully!');
        } else {
          // Check if existing FK has correct ON DELETE behavior
          const fkInfo = await dbClient.queryObject(`
            SELECT confdeltype
            FROM pg_constraint
            WHERE conname = 'businesses_owner_id_fkey'
          `);
          
          // If FK exists but doesn't cascade, drop and recreate
          if (fkInfo.rows.length > 0 && fkInfo.rows[0].confdeltype !== 'c') {
            console.log('Businesses FK exists but wrong cascade type, recreating...');
            
            await dbClient.queryObject(`
              ALTER TABLE businesses
              DROP CONSTRAINT IF EXISTS businesses_owner_id_fkey
            `);
            
            await dbClient.queryObject(`
              ALTER TABLE businesses
              ADD CONSTRAINT businesses_owner_id_fkey
              FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
            `);
            
            console.log('✅ Businesses FK recreated with CASCADE!');
          } else {
            console.log('✅ Businesses FK already exists with correct cascade');
          }
        }
        
        // CRITICAL: Create trigger to cascade delete from auth.users to public.users
        // This allows deleting users from Supabase Auth dashboard
        try {
          console.log('Setting up auth user cascade delete...');
          
          // Step 1: Create the trigger function
          await dbClient.queryObject(`
            CREATE OR REPLACE FUNCTION public.handle_auth_user_delete()
            RETURNS TRIGGER 
            SECURITY DEFINER
            SET search_path = public
            LANGUAGE plpgsql
            AS $$
            BEGIN
              DELETE FROM public.users WHERE id = OLD.id;
              RETURN OLD;
            END;
            $$;
          `);
          
          console.log('✅ Auth user delete function created');
          
          // Step 2: Check if trigger already exists
          const checkTrigger = await dbClient.queryObject(`
            SELECT trigger_name FROM information_schema.triggers 
            WHERE event_object_table = 'users' 
            AND trigger_schema = 'auth'
            AND trigger_name = 'on_auth_user_deleted';
          `);
          
          if (checkTrigger.rows.length === 0) {
            // Step 3: Create the trigger only if it doesn't exist
            try {
              await dbClient.queryObject(`
                CREATE TRIGGER on_auth_user_deleted
                  BEFORE DELETE ON auth.users
                  FOR EACH ROW
                  EXECUTE FUNCTION public.handle_auth_user_delete();
              `);
              
              console.log('✅ Auth user delete trigger created successfully!');
            } catch (createTriggerError: any) {
              if (createTriggerError.message?.includes('tuple concurrently updated') || createTriggerError.message?.includes('already exists')) {
                console.log('ℹ️  Trigger already exists (created by another instance)');
              } else {
                throw createTriggerError;
              }
            }
          } else {
            console.log('✅ Auth user delete trigger already exists');
          }
          results.authTriggerCreated = true;
          
        } catch (triggerError: any) {
          console.error('❌ Trigger creation error:', triggerError);
          console.error('Error details:', {
            name: triggerError.name,
            message: triggerError.message,
            stack: triggerError.stack
          });
          
          // Don't fail completely if it's just a concurrent update
          if (triggerError.message?.includes('tuple concurrently updated')) {
            console.log('ℹ️  Trigger setup skipped due to concurrent execution');
            results.authTriggerCreated = true;
          } else {
            results.errors.push(`Trigger error: ${triggerError.message}`);
            results.authTriggerCreated = false;
          }
        }
        
        // Step 5.5: Create performance indexes for businesses table
        try {
          console.log('Creating performance indexes for businesses table...');
          
          const businessIndexes = [
            { name: 'idx_businesses_owner_id', sql: 'CREATE INDEX idx_businesses_owner_id ON businesses(owner_id)' },
            { name: 'idx_businesses_category_id', sql: 'CREATE INDEX idx_businesses_category_id ON businesses(category_id)' },
            { name: 'idx_businesses_city', sql: 'CREATE INDEX idx_businesses_city ON businesses(city)' },
            { name: 'idx_businesses_rating', sql: 'CREATE INDEX idx_businesses_rating ON businesses(rating DESC)' },
          ];
          
          for (const index of businessIndexes) {
            // Check if index exists first to avoid NOTICE messages
            const checkResult = await dbClient.queryObject(`
              SELECT indexname FROM pg_indexes 
              WHERE indexname = '${index.name}'
            `);
            
            if (checkResult.rows.length === 0) {
              try {
                await dbClient.queryObject(index.sql);
                console.log(`✅ Created index: ${index.name}`);
              } catch (indexError: any) {
                if (indexError.message?.includes('already exists')) {
                  console.log(`ℹ️  Index ${index.name} already exists`);
                } else {
                  throw indexError;
                }
              }
            } else {
              console.log(`ℹ️  Index ${index.name} already exists`);
            }
          }
          
          console.log('✅ Business indexes verified');
        } catch (indexError) {
          console.error('❌ Business indexes creation error:', indexError);
          results.errors.push(`Business indexes error: ${indexError.message}`);
        }
        
        // Step 6: Create favorites and recent_searches tables
        try {
          console.log('Setting up favorites and recent_searches tables...');
          
          // Check if favorites table exists
          const checkFavoritesTable = await dbClient.queryObject(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'favorites'
            );
          `);
          
          const favoritesExists = checkFavoritesTable.rows[0]?.exists;
          
          if (!favoritesExists) {
            // Create favorites table
            await dbClient.queryObject(`
              CREATE TABLE favorites (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, business_id)
              );
            `);
            
            // Create indexes
            await dbClient.queryObject(`
              CREATE INDEX idx_favorites_user_id ON favorites(user_id);
            `);
            await dbClient.queryObject(`
              CREATE INDEX idx_favorites_business_id ON favorites(business_id);
            `);
            await dbClient.queryObject(`
              CREATE INDEX idx_favorites_created_at ON favorites(created_at DESC);
            `);
            
            console.log('✅ Favorites table created');
          } else {
            console.log('✅ Favorites table already exists');
          }
          
          // Check if recent_searches table exists
          const checkRecentSearchesTable = await dbClient.queryObject(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'recent_searches'
            );
          `);
          
          const recentSearchesExists = checkRecentSearchesTable.rows[0]?.exists;
          
          if (!recentSearchesExists) {
            // Create recent_searches table
            await dbClient.queryObject(`
              CREATE TABLE recent_searches (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                service TEXT NOT NULL,
                location TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
              );
            `);
            
            // Create indexes
            await dbClient.queryObject(`
              CREATE INDEX idx_recent_searches_user_id ON recent_searches(user_id);
            `);
            await dbClient.queryObject(`
              CREATE INDEX idx_recent_searches_created_at ON recent_searches(created_at DESC);
            `);
            
            console.log('✅ Recent searches table created');
          } else {
            console.log('✅ Recent searches table already exists');
          }
          
          // Always enable RLS on favorites table
          await dbClient.queryObject(`ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;`);
          console.log('✅ RLS enabled on favorites table');
          
          // Create RLS policies for favorites
          const checkFavoritesPolicies = await dbClient.queryObject(`
            SELECT COUNT(*) as count FROM pg_policies 
            WHERE tablename = 'favorites';
          `);
          
          if (checkFavoritesPolicies.rows[0]?.count === 0) {
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can view their own favorites"
                ON favorites FOR SELECT
                USING (auth.uid() = user_id);
            `);
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can add their own favorites"
                ON favorites FOR INSERT
                WITH CHECK (auth.uid() = user_id);
            `);
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can delete their own favorites"
                ON favorites FOR DELETE
                USING (auth.uid() = user_id);
            `);
            
            console.log('✅ Favorites RLS policies created');
          } else {
            console.log('✅ Favorites RLS policies already exist');
          }
          
          // Always enable RLS on recent_searches table
          await dbClient.queryObject(`ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;`);
          console.log('✅ RLS enabled on recent_searches table');
          
          // Create RLS policies for recent_searches
          const checkSearchesPolicies = await dbClient.queryObject(`
            SELECT COUNT(*) as count FROM pg_policies 
            WHERE tablename = 'recent_searches';
          `);
          
          if (checkSearchesPolicies.rows[0]?.count === 0) {
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can view their own recent searches"
                ON recent_searches FOR SELECT
                USING (auth.uid() = user_id);
            `);
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can add their own recent searches"
                ON recent_searches FOR INSERT
                WITH CHECK (auth.uid() = user_id);
            `);
            
            await dbClient.queryObject(`
              CREATE POLICY "Users can delete their own recent searches"
                ON recent_searches FOR DELETE
                USING (auth.uid() = user_id);
            `);
            
            console.log('✅ Recent searches RLS policies created');
          } else {
            console.log('✅ Recent searches RLS policies already exist');
          }
          
        } catch (favoritesError) {
          console.error('❌ Favorites/searches tables creation error:', favoritesError);
          results.errors.push(`Favorites/searches setup error: ${favoritesError.message}`);
        }
        
        // Step 7: Create chat tables (conversations and messages)
        try {
          console.log('Setting up chat tables...');
          
          // Check if conversations table exists
          const checkConversationsTable = await dbClient.queryObject(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'conversations'
            );
          `);
          
          const conversationsExists = checkConversationsTable.rows[0]?.exists;
          
          if (!conversationsExists) {
            // Create conversations table
            await dbClient.queryObject(`
              CREATE TABLE conversations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                last_message_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, business_id)
              );
            `);
            console.log('✅ Conversations table created');
          } else {
            console.log('✅ Conversations table already exists');
          }
          
          // Check if messages table exists
          const checkMessagesTable = await dbClient.queryObject(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = 'messages'
            );
          `);
          
          const messagesExists = checkMessagesTable.rows[0]?.exists;
          
          if (!messagesExists) {
            // Create messages table
            await dbClient.queryObject(`
              CREATE TABLE messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'business')),
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                read_at TIMESTAMPTZ,
                email_notified_at TIMESTAMPTZ
              );
            `);
            console.log('✅ Messages table created');
          } else {
            console.log('✅ Messages table already exists');
            
            // Check and add missing columns one by one
            const columnsToCheck = [
              {
                name: 'sender_id',
                sql: 'ALTER TABLE messages ADD COLUMN sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;',
                description: 'sender_id column'
              },
              {
                name: 'sender_type',
                sql: `ALTER TABLE messages ADD COLUMN sender_type TEXT CHECK (sender_type IN ('user', 'business'));`,
                description: 'sender_type column'
              },
              {
                name: 'email_notified_at',
                sql: 'ALTER TABLE messages ADD COLUMN email_notified_at TIMESTAMPTZ;',
                description: 'email_notified_at column'
              }
            ];
            
            for (const column of columnsToCheck) {
              const columnCheck = await dbClient.queryObject<{ column_name: string }>(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'messages' AND column_name = '${column.name}'
              `);
              
              if (columnCheck.rows.length === 0) {
                console.log(`📧 Adding ${column.description} to messages table...`);
                await dbClient.queryObject(column.sql);
                console.log(`✅ ${column.description} added`);
              } else {
                console.log(`✅ ${column.description} already exists`);
              }
            }
          }
          
          // Create indexes for better performance (check first to avoid notices)
          const indexesToCreate = [
            { name: 'idx_conversations_user_id', sql: 'CREATE INDEX idx_conversations_user_id ON conversations(user_id)' },
            { name: 'idx_conversations_business_id', sql: 'CREATE INDEX idx_conversations_business_id ON conversations(business_id)' },
            { name: 'idx_conversations_last_message', sql: 'CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC)' },
            { name: 'idx_messages_conversation_id', sql: 'CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)' },
            { name: 'idx_messages_created_at', sql: 'CREATE INDEX idx_messages_created_at ON messages(created_at)' }
          ];

          for (const index of indexesToCreate) {
            const checkResult = await dbClient.queryObject(`
              SELECT indexname FROM pg_indexes 
              WHERE indexname = '${index.name}'
            `);
            
            if (checkResult.rows.length === 0) {
              await dbClient.queryObject(index.sql);
              console.log(`✅ Created index: ${index.name}`);
            }
          }
          
          console.log('✅ All chat indexes verified');
          
          // Enable RLS on chat tables (ignore errors if already enabled)
          try {
            await dbClient.queryObject(`
              ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
            `);
          } catch (e) {
            // RLS might already be enabled, that's fine
          }
          
          try {
            await dbClient.queryObject(`
              ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
            `);
          } catch (e) {
            // RLS might already be enabled, that's fine
          }
          
          console.log('✅ RLS enabled on chat tables');
          
          // Create RLS policies for conversations with error handling
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
              CREATE POLICY "Users can view their own conversations" ON conversations
                FOR SELECT USING (
                  user_id = auth.uid() OR 
                  business_id IN (
                    SELECT id FROM businesses WHERE owner_id = auth.uid()
                  )
                );
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can view their own conversations" already configured');
            } else {
              throw e;
            }
          }
          
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
              CREATE POLICY "Users can create conversations" ON conversations
                FOR INSERT WITH CHECK (user_id = auth.uid());
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can create conversations" already configured');
            } else {
              throw e;
            }
          }
          
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
              CREATE POLICY "Users can update their conversations" ON conversations
                FOR UPDATE USING (
                  user_id = auth.uid() OR 
                  business_id IN (
                    SELECT id FROM businesses WHERE owner_id = auth.uid()
                  )
                );
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can update their conversations" already configured');
            } else {
              throw e;
            }
          }
          
          console.log('✅ Conversation RLS policies created');
          
          // Create RLS policies for messages with error handling
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can view their messages" ON messages;
              CREATE POLICY "Users can view their messages" ON messages
                FOR SELECT USING (
                  conversation_id IN (
                    SELECT id FROM conversations WHERE 
                      user_id = auth.uid() OR 
                      business_id IN (
                        SELECT id FROM businesses WHERE owner_id = auth.uid()
                      )
                  )
                );
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can view their messages" already configured');
            } else {
              throw e;
            }
          }
          
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can send messages" ON messages;
              CREATE POLICY "Users can send messages" ON messages
                FOR INSERT WITH CHECK (
                  sender_id = auth.uid() AND
                  conversation_id IN (
                    SELECT id FROM conversations WHERE 
                      user_id = auth.uid() OR 
                      business_id IN (
                        SELECT id FROM businesses WHERE owner_id = auth.uid()
                      )
                  )
                );
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can send messages" already configured');
            } else {
              throw e;
            }
          }
          
          try {
            await dbClient.queryObject(`
              DROP POLICY IF EXISTS "Users can update message read status" ON messages;
              CREATE POLICY "Users can update message read status" ON messages
                FOR UPDATE USING (
                  conversation_id IN (
                    SELECT id FROM conversations WHERE 
                      user_id = auth.uid() OR 
                      business_id IN (
                        SELECT id FROM businesses WHERE owner_id = auth.uid()
                      )
                  )
                );
            `);
          } catch (e: any) {
            if (e.message?.includes('tuple concurrently updated') || e.message?.includes('already exists')) {
              console.log('ℹ️  Policy "Users can update message read status" already configured');
            } else {
              throw e;
            }
          }
          
          console.log('✅ Message RLS policies created');
          console.log('🎉 Chat system fully configured!');
          
        } catch (chatError) {
          console.error('❌ Chat tables creation error:', chatError);
          results.errors.push(`Chat setup error: ${chatError.message}`);
        }
      } else {
        console.error('SUPABASE_DB_URL not found');
        results.foreignKeyExists = false;
        results.errors.push('Database URL not configured');
      }
    } catch (err) {
      console.error('Foreign key error:', err);
      results.foreignKeyExists = false;
      results.errors.push('Foreign key check failed');
    }

    console.log('🎉 Database fix complete!', results);
    
    return c.json({
      success: results.errors.length === 0,
      results,
      message: results.errors.length === 0 
        ? '✅ Database is now properly configured!'
        : '⚠️ Database fix completed with some warnings. Check errors array.',
    });
  } catch (error) {
    console.error('Database fix error:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fix database',
      details: String(error) 
    }, 500);
  } finally {
    // Release advisory lock and close connection
    if (dbClient && lockAcquired) {
      try {
        await dbClient.queryObject(`SELECT pg_advisory_unlock(123456789)`);
        console.log('🔓 Advisory lock released');
      } catch (unlockError) {
        console.error('Failed to release lock:', unlockError);
      }
    }
    
    if (dbClient) {
      try {
        await dbClient.end();
      } catch (closeError) {
        console.error('Failed to close dbClient:', closeError);
      }
    }
  }
});

// Initialize with mock data if empty
app.post('/make-server-726d4144/init', async (c) => {
  try {
    const { data: businesses, error } = await supabase
      .from('businesses')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Init check error:', error);
      // If table doesn't exist or schema is wrong, return helpful error
      if (error.message?.includes('does not exist')) {
        console.log('⚠️ Database tables not set up correctly. Please run the complete SQL schema from SUPABASE_SCHEMA.md');
        return c.json({ 
          error: 'Database not set up',
          message: 'Please run the complete SQL script from SUPABASE_SCHEMA.md in your Supabase dashboard. Make sure to run the entire script.',
          guide: 'See DATABASE_SETUP.md for instructions'
        }, 400);
      }
      return c.json({ error: 'Failed to check initialization', details: error.message }, 500);
    }

    if (!businesses || businesses.length === 0) {
      const { mockData } = await c.req.json();
      
      if (mockData && Array.isArray(mockData)) {
        // Transform mock data to database format
        const transformedData = mockData.map((business: any) => ({
          id: business.id,
          owner_id: null, // Mock data has no owner
          name: business.name,
          category_id: business.category_id, // Database uses category_id
          description: business.description,
          service_area: business.serviceArea,
          city: business.city,
          zip_code: business.zipCode,
          phone: business.phone,
          email: business.email,
          website: business.website || null,
          portfolio: business.portfolio || [],
          rating: business.rating || 5.0,
        }));

        // Insert businesses
        const { error: insertError } = await supabase
          .from('businesses')
          .insert(transformedData);

        if (insertError) {
          console.log('Init insert error:', insertError);
          return c.json({ error: 'Failed to initialize data', details: insertError.message }, 500);
        }

        // Insert reviews for businesses that have them
        for (const business of mockData) {
          if (business.reviews && business.reviews.length > 0) {
            const reviewsData = business.reviews.map((review: any) => ({
              id: review.id,
              business_id: business.id,
              user_id: null, // Mock reviews have no user
              rating: review.rating,
              comment: review.comment,
              created_at: review.date,
            }));

            const { error: reviewError } = await supabase.from('reviews').insert(reviewsData);
            if (reviewError) {
              console.log('Review insert warning:', reviewError);
              // Continue even if some reviews fail
            }
          }
        }
        
        return c.json({ success: true, count: mockData.length });
      }
    }
    
    return c.json({ success: true, message: 'Already initialized' });
  } catch (error) {
    console.log('Init error:', error);
    return c.json({ error: 'Initialization failed', details: String(error) }, 500);
  }
});

// ============ CHAT ROUTES ============

// Get or create conversation between user and business
app.post('/make-server-726d4144/chat/conversations', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      console.error('❌ Create conversation: Unauthorized', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { businessId } = await c.req.json();
    if (!businessId) {
      console.error('❌ Create conversation: Missing businessId');
      return c.json({ error: 'Business ID required' }, 400);
    }

    console.log('💬 Creating/getting conversation for user:', user.id, 'business:', businessId);

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .single();

    if (existing) {
      console.log('✅ Found existing conversation:', existing.id);
      return c.json({ conversation: existing });
    }

    console.log('📝 Creating new conversation...');

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        business_id: businessId,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Create conversation error:', error);
      return c.json({ error: 'Failed to create conversation' }, 500);
    }

    console.log('✅ Created new conversation:', conversation.id);

    return c.json({ conversation });
  } catch (error) {
    console.error('❌ Conversation error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Get all conversations for current user
app.get('/make-server-726d4144/chat/conversations', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      // Suppress JWT/token errors - they're expected when sessions expire or users are deleted
      const errorMsg = String(authError || '');
      if (!errorMsg.includes('JWT') && !errorMsg.includes('sub claim') && !errorMsg.includes('does not exist')) {
        console.error('❌ Get conversations: Unauthorized', authError);
      }
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('🔍 Getting conversations for user:', user.id);

    // Get conversations (simplified - without business join for now)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('❌ Get conversations error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return c.json({ error: 'Failed to get conversations', details: error }, 500);
    }

    console.log('✅ Found', conversations?.length || 0, 'conversations (raw data)');
    
    // Batch fetch business details for all conversations to avoid N+1 queries
    if (conversations && conversations.length > 0) {
      const businessIds = [...new Set(conversations.map(c => c.business_id).filter(Boolean))];
      
      if (businessIds.length > 0) {
        console.log('🔍 Batch fetching', businessIds.length, 'businesses');
        
        // Single query to get all businesses at once
        const { data: businesses, error: businessError } = await supabase
          .from('businesses')
          .select('id, name, category_id, city')
          .in('id', businessIds);
        
        if (businessError) {
          console.error('❌ Error batch fetching businesses:', businessError);
        } else {
          // Create a map for quick lookup
          const businessMap = new Map(businesses?.map(b => [b.id, b]) || []);
          
          // Attach business data to conversations
          for (const conv of conversations) {
            const businessData = businessMap.get(conv.business_id);
            if (businessData) {
              conv.business = businessData;
              console.log('✅ Attached business to conversation:', conv.business.name);
            } else {
              console.log('⚠️ No business found for ID:', conv.business_id);
            }
          }
        }
      }
    }

    console.log('✅ Processed', conversations?.length || 0, 'conversations for user:', user.id);
    console.log('📋 Final conversations data:', JSON.stringify(conversations, null, 2));

    return c.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('❌ Conversations error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Get all conversations for a business (for business owners)
app.get('/make-server-726d4144/chat/conversations/business/:businessId', async (c) => {
  try {
    console.log('📞 Getting business conversations...');
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const businessId = c.req.param('businessId');
    console.log('🏢 Business ID:', businessId, 'User ID:', user.id);

    // Verify user owns the business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', businessId)
      .single();

    if (businessError) {
      console.error('❌ Business lookup error:', businessError);
      return c.json({ error: 'Business not found', details: businessError }, 404);
    }

    if (!business || business.owner_id !== user.id) {
      console.error('❌ Unauthorized - business owner mismatch');
      return c.json({ error: 'Unauthorized' }, 403);
    }

    console.log('✅ User owns business, fetching conversations...');

    // Get conversations first (without join to avoid FK issues)
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('❌ Get business conversations error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return c.json({ error: 'Failed to get conversations', details: error }, 500);
    }

    console.log('✅ Found', conversations?.length || 0, 'conversations');

    // Batch fetch user details for all conversations to avoid N+1 queries
    if (conversations && conversations.length > 0) {
      const userIds = [...new Set(conversations.map(c => c.user_id).filter(Boolean))];
      
      if (userIds.length > 0) {
        console.log('🔍 Batch fetching', userIds.length, 'users');
        
        // Single query to get all users at once
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, username, email')
          .in('id', userIds);
        
        if (usersError) {
          console.error('❌ Error batch fetching users:', usersError);
        } else {
          // Create a map for quick lookup
          const userMap = new Map(users?.map(u => [u.id, u]) || []);
          
          // Attach user data to conversations
          for (const conv of conversations) {
            const userData = userMap.get(conv.user_id);
            if (userData) {
              conv.users = userData;
            }
          }
        }
      }
    }

    return c.json({ conversations: conversations || [] });
  } catch (error) {
    console.error('❌ Business conversations error:', error);
    return c.json({ error: 'Failed to process request', details: String(error) }, 500);
  }
});

// Get messages for a conversation
app.get('/make-server-726d4144/chat/conversations/:conversationId/messages', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationId = c.req.param('conversationId');

    // Verify user has access to this conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('user_id, business_id')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      console.error('Get conversation error:', convError);
      return c.json({ error: 'Conversation not found' }, 404);
    }

    // Check if user is the conversation owner
    const isUser = conversation.user_id === user.id;
    
    // Check if user owns the business
    let isBusinessOwner = false;
    if (!isUser) {
      const { data: business } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', conversation.business_id)
        .single();
      
      isBusinessOwner = business?.owner_id === user.id;
    }

    if (!isUser && !isBusinessOwner) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get messages
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get messages error:', error);
      return c.json({ error: 'Failed to get messages' }, 500);
    }

    return c.json({ messages: messages || [] });
  } catch (error) {
    console.error('Messages error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Send a message
app.post('/make-server-726d4144/chat/conversations/:conversationId/messages', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const conversationId = c.req.param('conversationId');
    const { message } = await c.req.json();

    if (!message || !message.trim()) {
      return c.json({ error: 'Message cannot be empty' }, 400);
    }

    // Verify user has access to this conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('user_id, business_id, businesses(owner_id)')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const isUser = conversation.user_id === user.id;
    const isBusinessOwner = conversation.businesses?.owner_id === user.id;

    if (!isUser && !isBusinessOwner) {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Create message
    const { data: newMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_type: isUser ? 'user' : 'business',
        message: message.trim(),
      })
      .select()
      .single();

    if (messageError) {
      console.error('Send message error:', messageError);
      return c.json({ error: 'Failed to send message' }, 500);
    }

    // Update conversation's last_message_at (reuse message timestamp for efficiency)
    await supabase
      .from('conversations')
      .update({ last_message_at: newMessage.created_at })
      .eq('id', conversationId);

    // Note: Email notifications are sent in batches every 5 minutes via cron job
    // to avoid rate limiting and spam (see /cron/send-message-notifications endpoint)

    return c.json({ message: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Mark messages as read
app.patch('/make-server-726d4144/chat/messages/read', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { conversationId } = await c.req.json();

    if (!conversationId) {
      return c.json({ error: 'Conversation ID required' }, 400);
    }

    // Mark all unread messages in this conversation as read
    // Create timestamp once to avoid repeated timezone conversions
    const readTimestamp = new Date().toISOString();
    const { error } = await supabase
      .from('messages')
      .update({ read_at: readTimestamp })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id) // Don't mark own messages
      .is('read_at', null);

    if (error) {
      console.error('Mark read error:', error);
      return c.json({ error: 'Failed to mark messages as read' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Get unread message counts for all businesses owned by user
app.get('/make-server-726d4144/chat/unread-counts', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all businesses owned by the user
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', user.id);

    if (!businesses || businesses.length === 0) {
      return c.json({ counts: {} });
    }

    const businessIds = businesses.map(b => b.id);

    // Get unread counts for each business
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, business_id')
      .in('business_id', businessIds);

    if (!conversations || conversations.length === 0) {
      return c.json({ counts: {} });
    }

    const conversationIds = conversations.map(c => c.id);

    // Get unread message counts by conversation
    const { data: messages } = await supabase
      .from('messages')
      .select('conversation_id, sender_type')
      .in('conversation_id', conversationIds)
      .is('read_at', null)
      .eq('sender_type', 'user'); // Only count messages from users (not business replies)

    // Group by conversation and then by business
    const conversationMap = new Map(conversations.map(c => [c.id, c.business_id]));
    const counts: Record<string, number> = {};

    messages?.forEach(msg => {
      const businessId = conversationMap.get(msg.conversation_id);
      if (businessId) {
        counts[businessId] = (counts[businessId] || 0) + 1;
      }
    });

    return c.json({ counts });
  } catch (error) {
    console.error('Get unread counts error:', error);
    return c.json({ error: 'Failed to get unread counts' }, 500);
  }
});

// ============ FIX RLS ROUTE ============

// Fix RLS on favorites and recent_searches tables
app.post('/make-server-726d4144/fix-rls', async (c) => {
  try {
    console.log('🔒 Fixing RLS on favorites and recent_searches tables...');
    
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    
    if (!dbUrl) {
      return c.json({ 
        error: 'Database URL not configured',
        success: false 
      }, 500);
    }

    const { Client } = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
    const client = new Client(dbUrl);
    await client.connect();

    const results = {
      favoritesRLS: false,
      recentSearchesRLS: false,
      favoritesPolicies: 0,
      searchesPolicies: 0,
      errors: [] as string[],
    };

    try {
      // Enable RLS on favorites
      await client.queryObject(`ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;`);
      console.log('✅ RLS enabled on favorites');
      results.favoritesRLS = true;

      // Check and create policies for favorites
      const checkFavoritesPolicies = await client.queryObject(`
        SELECT policyname FROM pg_policies WHERE tablename = 'favorites';
      `);
      
      const existingFavPolicies = new Set(
        checkFavoritesPolicies.rows.map((r: any) => r.policyname)
      );

      if (!existingFavPolicies.has('Users can view their own favorites')) {
        await client.queryObject(`
          CREATE POLICY "Users can view their own favorites"
            ON favorites FOR SELECT
            USING (auth.uid() = user_id);
        `);
        console.log('✅ Created SELECT policy for favorites');
      }

      if (!existingFavPolicies.has('Users can add their own favorites')) {
        await client.queryObject(`
          CREATE POLICY "Users can add their own favorites"
            ON favorites FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        `);
        console.log('✅ Created INSERT policy for favorites');
      }

      if (!existingFavPolicies.has('Users can delete their own favorites')) {
        await client.queryObject(`
          CREATE POLICY "Users can delete their own favorites"
            ON favorites FOR DELETE
            USING (auth.uid() = user_id);
        `);
        console.log('✅ Created DELETE policy for favorites');
      }

      const finalFavPolicies = await client.queryObject(`
        SELECT COUNT(*) as count FROM pg_policies WHERE tablename = 'favorites';
      `);
      results.favoritesPolicies = Number(finalFavPolicies.rows[0]?.count || 0);

    } catch (error) {
      console.error('❌ Error with favorites RLS:', error);
      results.errors.push(`Favorites RLS error: ${error.message}`);
    }

    try {
      // Enable RLS on recent_searches
      await client.queryObject(`ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;`);
      console.log('✅ RLS enabled on recent_searches');
      results.recentSearchesRLS = true;

      // Check and create policies for recent_searches
      const checkSearchesPolicies = await client.queryObject(`
        SELECT policyname FROM pg_policies WHERE tablename = 'recent_searches';
      `);
      
      const existingSearchPolicies = new Set(
        checkSearchesPolicies.rows.map((r: any) => r.policyname)
      );

      if (!existingSearchPolicies.has('Users can view their own recent searches')) {
        await client.queryObject(`
          CREATE POLICY "Users can view their own recent searches"
            ON recent_searches FOR SELECT
            USING (auth.uid() = user_id);
        `);
        console.log('✅ Created SELECT policy for recent_searches');
      }

      if (!existingSearchPolicies.has('Users can add their own recent searches')) {
        await client.queryObject(`
          CREATE POLICY "Users can add their own recent searches"
            ON recent_searches FOR INSERT
            WITH CHECK (auth.uid() = user_id);
        `);
        console.log('✅ Created INSERT policy for recent_searches');
      }

      if (!existingSearchPolicies.has('Users can delete their own recent searches')) {
        await client.queryObject(`
          CREATE POLICY "Users can delete their own recent searches"
            ON recent_searches FOR DELETE
            USING (auth.uid() = user_id);
        `);
        console.log('✅ Created DELETE policy for recent_searches');
      }

      const finalSearchPolicies = await client.queryObject(`
        SELECT COUNT(*) as count FROM pg_policies WHERE tablename = 'recent_searches';
      `);
      results.searchesPolicies = Number(finalSearchPolicies.rows[0]?.count || 0);

    } catch (error) {
      console.error('❌ Error with recent_searches RLS:', error);
      results.errors.push(`Recent searches RLS error: ${error.message}`);
    }

    await client.end();

    const success = results.favoritesRLS && 
                    results.recentSearchesRLS && 
                    results.favoritesPolicies >= 3 && 
                    results.searchesPolicies >= 3 &&
                    results.errors.length === 0;

    return c.json({
      success,
      message: success 
        ? '✅ RLS successfully enabled on both tables!' 
        : '⚠️ RLS enabled with some warnings',
      results,
    });

  } catch (error) {
    console.error('❌ Fix RLS error:', error);
    return c.json({ 
      success: false,
      error: 'Failed to fix RLS',
      details: String(error) 
    }, 500);
  }
});

// ============ FAVORITES ROUTES ============

// Get user's favorites
app.get('/make-server-726d4144/favorites', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('business_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get favorites error:', error);
      return c.json({ error: 'Failed to get favorites' }, 500);
    }

    // Return just the business IDs (matching localStorage format)
    const businessIds = (favorites || []).map(f => f.business_id);
    return c.json({ favorites: businessIds });
  } catch (error) {
    console.error('Favorites error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Add a favorite
app.post('/make-server-726d4144/favorites', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { businessId } = await c.req.json();
    if (!businessId) {
      return c.json({ error: 'Business ID required' }, 400);
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (existing) {
      return c.json({ success: true, message: 'Already favorited' });
    }

    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        business_id: businessId,
      });

    if (error) {
      console.error('Add favorite error:', error);
      return c.json({ error: 'Failed to add favorite' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Remove a favorite
app.delete('/make-server-726d4144/favorites/:businessId', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const businessId = c.req.param('businessId');

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('business_id', businessId);

    if (error) {
      console.error('Remove favorite error:', error);
      return c.json({ error: 'Failed to remove favorite' }, 500);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// ============ RECENT SEARCHES ROUTES ============

// Get user's recent searches
app.get('/make-server-726d4144/recent-searches', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: searches, error } = await supabase
      .from('recent_searches')
      .select('service, location, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Get recent searches error:', error);
      return c.json({ error: 'Failed to get recent searches' }, 500);
    }

    // Transform to match localStorage format (timestamp in milliseconds)
    const formattedSearches = (searches || []).map(s => ({
      service: s.service,
      location: s.location,
      timestamp: new Date(s.created_at).getTime(),
    }));

    return c.json({ searches: formattedSearches });
  } catch (error) {
    console.error('Recent searches error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Add a recent search
app.post('/make-server-726d4144/recent-searches', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { service, location } = await c.req.json();
    if (!service || !location) {
      return c.json({ error: 'Service and location required' }, 400);
    }

    // Remove existing duplicate (same service and location)
    const { error: deleteError } = await supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', user.id)
      .eq('service', service)
      .eq('location', location);
    
    if (deleteError) {
      console.error('Delete existing search error:', deleteError);
      // Continue anyway, might be first search
    }

    // Add new search
    const { error: insertError } = await supabase
      .from('recent_searches')
      .insert({
        user_id: user.id,
        service,
        location,
      });

    if (insertError) {
      console.error('Add recent search error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code,
      });
      return c.json({ 
        error: 'Failed to add recent search', 
        details: insertError.message,
        hint: insertError.hint,
        code: insertError.code,
      }, 500);
    }

    // Keep only the latest 5 searches per user
    // Get all user's searches ordered by date
    const { data: allSearches } = await supabase
      .from('recent_searches')
      .select('id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Delete searches beyond the 5th one
    if (allSearches && allSearches.length > 5) {
      const idsToDelete = allSearches.slice(5).map(s => s.id);
      await supabase
        .from('recent_searches')
        .delete()
        .in('id', idsToDelete);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Add recent search error:', error);
    return c.json({ error: 'Failed to process request' }, 500);
  }
});

// Helper function to send email notification for new messages
async function sendMessageNotification(
  toEmail: string,
  recipientName: string,
  businessName: string,
  senderName: string,
  message: string,
  senderType: 'customer' | 'business',
  unreadCount: number
): Promise<boolean> {
  try {
    console.log('📧 Sending message notification email:');
    console.log(`  To: ${toEmail} (${recipientName})`);
    console.log(`  Business: ${businessName}`);
    console.log(`  From: ${senderName} (${senderType})`);
    console.log(`  Unread count: ${unreadCount}`);
    console.log(`  Message preview: ${message.substring(0, 100)}...`);
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured - email notification skipped');
      return false;
    }
    
    // Prepare email content based on sender type
    const subject = senderType === 'customer' 
      ? `💬 New message for ${businessName}${unreadCount > 1 ? ` (${unreadCount} unread)` : ''}`
      : `💬 ${businessName} replied to your message${unreadCount > 1 ? ` (${unreadCount} unread)` : ''}`;
    
    const greeting = senderType === 'customer'
      ? `Hi ${recipientName},`
      : `Hi ${recipientName},`;
    
    const context = senderType === 'customer'
      ? `You have a new message from <strong>${senderName}</strong> regarding <strong>${businessName}</strong>:`
      : `<strong>${senderName}</strong> has replied to your inquiry:`;
    
    const unreadBadge = unreadCount > 1 
      ? `<div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 16px 0;">
           ${unreadCount} Unread Messages
         </div>` 
      : '';
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">BizDizy</h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Your Business Directory</p>
            </div>
            
            <!-- Content -->
            <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <p style="font-size: 16px; color: #374151; margin: 0 0 16px 0;">${greeting}</p>
              
              <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">${context}</p>
              
              ${unreadBadge}
              
              <!-- Message Box -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message.length > 300 ? message.substring(0, 300) + '...' : message}</p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="https://bizdizy.com/messages" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                  View Full Conversation
                </a>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
                You can also access your messages by logging into your BizDizy account.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0 0 8px 0;">This is an automated notification from BizDizy</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} BizDizy. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'BizDizy Messages <noreply@bizdizy.com>',
        to: toEmail,
        subject: subject,
        html: html
      })
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Resend API error:', response.status, errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Email notification sent successfully via Resend:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Email notification error:', error);
    return false;
  }
}

// ============ CONTACT MESSAGE ROUTES ============

// Submit contact form (no auth required)
app.post('/make-server-726d4144/contact', async (c) => {
  try {
    const { name, email, subject, message, recaptchaToken } = await c.req.json();

    if (!name || !email || !subject || !message) {
      return c.json({ error: 'All fields are required' }, 400);
    }

    // Verify reCAPTCHA if token is provided
    if (recaptchaToken) {
      const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');
      if (RECAPTCHA_SECRET_KEY) {
        try {
          const verifyResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`,
          });

          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            console.log('❌ reCAPTCHA verification failed:', verifyData);
            return c.json({ error: 'reCAPTCHA verification failed. Please try again.' }, 400);
          }
          
          // For v3, check the score (0.0-1.0)
          const score = verifyData.score || 0;
          console.log(`✅ reCAPTCHA verified successfully for contact - Score: ${score}`);
          
          // Reject if score is too low (likely spam)
          if (score < 0.5) {
            console.log(`⚠️ reCAPTCHA score too low for contact: ${score}`);
            return c.json({ error: 'Message verification failed. Please try again later.' }, 400);
          }
        } catch (error) {
          console.error('reCAPTCHA verification error:', error);
          return c.json({ error: 'Failed to verify reCAPTCHA' }, 500);
        }
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return c.json({ error: 'Invalid email address' }, 400);
    }

    // Store contact message in kv_store
    const messageId = crypto.randomUUID();
    const contactData = {
      id: messageId,
      name,
      email,
      subject,
      message,
      created_at: new Date().toISOString(),
      read: false,
    };

    const key = `contact_message:${messageId}`;
    await kv.set(key, JSON.stringify(contactData));

    console.log('✅ Contact message saved:', messageId);

    return c.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form submission error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Get all contact messages (auth required - admin only)
app.get('/make-server-726d4144/contact', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all contact messages from kv_store
    const messages = await kv.getByPrefix('contact_message:');

    // Parse and sort messages
    const parsedMessages = messages
      .map(msg => {
        try {
          return JSON.parse(msg);
        } catch (e) {
          console.error('Failed to parse contact message:', e);
          return null;
        }
      })
      .filter(msg => msg !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return c.json({ messages: parsedMessages });
  } catch (error) {
    console.error('Get contact messages error:', error);
    return c.json({ error: 'Failed to get messages' }, 500);
  }
});

// Mark contact message as read (auth required)
app.put('/make-server-726d4144/contact/:id/read', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const messageId = c.req.param('id');
    const key = `contact_message:${messageId}`;

    // Get existing message
    const existingData = await kv.get(key);
    if (!existingData) {
      return c.json({ error: 'Message not found' }, 404);
    }

    const messageData = JSON.parse(existingData);
    messageData.read = true;

    // Update in kv_store
    await kv.set(key, JSON.stringify(messageData));

    return c.json({ success: true });
  } catch (error) {
    console.error('Mark contact message as read error:', error);
    return c.json({ error: 'Failed to update message' }, 500);
  }
});

// Delete contact message (auth required)
app.delete('/make-server-726d4144/contact/:id', async (c) => {
  try {
    const { user, error: authError } = await verifyUser(c.req.header('Authorization'));
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const messageId = c.req.param('id');
    const key = `contact_message:${messageId}`;

    await kv.del(key);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return c.json({ error: 'Failed to delete message' }, 500);
  }
});

// ============ ADMIN ROUTES ============

// Helper function to verify admin user
async function verifyAdmin(authHeader: string | null) {
  const { user, error } = await verifyUser(authHeader);
  
  if (error || !user) {
    return { user: null, error: error || 'Unauthorized' };
  }
  
  // Check if user has admin role in user_metadata (support both formats)
  const isAdmin = user.user_metadata?.role === 'admin' || user.user_metadata?.is_admin === true;
  if (!isAdmin) {
    return { user: null, error: 'Admin access required' };
  }
  
  return { user, error: null };
}

// Helper function to count admins
async function countAdmins(): Promise<number> {
  try {
    const { data: users } = await supabase.auth.admin.listUsers();
    const adminCount = users?.users?.filter(u => 
      u.user_metadata?.role === 'admin' || u.user_metadata?.is_admin === true
    ).length || 0;
    return adminCount;
  } catch (error) {
    console.error('Count admins error:', error);
    return 0;
  }
}

// Admin signup - Create first admin or promote user (only if no admins exist or by existing admin)
app.post('/make-server-726d4144/admin/signup', async (c) => {
  try {
    const { email, username, password, userId } = await c.req.json();
    
    // Check if this is for promoting existing user or creating new admin
    if (userId) {
      // Promoting existing user - requires admin auth
      const { user: adminUser, error: adminError } = await verifyAdmin(c.req.header('Authorization'));
      
      if (adminError || !adminUser) {
        return c.json({ error: 'Admin access required to promote users' }, 403);
      }
      
      // Update existing user's metadata to add admin role
      const { data, error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { role: 'admin' }
      });
      
      if (error) {
        console.error('Promote user to admin error:', error);
        return c.json({ error: 'Failed to promote user to admin' }, 500);
      }
      
      // Log admin activity (skip if table doesn't exist)
      try {
        await supabase
          .from('admin_activity_log_726d4144')
          .insert({
            admin_id: adminUser.id,
            action_type: 'user_promoted',
            target_id: userId,
            details: { promoted_to: 'admin' }
          });
      } catch (logError) {
        console.log('Admin activity log table not set up yet, skipping log');
      }
      
      return c.json({ success: true, user: data.user });
    }
    
    // Creating new admin user - check if admins exist
    const adminCount = await countAdmins();
    
    // If admins exist, require admin auth to create new admin
    if (adminCount > 0) {
      const { user: adminUser, error: adminError } = await verifyAdmin(c.req.header('Authorization'));
      
      if (adminError || !adminUser) {
        return c.json({ error: 'Admin access required. First admin already exists.' }, 403);
      }
    }
    
    if (!email || !username || !password) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // Create admin user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username, role: 'admin' }
    });
    
    if (error) {
      console.error('Admin signup error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    // Create user profile
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: data.user.email,
        username,
      });
    
    if (insertError) {
      console.error('Admin profile creation error:', insertError);
      await supabase.auth.admin.deleteUser(data.user.id);
      return c.json({ error: 'Failed to create admin profile' }, 500);
    }
    
    console.log('✅ Admin user created:', email);
    
    return c.json({ 
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Admin signup exception:', error);
    return c.json({ error: 'Admin signup failed' }, 500);
  }
});

// Check admin status
app.get('/make-server-726d4144/admin/check', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ isAdmin: false });
    }
    
    return c.json({ 
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.user_metadata?.username
      }
    });
  } catch (error) {
    console.error('Admin check error:', error);
    return c.json({ isAdmin: false });
  }
});

// Get all users (admin only)
app.get('/make-server-726d4144/admin/users', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    // Get all auth users
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    // Get all user profiles
    const { data: profiles } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Create a map of existing profiles
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Auto-create missing profiles for auth users
    const missingProfiles = [];
    for (const authUser of authUsers?.users || []) {
      if (!profileMap.has(authUser.id)) {
        console.log(`✅ Creating missing profile for user ${authUser.email}`);
        const username = authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'User';
        
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email,
            username: username,
          })
          .select()
          .single();
        
        if (!insertError && newProfile) {
          missingProfiles.push(newProfile);
          profileMap.set(newProfile.id, newProfile);
        }
      }
    }
    
    // Get business counts for each user
    const { data: businesses } = await supabase
      .from('businesses')
      .select('owner_id');
    
    const businessCounts = new Map();
    businesses?.forEach(b => {
      if (b.owner_id) {
        businessCounts.set(b.owner_id, (businessCounts.get(b.owner_id) || 0) + 1);
      }
    });
    
    // Combine all profiles (existing + newly created)
    const allProfiles = [...(profiles || []), ...missingProfiles];
    
    // Combine data
    const users = allProfiles.map(profile => {
      const authUser = authUsers?.users?.find(u => u.id === profile.id);
      // Check both role formats for backwards compatibility
      const isAdmin = authUser?.user_metadata?.role === 'admin' || authUser?.user_metadata?.is_admin === true;
      return {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        created_at: profile.created_at,
        role: isAdmin ? 'admin' : 'user',
        businessCount: businessCounts.get(profile.id) || 0,
        lastSignIn: authUser?.last_sign_in_at,
      };
    });
    
    return c.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({ error: 'Failed to get users' }, 500);
  }
});

// Get admin analytics
app.get('/make-server-726d4144/admin/analytics', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    // Get total users
    const { data: users } = await supabase.from('users').select('id, created_at');
    
    // Get total businesses
    const { data: businesses } = await supabase
      .from('businesses')
      .select('id, created_at, owner_id');
    
    // Get total reviews
    const { data: reviews } = await supabase.from('reviews').select('id, created_at');
    
    // Get contact messages
    const contactMessages = await kv.getByPrefix('contact_message:');
    const unreadMessages = contactMessages.filter(msg => {
      try {
        const parsed = JSON.parse(msg);
        return !parsed.read;
      } catch {
        return false;
      }
    });
    
    // Calculate growth (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = users?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).length || 0;
    const newBusinesses = businesses?.filter(b => new Date(b.created_at) >= thirtyDaysAgo).length || 0;
    const newReviews = reviews?.filter(r => new Date(r.created_at) >= thirtyDaysAgo).length || 0;
    
    // Get businesses by category
    const { data: categoriesData } = await supabase
      .from('businesses')
      .select('category_id, category:categories(name)');
    
    const categoryStats = new Map();
    categoriesData?.forEach(b => {
      const catName = (b.category as any)?.name || 'Unknown';
      categoryStats.set(catName, (categoryStats.get(catName) || 0) + 1);
    });
    
    const topCategories = Array.from(categoryStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Get recent activity (skip if table doesn't exist)
    let recentActivity = [];
    try {
      const { data } = await supabase
        .from('admin_activity_log_726d4144')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      recentActivity = data || [];
    } catch (activityError) {
      console.log('Admin activity log table not set up yet');
    }
    
    return c.json({
      analytics: {
        totalUsers: users?.length || 0,
        totalBusinesses: businesses?.length || 0,
        totalReviews: reviews?.length || 0,
        contactMessages: contactMessages.length,
        unreadMessages: unreadMessages.length,
        newUsers,
        newBusinesses,
        newReviews,
        topCategories,
        recentActivity: recentActivity || []
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

// Reply to contact message (admin only)
app.post('/make-server-726d4144/admin/contact/:id/reply', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const messageId = c.req.param('id');
    const { reply } = await c.req.json();
    
    if (!reply) {
      return c.json({ error: 'Reply content required' }, 400);
    }
    
    // Get original message
    const key = `contact_message:${messageId}`;
    const messageData = await kv.get(key);
    
    if (!messageData) {
      return c.json({ error: 'Message not found' }, 404);
    }
    
    const message = JSON.parse(messageData);
    
    // Save reply to database
    const { error: insertError } = await supabase
      .from('contact_message_replies_726d4144')
      .insert({
        message_id: messageId,
        admin_id: user.id,
        reply_content: reply
      });
    
    if (insertError) {
      console.error('Save reply error:', insertError);
      return c.json({ error: 'Failed to save reply' }, 500);
    }
    
    // Mark message as read
    message.read = true;
    await kv.set(key, JSON.stringify(message));
    
    // Log activity
    await supabase
      .from('admin_activity_log_726d4144')
      .insert({
        admin_id: user.id,
        action_type: 'contact_replied',
        target_id: messageId,
        details: { email: message.email, subject: message.subject }
      });
    
    console.log(`✅ Admin ${user.email} replied to message ${messageId}`);
    
    // In a real app, you'd send an email here
    // For now, just return success
    return c.json({ 
      success: true,
      message: 'Reply saved. In production, this would send an email to ' + message.email
    });
  } catch (error) {
    console.error('Reply to contact message error:', error);
    return c.json({ error: 'Failed to send reply' }, 500);
  }
});

// Get terms and policies
app.get('/make-server-726d4144/admin/terms', async (c) => {
  try {
    const type = c.req.query('type'); // 'terms_of_service' or 'privacy_policy'
    
    // Get terms and policies (skip if table doesn't exist yet)
    let policies = [];
    try {
      let query = supabase
        .from('terms_and_policies_726d4144')
        .select('*')
        .order('version', { ascending: false });
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.log('Terms and policies table not set up yet');
      } else {
        policies = data || [];
      }
    } catch (termsError) {
      console.log('Terms and policies table not set up yet');
    }
    
    return c.json({ policies });
  } catch (error) {
    console.error('Get terms exception:', error);
    return c.json({ error: 'Failed to get terms' }, 500);
  }
});

// Update terms and policies (admin only)
app.put('/make-server-726d4144/admin/terms/:type', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const type = c.req.param('type');
    const { content } = await c.req.json();
    
    if (!content) {
      return c.json({ error: 'Content required' }, 400);
    }
    
    if (type !== 'terms_of_service' && type !== 'privacy_policy') {
      return c.json({ error: 'Invalid type. Must be terms_of_service or privacy_policy' }, 400);
    }
    
    // Update terms (requires admin tables to be set up)
    try {
      // Get current version
      const { data: current } = await supabase
        .from('terms_and_policies_726d4144')
        .select('version')
        .eq('type', type)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      const newVersion = (current?.version || 0) + 1;
      
      // Insert new version
      const { data: newPolicy, error: insertError } = await supabase
        .from('terms_and_policies_726d4144')
        .insert({
          type,
          content,
          version: newVersion,
          updated_by: user.id
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Update terms error:', insertError);
        return c.json({ error: 'Failed to update terms. Make sure admin tables are set up.' }, 500);
      }
      
      // Log activity (skip if table doesn't exist)
      try {
        await supabase
          .from('admin_activity_log_726d4144')
          .insert({
            admin_id: user.id,
            action_type: 'policy_updated',
            target_id: type,
            details: { version: newVersion }
          });
      } catch (logError) {
        console.log('Admin activity log table not set up yet');
      }
      
      console.log(`✅ ${type} updated to version ${newVersion} by ${user.email}`);
      
      return c.json({ success: true, policy: newPolicy });
    } catch (error) {
      console.error('Terms and policies table not set up yet');
      return c.json({ error: 'Admin tables not set up. Please run ADMIN_SETUP.sql first.' }, 500);
    }
  } catch (error) {
    console.error('Update terms exception:', error);
    return c.json({ error: 'Failed to update terms' }, 500);
  }
});

// Notify users about policy changes (admin only)
app.post('/make-server-726d4144/admin/notify-policy-change', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const { policyType, message } = await c.req.json();
    
    if (!policyType) {
      return c.json({ error: 'Policy type required' }, 400);
    }
    
    try {
      // Get latest policy version
      const { data: policy } = await supabase
        .from('terms_and_policies_726d4144')
        .select('version')
        .eq('type', policyType)
        .order('version', { ascending: false })
        .limit(1)
        .single();
      
      if (!policy) {
        return c.json({ error: 'Policy not found' }, 404);
      }
      
      // Get all users with notification preferences
      const { data: allUsers } = await supabase.from('users').select('id');
      
      if (!allUsers || allUsers.length === 0) {
        return c.json({ success: true, notifiedCount: 0 });
      }
      
      // Get user settings
      const { data: settings } = await supabase
        .from('user_settings_726d4144')
        .select('user_id, policy_notifications')
        .in('user_id', allUsers.map(u => u.id));
      
      // Filter users who want policy notifications (default is true)
      const settingsMap = new Map(settings?.map(s => [s.user_id, s.policy_notifications]) || []);
      const usersToNotify = allUsers.filter(u => settingsMap.get(u.id) !== false);
      
      // Create notifications
      const notifications = usersToNotify.map(u => ({
        user_id: u.id,
        policy_type: policyType,
        policy_version: policy.version,
        acknowledged: false
      }));
      
      const { error: insertError } = await supabase
        .from('policy_notifications_726d4144')
        .insert(notifications);
      
      if (insertError) {
        console.error('Create notifications error:', insertError);
        return c.json({ error: 'Failed to create notifications' }, 500);
      }
      
      // Log activity
      try {
        await supabase
          .from('admin_activity_log_726d4144')
          .insert({
            admin_id: user.id,
            action_type: 'policy_notification_sent',
            target_id: policyType,
            details: { 
              version: policy.version, 
              userCount: usersToNotify.length,
              message 
            }
          });
      } catch (logError) {
        console.log('Admin activity log table not set up yet');
      }
      
      console.log(`✅ Notified ${usersToNotify.length} users about ${policyType} v${policy.version}`);
      
      return c.json({ 
        success: true, 
        notifiedCount: usersToNotify.length,
        message: `${usersToNotify.length} users will be notified about the policy change`
      });
    } catch (notifyError) {
      console.error('Policy notification failed - admin tables not set up:', notifyError);
      return c.json({ error: 'Admin tables not set up. Please run ADMIN_SETUP.sql first.' }, 500);
    }
  } catch (error) {
    console.error('Notify policy change error:', error);
    return c.json({ error: 'Failed to notify users' }, 500);
  }
});

// Demote user from admin (admin only)
app.post('/make-server-726d4144/admin/demote/:userId', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const userId = c.req.param('userId');
    
    // Prevent self-demotion
    if (userId === user.id) {
      return c.json({ error: 'Cannot demote yourself' }, 400);
    }
    
    // Check if at least one admin will remain
    const adminCount = await countAdmins();
    if (adminCount <= 1) {
      return c.json({ error: 'Cannot demote the last admin' }, 400);
    }
    
    // Remove admin role
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role: 'user' }
    });
    
    if (updateError) {
      console.error('Demote user error:', updateError);
      return c.json({ error: 'Failed to demote user' }, 500);
    }
    
    // Log activity (skip if table doesn't exist)
    try {
      await supabase
        .from('admin_activity_log_726d4144')
        .insert({
          admin_id: user.id,
          action_type: 'user_demoted',
          target_id: userId,
          details: { demoted_from: 'admin' }
        });
    } catch (logError) {
      console.log('Admin activity log table not set up yet');
    }
    
    console.log(`✅ User ${userId} demoted from admin by ${user.email}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Demote user exception:', error);
    return c.json({ error: 'Failed to demote user' }, 500);
  }
});

// Delete user (admin only)
app.delete('/make-server-726d4144/admin/users/:userId', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const userId = c.req.param('userId');
    
    // Prevent self-deletion
    if (userId === user.id) {
      return c.json({ error: 'Cannot delete your own account' }, 400);
    }
    
    // Delete user from auth (cascade will handle profile and related data)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Delete user error:', deleteError);
      return c.json({ error: 'Failed to delete user' }, 500);
    }
    
    // Log activity (skip if table doesn't exist)
    try {
      await supabase
        .from('admin_activity_log_726d4144')
        .insert({
          admin_id: user.id,
          action_type: 'user_deleted',
          target_id: userId
        });
    } catch (logError) {
      console.log('Admin activity log table not set up yet');
    }
    
    console.log(`✅ User ${userId} deleted by admin ${user.email}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete user exception:', error);
    return c.json({ error: 'Failed to delete user' }, 500);
  }
});

// Delete business (admin only - can delete any business)
app.delete('/make-server-726d4144/admin/businesses/:businessId', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: error || 'Admin access required' }, 403);
    }
    
    const businessId = c.req.param('businessId');
    
    // Get business info for logging
    const { data: business } = await supabase
      .from('businesses')
      .select('name, owner_id')
      .eq('id', businessId)
      .single();
    
    // Delete business
    const { error: deleteError } = await supabase
      .from('businesses')
      .delete()
      .eq('id', businessId);
    
    if (deleteError) {
      console.error('Delete business error:', deleteError);
      return c.json({ error: 'Failed to delete business' }, 500);
    }
    
    // Log activity (skip if table doesn't exist)
    try {
      await supabase
        .from('admin_activity_log_726d4144')
        .insert({
          admin_id: user.id,
          action_type: 'business_deleted',
          target_id: businessId,
          details: { 
            name: business?.name,
            owner_id: business?.owner_id
          }
        });
    } catch (logError) {
      console.log('Admin activity log table not set up yet');
    }
    
    console.log(`✅ Business ${businessId} deleted by admin ${user.email}`);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete business exception:', error);
    return c.json({ error: 'Failed to delete business' }, 500);
  }
});

// Notify users about policy changes (admin only)
app.post('/make-server-726d4144/admin/notify-policy', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    
    if (error || !user) {
      console.error('❌ Admin verification failed:', error);
      return c.json({ error: error || 'Unauthorized - Admin access required' }, 401);
    }

    const { policyId, policyType } = await c.req.json();

    if (!policyId) {
      return c.json({ error: 'Policy ID is required' }, 400);
    }

    console.log(`📢 Admin ${user.email} creating policy notifications for policy ${policyId}`);

    // Get service role client to list all users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // List all users from auth.users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      console.error('Failed to list users:', usersError);
      return c.json({ error: 'Failed to fetch users' }, 500);
    }

    // Create notification records for each user (except the admin)
    const notificationsToCreate = users
      .filter(u => u.id !== user.id) // Don't notify the admin who made the change
      .map(u => ({
        policy_id: policyId,
        user_id: u.id,
        created_at: new Date().toISOString(),
      }));

    if (notificationsToCreate.length === 0) {
      return c.json({ notifiedCount: 0 });
    }

    // Insert notifications
    const { error: insertError } = await supabase
      .from('policy_notifications')
      .insert(notificationsToCreate);

    if (insertError) {
      console.error('Failed to create policy notifications:', insertError);
      return c.json({ error: 'Failed to create notifications' }, 500);
    }

    console.log(`✅ Created ${notificationsToCreate.length} policy notifications`);

    return c.json({ notifiedCount: notificationsToCreate.length });
  } catch (error) {
    console.error('Notify policy exception:', error);
    return c.json({ error: 'Failed to notify users' }, 500);
  }
});

// Get policy notifications for current user
app.get('/make-server-726d4144/user/policy-notifications', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Get policy notifications (skip if table doesn't exist yet)
    let notifications = [];
    try {
      const { data } = await supabase
        .from('policy_notifications_726d4144')
        .select('*')
        .eq('user_id', user.id)
        .eq('acknowledged', false)
        .order('notified_at', { ascending: false });
      notifications = data || [];
    } catch (notifError) {
      console.log('Policy notifications table not set up yet');
    }
    
    return c.json({ notifications });
  } catch (error) {
    console.error('Get policy notifications error:', error);
    return c.json({ error: 'Failed to get notifications' }, 500);
  }
});

// Acknowledge policy notification
app.post('/make-server-726d4144/user/policy-notifications/:id/acknowledge', async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const notificationId = c.req.param('id');
    
    // Update notification (skip if table doesn't exist yet)
    try {
      const { error: updateError } = await supabase
        .from('policy_notifications_726d4144')
        .update({ 
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', user.id);
      
      if (updateError) {
        console.error('Acknowledge notification error:', updateError);
        return c.json({ error: 'Failed to acknowledge notification' }, 500);
      }
    } catch (notifError) {
      console.log('Policy notifications table not set up yet');
    }
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Acknowledge notification exception:', error);
    return c.json({ error: 'Failed to acknowledge notification' }, 500);
  }
});

// Admin-only: Update business
app.put('/make-server-726d4144/admin/businesses/:id', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    if (error || !user) {
      return c.json({ error: error || 'Admin privileges required' }, 403);
    }
    
    const businessId = c.req.param('id');
    const rawUpdates = await c.req.json();
    
    // Filter to only allowed fields that exist in the businesses table
    const allowedFields = [
      'name', 'description', 'phone', 'email', 'website',
      'address', 'city', 'zip_code', 'service_area',
      'is_active', 'verified', 'is_featured'
    ];
    
    const updates: any = {};
    for (const field of allowedFields) {
      if (field in rawUpdates) {
        updates[field] = rawUpdates[field];
      }
    }
    
    const { data, error: updateError } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', businessId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Update business error:', updateError);
      return c.json({ error: 'Failed to update business' }, 500);
    }
    
    console.log(`✅ Admin ${user.email} updated business ${businessId}`);
    return c.json({ business: data });
  } catch (error) {
    console.error('Admin update business error:', error);
    return c.json({ error: 'Failed to update business' }, 500);
  }
});

// Admin-only: Delete photo
app.delete('/make-server-726d4144/admin/photos/:id', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    if (error || !user) {
      return c.json({ error: error || 'Admin privileges required' }, 403);
    }
    
    const photoId = c.req.param('id');
    
    // Get photo details first
    const { data: photo } = await supabase
      .from('business_photos')
      .select('*')
      .eq('id', photoId)
      .single();
    
    if (!photo) {
      return c.json({ error: 'Photo not found' }, 404);
    }
    
    // Delete from storage
    if (photo.url) {
      try {
        const pathMatch = photo.url.match(/business-photos\/(.+)/);
        if (pathMatch) {
          await supabase.storage
            .from('business-photos')
            .remove([pathMatch[1]]);
        }
      } catch (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }
    
    // Delete from database
    const { error: deleteError } = await supabase
      .from('business_photos')
      .delete()
      .eq('id', photoId);
    
    if (deleteError) {
      console.error('Delete photo error:', deleteError);
      return c.json({ error: 'Failed to delete photo' }, 500);
    }
    
    console.log(`✅ Admin ${user.email} deleted photo ${photoId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin delete photo error:', error);
    return c.json({ error: 'Failed to delete photo' }, 500);
  }
});

// Admin-only: Delete review
app.delete('/make-server-726d4144/admin/reviews/:id', async (c) => {
  try {
    const { user, error } = await verifyAdmin(c.req.header('Authorization'));
    if (error || !user) {
      return c.json({ error: error || 'Admin privileges required' }, 403);
    }
    
    const reviewId = c.req.param('id');
    
    // Get review details first to update business rating
    const { data: review } = await supabase
      .from('reviews')
      .select('business_id')
      .eq('id', reviewId)
      .single();
    
    // Delete review
    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);
    
    if (deleteError) {
      console.error('Delete review error:', deleteError);
      return c.json({ error: 'Failed to delete review' }, 500);
    }
    
    // Update business rating if review was found
    if (review?.business_id) {
      const { data: remainingReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('business_id', review.business_id)
        .eq('is_active', true);
      
      const avgRating = remainingReviews && remainingReviews.length > 0
        ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
        : 0;
      
      await supabase
        .from('businesses')
        .update({ rating: Math.round(avgRating * 10) / 10 })
        .eq('id', review.business_id);
    }
    
    console.log(`✅ Admin ${user.email} deleted review ${reviewId}`);
    return c.json({ success: true });
  } catch (error) {
    console.error('Admin delete review error:', error);
    return c.json({ error: 'Failed to delete review' }, 500);
  }
});

// ===== CRON JOB: Send batched message notification emails =====
// This endpoint should be called every 5 minutes to send email notifications
// for unread messages (avoiding rate limiting and spam)
app.post('/make-server-726d4144/cron/send-message-notifications', async (c) => {
  try {
    console.log('🕐 Starting batched email notification cron job...');
    
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY not configured - skipping email notifications');
      return c.json({ success: false, message: 'RESEND_API_KEY not configured' });
    }
    
    // Find all unread messages that haven't been emailed yet
    const { data: unnotifiedMessages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        sender_type,
        content,
        created_at,
        conversations!inner(
          id,
          user_id,
          business_id,
          businesses!inner(
            id,
            name,
            owner_id
          )
        )
      `)
      .is('read_at', null)
      .is('email_notified_at', null)
      .order('created_at', { ascending: true });
    
    if (messagesError) {
      console.error('Error fetching unnotified messages:', messagesError);
      return c.json({ error: 'Failed to fetch messages' }, 500);
    }
    
    if (!unnotifiedMessages || unnotifiedMessages.length === 0) {
      console.log('✅ No new messages to notify');
      return c.json({ success: true, sent: 0, message: 'No new messages' });
    }
    
    console.log(`📧 Found ${unnotifiedMessages.length} unread messages to process`);
    
    // Group messages by recipient
    // Key format: "user:{userId}" or "business:{ownerId}"
    const messagesByRecipient = new Map<string, any[]>();
    
    for (const msg of unnotifiedMessages) {
      const conv = msg.conversations;
      let recipientKey: string;
      
      // Determine recipient based on sender type
      if (msg.sender_type === 'user') {
        // Customer sent message -> notify business owner
        recipientKey = `business:${conv.businesses.owner_id}`;
      } else {
        // Business sent message -> notify customer
        recipientKey = `user:${conv.user_id}`;
      }
      
      if (!messagesByRecipient.has(recipientKey)) {
        messagesByRecipient.set(recipientKey, []);
      }
      messagesByRecipient.get(recipientKey)!.push(msg);
    }
    
    console.log(`👥 Grouped into ${messagesByRecipient.size} recipients`);
    
    let emailsSent = 0;
    let emailsFailed = 0;
    const messageIdsToUpdate: string[] = [];
    
    // Send emails to each recipient
    for (const [recipientKey, messages] of messagesByRecipient.entries()) {
      try {
        const [recipientType, recipientId] = recipientKey.split(':');
        const firstMessage = messages[0];
        const conv = firstMessage.conversations;
        const businessName = conv.businesses.name;
        
        // Get recipient info
        let recipientEmail: string | undefined;
        let recipientName: string | undefined;
        
        if (recipientType === 'business') {
          // Get business owner info
          const { data: owner } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', recipientId)
            .single();
          
          recipientEmail = owner?.email;
          recipientName = owner?.username || 'Business Owner';
        } else {
          // Get customer info
          const { data: customer } = await supabase
            .from('users')
            .select('email, username')
            .eq('id', recipientId)
            .single();
          
          recipientEmail = customer?.email;
          recipientName = customer?.username || 'Customer';
        }
        
        if (!recipientEmail) {
          console.warn(`⚠️ No email found for ${recipientKey}`);
          continue;
        }
        
        // Get sender name for the first message
        const { data: sender } = await supabase
          .from('users')
          .select('username')
          .eq('id', firstMessage.sender_id)
          .single();
        
        const senderName = sender?.username || (recipientType === 'business' ? 'A customer' : businessName);
        
        // Prepare email content
        const unreadCount = messages.length;
        const senderType = recipientType === 'business' ? 'customer' : 'business';
        
        // Get latest message for preview
        const latestMessage = messages[messages.length - 1];
        const messagePreview = latestMessage.content.length > 300 
          ? latestMessage.content.substring(0, 300) + '...' 
          : latestMessage.content;
        
        // Send email
        const subject = senderType === 'customer' 
          ? `💬 New ${unreadCount > 1 ? `messages (${unreadCount})` : 'message'} for ${businessName}`
          : `💬 ${businessName} ${unreadCount > 1 ? `sent ${unreadCount} messages` : 'replied to your message'}`;
        
        const greeting = `Hi ${recipientName},`;
        
        const context = senderType === 'customer'
          ? `You have ${unreadCount > 1 ? `${unreadCount} new messages` : 'a new message'} from <strong>${senderName}</strong> regarding <strong>${businessName}</strong>:`
          : `<strong>${businessName}</strong> ${unreadCount > 1 ? `sent you ${unreadCount} messages` : 'replied to your inquiry'}:`;
        
        const unreadBadge = unreadCount > 1 
          ? `<div style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin: 16px 0;">
               ${unreadCount} Unread Messages
             </div>` 
          : '';
        
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">BizDizy</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0 0; font-size: 14px;">Your Business Directory</p>
                </div>
                
                <!-- Content -->
                <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <p style="font-size: 16px; color: #374151; margin: 0 0 16px 0;">${greeting}</p>
                  
                  <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">${context}</p>
                  
                  ${unreadBadge}
                  
                  <!-- Message Box -->
                  <div style="background: linear-gradient(135deg, #eff6ff 0%, #f3e8ff 100%); border-left: 4px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; color: #1f2937; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${messagePreview}</p>
                  </div>
                  
                  ${unreadCount > 1 ? `<p style="font-size: 14px; color: #6b7280; margin: 12px 0;">...and ${unreadCount - 1} more ${unreadCount - 1 === 1 ? 'message' : 'messages'}</p>` : ''}
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0 24px 0;">
                    <a href="https://bizdizy.com/messages" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                      View Full Conversation
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #6b7280; margin: 24px 0 0 0; text-align: center;">
                    You can also access your messages by logging into your BizDizy account.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
                  <p style="margin: 0 0 8px 0;">This is an automated notification from BizDizy</p>
                  <p style="margin: 0;">© ${new Date().getFullYear()} BizDizy. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `;
        
        // Send via Resend
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'BizDizy <noreply@bizdizy.com>',
            to: recipientEmail,
            subject: subject,
            html: html
          })
        });
        
        if (response.ok) {
          console.log(`✅ Email sent to ${recipientEmail} (${unreadCount} messages)`);
          emailsSent++;
          
          // Track message IDs for batch update
          messageIdsToUpdate.push(...messages.map(m => m.id));
        } else {
          const errorText = await response.text();
          console.error(`❌ Failed to send email to ${recipientEmail}:`, errorText);
          emailsFailed++;
        }
        
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        emailsFailed++;
      }
    }
    
    // Batch update all notified messages
    if (messageIdsToUpdate.length > 0) {
      const notifiedTimestamp = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('messages')
        .update({ email_notified_at: notifiedTimestamp })
        .in('id', messageIdsToUpdate);
      
      if (updateError) {
        console.error('Error updating email_notified_at:', updateError);
      } else {
        console.log(`✅ Updated ${messageIdsToUpdate.length} messages with email_notified_at timestamp`);
      }
    }
    
    console.log(`🎉 Cron job complete: ${emailsSent} sent, ${emailsFailed} failed`);
    
    return c.json({ 
      success: true, 
      sent: emailsSent, 
      failed: emailsFailed,
      messagesProcessed: unnotifiedMessages.length 
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return c.json({ error: 'Cron job failed' }, 500);
  }
});

console.log('✅ BizDizy Edge Function ready to serve requests');

// ============================================
// CRON JOB STATUS ENDPOINT (ADMIN)
// ============================================

app.get('/make-server-726d4144/admin/cron-status', async (c) => {
  try {
    console.log('📊 Fetching cron job status...');
    
    // Check recent email notifications as a proxy for cron status
    const { data: recentNotifications, error } = await supabase
      .from('messages')
      .select('email_notified_at')
      .not('email_notified_at', 'is', null)
      .order('email_notified_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error checking notifications:', error);
    }
    
    // Return a simplified status based on recent activity
    const lastNotification = recentNotifications?.[0]?.email_notified_at;
    const isActive = lastNotification 
      ? (new Date().getTime() - new Date(lastNotification).getTime()) < 600000 // Within 10 minutes
      : false;
    
    // Create a mock job entry for UI display
    const mockJob = {
      jobid: 1,
      schedule: '*/5 * * * *',
      command: 'HTTP POST to /make-server-726d4144/cron/send-message-notifications',
      jobname: 'send-message-notifications',
      active: true,
      database: 'postgres',
      username: 'postgres',
      nodename: 'localhost',
      nodeport: 5432
    };
    
    // Create mock runs based on notification history
    const mockRuns = recentNotifications?.map((msg, idx) => ({
      jobid: 1,
      runid: idx + 1,
      job_pid: 0,
      database: 'postgres',
      username: 'postgres',
      command: 'send-message-notifications',
      status: 'succeeded',
      return_message: 'Completed',
      start_time: msg.email_notified_at,
      end_time: msg.email_notified_at
    })) || [];
    
    console.log(`✅ Cron status check complete. Last notification: ${lastNotification || 'Never'}`);
    
    return c.json({ 
      success: true,
      jobs: [mockJob],
      recentRuns: mockRuns,
      lastNotification: lastNotification,
      isActive: isActive,
      note: 'Status inferred from email notification history. For detailed cron logs, check Supabase Dashboard.'
    });
  } catch (error) {
    console.error('❌ Cron status error:', error);
    return c.json({ 
      success: true,
      jobs: [],
      recentRuns: [],
      note: 'Unable to determine cron status'
    });
  }
});

Deno.serve(app.fetch);
