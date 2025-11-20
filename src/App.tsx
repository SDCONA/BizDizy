import { useState, useEffect } from 'react';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

// Components
import { Button } from './components/ui/button';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { BottomNav } from './components/BottomNav';
import { SearchHero } from './components/SearchHero';
import { CategoryGrid } from './components/CategoryGrid';
import { SearchResults } from './components/SearchResults';
import { BusinessProfile } from './components/BusinessProfile';
import { BusinessRegistration } from './components/BusinessRegistration';
import { BusinessManagement } from './components/BusinessManagement';
import { LoginPage } from './components/LoginPage';
import { SignupPage } from './components/SignupPage';
import { MyAccount } from './components/MyAccount';
import { ContactPage } from './components/ContactPage';
import { LegalPage } from './components/LegalPage';
import { AdminDashboard } from './components/AdminDashboard';
import { Messages } from './components/Messages';
import { PolicyNotificationModal } from './components/PolicyNotificationModal';
import { EmailTestPage } from './components/EmailTestPage';
import { EmailDiagnostics } from './components/EmailDiagnostics';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { RecaptchaTest } from './components/RecaptchaTest';

import { LoadingState } from './components/LoadingState';
import { SessionCleaner } from './components/SessionCleaner';

// Icons
import { MapPin, Star } from 'lucide-react';

// Types
import { Business } from './types/business';
import { AuthUser } from './types/user';

// Utils
import * as auth from './utils/auth';
import * as api from './utils/api';
import { getHighlyRatedBusinesses } from './utils/api';
import { createClient } from './utils/supabase/client';

type View = 
  | 'home' 
  | 'results' 
  | 'profile' 
  | 'register' 
  | 'manage' 
  | 'contact' 
  | 'legal'
  | 'login' 
  | 'signup' 
  | 'account' 
  | 'admin'
  | 'messages'
  | 'email-test'
  | 'email-diagnostics'
  | 'reset-password'
  | 'recaptcha-test';

export default function App() {
  // View state
  const [currentView, setCurrentView] = useState<View>('home');
  const [legalPageType, setLegalPageType] = useState<'terms' | 'privacy'>('terms');
  
  // User state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  
  // Business state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [businessToEdit, setBusinessToEdit] = useState<Business | null>(null);
  const [highlyRatedBusinesses, setHighlyRatedBusinesses] = useState<Business[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [isSearching, setIsSearching] = useState(false);
  
  // User owned businesses
  const [userOwnedBusinesses, setUserOwnedBusinesses] = useState<Business[]>([]);
  
  // Messaging state
  const [businessIdToMessage, setBusinessIdToMessage] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Error state
  const [hasSessionError, setHasSessionError] = useState(false);

  // ============================================
  // INITIALIZE APP
  // ============================================
  useEffect(() => {
    // Clear any invalid session data before starting, then initialize
    (async () => {
      await clearInvalidSessionsOnLoad();
      await initializeApp();
      
      // Check if we're on a password reset link
      checkForPasswordReset();
      
      // Check for hash-based navigation
      checkHashNavigation();
    })();
  }, []);
  
  // Check URL hash for navigation
  function checkHashNavigation() {
    const hash = window.location.hash.substring(1); // Remove the #
    
    // Remove any query parameters from hash
    const view = hash.split('?')[0];
    
    const validViews: View[] = [
      'home', 'results', 'profile', 'register', 'manage', 'contact', 'legal',
      'login', 'signup', 'account', 'admin', 'messages', 'email-test', 
      'email-diagnostics', 'reset-password', 'recaptcha-test'
    ];
    
    if (validViews.includes(view as View)) {
      setCurrentView(view as View);
    }
  }
  
  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      checkHashNavigation();
    };
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  // Check if URL contains password reset token
  function checkForPasswordReset() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    
    if (type === 'recovery') {
      // User clicked password reset link in email
      setCurrentView('reset-password');
    }
  }

  // ============================================
  // SCROLL TO TOP ON VIEW CHANGE
  // ============================================
  useEffect(() => {
    // Scroll to top whenever the view changes
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Reload unread count when leaving messages view
    if (currentView !== 'messages' && currentUser) {
      loadUnreadMessageCount();
    }
  }, [currentView]);



  async function clearInvalidSessionsOnLoad() {
    try {
      const supabase = createClient();
      
      // First, try to get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's no session at all, just clear local storage
      if (!session || sessionError) {
        localStorage.removeItem('bizdizy_current_user');
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      
      // If there is a session, verify the user actually exists
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser(session.access_token);
        
        // Check if the user validation failed
        if (userError || !userData?.user) {
          // Sign out to clear Supabase session
          await supabase.auth.signOut().catch(() => {});
          
          // Clear local storage
          localStorage.removeItem('bizdizy_current_user');
          
          setCurrentUser(null);
          setCurrentView('home');
        }
      } catch (err) {
        // Any error during validation means invalid session
        await supabase.auth.signOut().catch(() => {});
        localStorage.removeItem('bizdizy_current_user');
        setCurrentUser(null);
        setCurrentView('home');
      }
    } catch (error) {
      // Silent - just clear everything
      localStorage.removeItem('bizdizy_current_user');
      setCurrentUser(null);
      setCurrentView('home');
    }
  }

  async function initializeApp() {
    try {
      // Check for existing session (this already validates the token)
      const user = await auth.checkSession();
      if (user) {
        setCurrentUser(user);
        
        // Load user's businesses for messaging
        loadUserBusinesses(user.id);
      } else {
        setCurrentUser(null); // Explicitly set to null
      }
      
      // Load highly rated businesses for homepage
      loadHighlyRatedBusinesses();
    } catch (error: any) {
      // If it's an auth error, clear the session
      if (error.message?.includes('Authentication') || error.message?.includes('JWT')) {
        setCurrentUser(null);
        setHasSessionError(true);
        toast.error('Your session has expired. Please log in again.');
      }
    } finally {
      setIsLoading(false);
      setIsInitializing(false); // Mark initialization complete
    }
  }

  async function loadUserBusinesses(userId: string) {
    try {
      const ownedBusinesses = await api.getBusinessesByOwner(userId);
      setUserOwnedBusinesses(ownedBusinesses);
    } catch (error) {
      // Silently handle error
    }
  }

  async function loadHighlyRatedBusinesses() {
    try {
      const businesses = await getHighlyRatedBusinesses(6);
      setHighlyRatedBusinesses(businesses);
    } catch (error) {
      // Silently handle error
    }
  }

  // ============================================
  // UNREAD MESSAGE COUNT
  // ============================================
  async function loadUnreadMessageCount() {
    if (!currentUser) {
      setUnreadMessageCount(0);
      return;
    }

    try {
      const supabase = createClient();
      let totalUnread = 0;

      // Count unread messages from consumer conversations (messages from businesses)
      const { data: consumerConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', currentUser.id);

      if (consumerConvs) {
        for (const conv of consumerConvs) {
          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .eq('sender_type', 'business')
            .is('read_at', null);
          
          totalUnread += unreadMessages?.length || 0;
        }
      }

      // Count unread messages from business conversations (messages from users)
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', currentUser.id)
        .is('deleted_at', null);

      if (businesses) {
        for (const business of businesses) {
          const { data: businessConvs } = await supabase
            .from('conversations')
            .select('id')
            .eq('business_id', business.id);

          if (businessConvs) {
            for (const conv of businessConvs) {
              const { data: unreadMessages } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conv.id)
                .eq('sender_type', 'user')
                .is('read_at', null);
              
              totalUnread += unreadMessages?.length || 0;
            }
          }
        }
      }

      setUnreadMessageCount(totalUnread);
    } catch (error) {
      // Silently handle error
      console.error('Failed to load unread count:', error);
    }
  }

  // Poll for unread messages every 30 seconds when user is logged in
  useEffect(() => {
    if (!currentUser) {
      setUnreadMessageCount(0);
      return;
    }

    // Load immediately
    loadUnreadMessageCount();

    // Then poll every 30 seconds
    const interval = setInterval(() => {
      loadUnreadMessageCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // ============================================
  // AUTH HANDLERS
  // ============================================
  async function handleLogin(email: string, password: string): Promise<boolean> {
    const result = await auth.login({ email, password });
    
    if (result.success && result.user) {
      setCurrentUser(result.user);
      loadUserBusinesses(result.user.id);
      toast.success('Welcome back!');
      setCurrentView('home');
      return true;
    } else {
      // Provide more helpful error messages
      const errorMsg = result.error || 'Login failed';
      
      if (errorMsg.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. If you don\'t have an account yet, please sign up first.');
      } else if (errorMsg.includes('Email not confirmed')) {
        toast.error('Please check your email and confirm your account first.');
      } else if (errorMsg.includes('Email')) {
        toast.error('Account not found. Please check your email or sign up for a new account.');
      } else {
        toast.error(errorMsg);
      }
      return false;
    }
  }

  async function handleSignup(email: string, password: string, name: string, phone?: string, recaptchaToken?: string): Promise<boolean> {
    const result = await auth.signup({ email, password, name, phone, recaptchaToken });
    
    if (result.success) {
      // Check if email verification is required
      if (result.requiresEmailVerification) {
        toast.success('✅ ' + (result.message || 'Account created! Please check your email to verify your account.'));
        setCurrentView('login'); // Switch to login view
        return true;
      }
      
      // If user is returned (no verification needed), log them in
      if (result.user) {
        setCurrentUser(result.user);
        loadUserBusinesses(result.user.id);
        setCurrentView('home');
        return true;
      }
    } else {
      const errorMsg = result.error || 'Signup failed';
      
      if (errorMsg.includes('already registered')) {
        toast.error('This email is already registered. Please login instead.');
      } else if (errorMsg.includes('Password')) {
        toast.error('Password must be at least 6 characters long.');
      } else {
        toast.error(errorMsg);
      }
      return false;
    }
  }

  async function handleLogout() {
    await auth.logout();
    setCurrentUser(null);
    setUserOwnedBusinesses([]);
    setCurrentView('home');
    toast.success('Logged out successfully');
  }

  // ============================================
  // SEARCH HANDLER
  // ============================================
  async function handleSearch(query: string, location: string, category?: string) {
    setSearchQuery(query);
    setSearchLocation(location);
    setSelectedCategory(category);
    setIsSearching(true);

    try {
      const results = await api.searchBusinesses({
        query: query || undefined,
        city: location || undefined,
        category: category,
      });

      setBusinesses(results);
      setCurrentView('results');
    } catch (error) {
      toast.error('Search failed. Please try again.');
      setBusinesses([]);
    } finally {
      setIsSearching(false);
    }
  }

  // ============================================
  // NAVIGATION HANDLERS
  // ============================================
  function handleViewBusiness(business: Business) {
    setSelectedBusiness(business);
    setCurrentView('profile');
  }

  function handleEditBusiness(business: Business) {
    setBusinessToEdit(business);
    setCurrentView('register');
  }

  function handleRegisterNew() {
    if (!currentUser) {
      toast.error('Please login to register a business');
      setCurrentView('login');
      return;
    }
    setBusinessToEdit(null);
    setCurrentView('register');
  }

  const handleStartConversation = async (business: Business) => {
    if (!currentUser) {
      toast.error('Please login to message this business');
      setCurrentView('login');
      return;
    }
    
    try {
      // Create or get conversation with this business
      const conversation = await api.getOrCreateConversation(currentUser.id, business.id);
      
      // Set the business ID to auto-select
      setBusinessIdToMessage(business.id);
      
      // Navigate to messages
      setCurrentView('messages');
    } catch (error: any) {
      toast.error('Failed to start conversation. Please try again.');
    }
  };

  function handleBackToHome() {
    setCurrentView('home');
    setSearchQuery('');
    setSearchLocation('');
    setSelectedCategory(undefined);
    setBusinesses([]);
    setSelectedBusiness(null);
    setBusinessToEdit(null);
    loadHighlyRatedBusinesses(); // Refresh highly rated businesses
  }

  async function handleBusinessSaved() {
    toast.success(businessToEdit ? 'Business updated!' : 'Business registered!');
    setCurrentView('manage');
    setBusinessToEdit(null);
  }

  // ============================================
  // RENDER LOADING STATE
  // ============================================
  // Show loading screen while initializing to prevent any API calls with invalid tokens
  if (isInitializing || isLoading) {
    return <LoadingState message="Loading BizDizy..." />;
  }

  // ============================================
  // RENDER MAIN APP
  // ============================================
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Toaster position="top-center" richColors />
      
      {/* Policy Notifications for logged-in users */}
      {currentUser && (
        <PolicyNotificationModal />
      )}
      
      <Header
        currentUser={currentUser}
        onLoginClick={() => setCurrentView('login')}
        onSignupClick={() => setCurrentView('signup')}
        onLogout={handleLogout}
        onAccountClick={() => setCurrentView('account')}
        onRegisterClick={handleRegisterNew}
        onManageClick={() => setCurrentView('manage')}
        onHomeClick={handleBackToHome}
        onContactClick={() => setCurrentView('contact')}
        onMessagesClick={() => setCurrentView('messages')}
        onAdminClick={() => setCurrentView('admin')}
        showAdminLink={auth.isAdmin()}
        unreadCount={unreadMessageCount}
      />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Session Error Notice */}
        {hasSessionError && (
          <div className="max-w-4xl mx-auto px-4 pt-8">
            <SessionCleaner />
          </div>
        )}
        
        {/* HOME VIEW */}
        {currentView === 'home' && (
          <>

            <SearchHero onSearch={handleSearch} isSearching={isSearching} />
            <CategoryGrid onCategoryClick={(categoryId) => handleSearch('', '', categoryId)} />
            
            {/* Highly Rated Businesses */}
            {highlyRatedBusinesses.length > 0 && (
              <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                  <div className="text-center mb-12">
                    <h2 className="mb-2">Highly Rated Businesses</h2>
                    <p className="text-muted-foreground">Trusted by our community</p>
                  </div>
                  
                  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {highlyRatedBusinesses.slice(0, 6).map((business) => (
                      <div
                        key={business.id}
                        className="group relative cursor-pointer"
                        onClick={() => handleViewBusiness(business)}
                      >
                        {/* 3D Card Effect */}
                        <div className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                          {/* Gradient Accent Bar */}
                          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-2xl z-10" />
                          
                          {/* Verified Badge */}
                          {business.verified && (
                            <div className="absolute top-44 right-2 z-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-full text-xs shadow-lg flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                              Verified
                            </div>
                          )}

                          {/* Main Image */}
                          {business.portfolio && business.portfolio.length > 0 ? (
                            <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                              <img
                                src={business.portfolio[0]}
                                alt={business.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>
                          ) : (
                            <div className="relative h-48 w-full bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-2 bg-white/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                                  <MapPin className="w-8 h-8 text-blue-600" />
                                </div>
                                <p className="text-sm text-gray-600">No image available</p>
                              </div>
                            </div>
                          )}

                          {/* Business Info */}
                          <div className="p-6">
                            <h3 className="text-xl mb-2 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300">
                              {business.name}
                            </h3>
                            
                            <div className="inline-block mb-3 px-3 py-1 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
                              <p className="text-xs text-gray-700">
                                {business.category?.name || 'Uncategorized'}
                              </p>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                              {business.description}
                            </p>

                            {/* Location */}
                            {business.city && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-gray-50 rounded-lg px-3 py-2">
                                <div className="p-1 bg-gradient-to-br from-blue-100 to-purple-100 rounded-md">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <span>{business.city}</span>
                              </div>
                            )}

                            {/* Rating */}
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
                                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                <span className="text-sm text-gray-700">{business.rating.toFixed(1)}</span>
                              </div>
                              <span className="text-xs text-gray-500">rating</span>
                            </div>
                          </div>

                          {/* Hover Glow Effect */}
                          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-400/0 via-purple-400/0 to-pink-400/0 group-hover:from-blue-400/5 group-hover:via-purple-400/5 group-hover:to-pink-400/5 transition-all duration-300 pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        {/* SEARCH RESULTS */}
        {currentView === 'results' && (
          <SearchResults
            businesses={businesses}
            searchQuery={searchQuery}
            searchLocation={searchLocation}
            onBusinessClick={handleViewBusiness}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* BUSINESS PROFILE */}
        {currentView === 'profile' && selectedBusiness && (
          <BusinessProfile
            business={selectedBusiness}
            currentUser={currentUser}
            onBack={() => {
              // Refresh business data when going back
              if (businesses.length > 0) {
                handleSearch(searchQuery, searchLocation, selectedCategory);
              }
              setCurrentView(businesses.length > 0 ? 'results' : 'home');
            }}
            onEdit={handleEditBusiness}
            onLoginRequired={() => setCurrentView('login')}
            onContactBusiness={handleStartConversation}
          />
        )}

        {/* BUSINESS REGISTRATION */}
        {currentView === 'register' && currentUser && (
          <BusinessRegistration
            currentUser={currentUser}
            businessToEdit={businessToEdit}
            onCancel={() => setCurrentView(businessToEdit ? 'manage' : 'home')}
            onSave={handleBusinessSaved}
          />
        )}

        {/* BUSINESS MANAGEMENT */}
        {currentView === 'manage' && currentUser && (
          <BusinessManagement
            currentUser={currentUser}
            onRegisterNew={handleRegisterNew}
            onEditBusiness={handleEditBusiness}
            onViewBusiness={handleViewBusiness}
          />
        )}

        {/* LOGIN */}
        {currentView === 'login' && (
          <LoginPage
            onLogin={handleLogin}
            onSignupClick={() => setCurrentView('signup')}
            onBackToHome={handleBackToHome}
          />
        )}

        {/* SIGNUP */}
        {currentView === 'signup' && (
          <SignupPage
            onSignup={handleSignup}
            onLoginClick={() => setCurrentView('login')}
            onBackToHome={handleBackToHome}
            onTermsClick={() => {
              setLegalPageType('terms');
              setCurrentView('legal');
            }}
            onPrivacyClick={() => {
              setLegalPageType('privacy');
              setCurrentView('legal');
            }}
          />
        )}

        {/* MY ACCOUNT */}
        {currentView === 'account' && currentUser && (
          <MyAccount
            currentUser={currentUser}
            onBack={handleBackToHome}
            onLogout={handleLogout}
          />
        )}

        {/* CONTACT */}
        {currentView === 'contact' && (
          <ContactPage onBack={handleBackToHome} />
        )}

        {/* LEGAL */}
        {currentView === 'legal' && (
          <LegalPage
            type={legalPageType}
            onBack={handleBackToHome}
          />
        )}

        {/* ADMIN DASHBOARD */}
        {currentView === 'admin' && currentUser && auth.isAdmin() && (
          <AdminDashboard
            currentUser={currentUser}
            onBack={handleBackToHome}
          />
        )}

        {/* MESSAGES */}
        {currentView === 'messages' && currentUser && (
          <Messages
            currentUser={currentUser}
            onBack={() => {
              setBusinessIdToMessage(null);
              handleBackToHome();
            }}
            initialBusinessId={businessIdToMessage || undefined}
          />
        )}

        {/* EMAIL TEST */}
        {currentView === 'email-test' && (
          <EmailTestPage onBack={handleBackToHome} />
        )}

        {/* EMAIL DIAGNOSTICS */}
        {currentView === 'email-diagnostics' && (
          <EmailDiagnostics onBack={handleBackToHome} />
        )}

        {/* RESET PASSWORD */}
        {currentView === 'reset-password' && (
          <ResetPasswordPage onBack={handleBackToHome} />
        )}

        {/* RECAPTCHA TEST */}
        {currentView === 'recaptcha-test' && (
          <RecaptchaTest onBack={handleBackToHome} />
        )}

      </main>

      <Footer
        onTermsClick={() => {
          setLegalPageType('terms');
          setCurrentView('legal');
        }}
        onPrivacyClick={() => {
          setLegalPageType('privacy');
          setCurrentView('legal');
        }}
        onContactClick={() => setCurrentView('contact')}
      />

      <BottomNav
        currentUser={currentUser}
        onManageClick={() => setCurrentView('manage')}
        onRegisterClick={handleRegisterNew}
        onMessagesClick={() => setCurrentView('messages')}
        unreadCount={unreadMessageCount}
      />
    </div>
  );
}