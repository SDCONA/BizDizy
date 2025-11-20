import { useState, useEffect } from 'react';
import { Mail, Lock, User as UserIcon, Phone, ArrowLeft, Loader2, Check, X, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { RECAPTCHA_SITE_KEY, executeRecaptcha, resetRecaptcha } from '../utils/recaptcha';

interface SignupPageProps {
  onSignup: (email: string, password: string, name: string, phone?: string, recaptchaToken?: string) => Promise<boolean>;
  onLoginClick: () => void;
  onBackToHome: () => void;
  onTermsClick?: () => void;
  onPrivacyClick?: () => void;
}

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
  suggestions: string[];
}

export function SignupPage({ onSignup, onLoginClick, onBackToHome, onTermsClick, onPrivacyClick }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });

  // Password strength calculation
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: 'gray',
    suggestions: []
  });

  useEffect(() => {
    if (password) {
      const strength = calculatePasswordStrength(password);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ score: 0, label: '', color: 'gray', suggestions: [] });
    }
  }, [password]);

  function calculatePasswordStrength(pwd: string): PasswordStrength {
    let score = 0;
    const suggestions: string[] = [];

    // Length check
    if (pwd.length >= 8) {
      score += 1;
    } else {
      suggestions.push('Use at least 8 characters');
    }

    if (pwd.length >= 12) {
      score += 1;
    }

    // Uppercase check
    if (/[A-Z]/.test(pwd)) {
      score += 1;
    } else {
      suggestions.push('Add uppercase letters (A-Z)');
    }

    // Lowercase check
    if (/[a-z]/.test(pwd)) {
      score += 1;
    } else {
      suggestions.push('Add lowercase letters (a-z)');
    }

    // Number check
    if (/\d/.test(pwd)) {
      score += 1;
    } else {
      suggestions.push('Add numbers (0-9)');
    }

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      score += 1;
    } else {
      suggestions.push('Add special characters (!@#$%^&*)');
    }

    // Determine label and color
    let label = '';
    let color = 'gray';

    if (score <= 2) {
      label = 'Weak';
      color = 'red';
    } else if (score <= 4) {
      label = 'Fair';
      color = 'orange';
    } else if (score <= 5) {
      label = 'Good';
      color = 'yellow';
    } else {
      label = 'Strong';
      color = 'green';
    }

    return { score, label, color, suggestions };
  }

  const passwordRequirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /\d/.test(password), text: 'One number' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'One special character' },
  ];

  const isPasswordValid = passwordRequirements.every(req => req.met);
  const doPasswordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Mark all fields as touched
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true
    });

    // Validate name
    if (!name.trim()) {
      setError('Please enter your full name');
      return;
    }

    // Validate email
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (!isPasswordValid) {
      setError('Password does not meet the requirements. Please create a stronger password.');
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please check and try again.');
      return;
    }

    // Validate terms agreement
    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get reCAPTCHA token (only if configured)
      let recaptchaToken: string | undefined;
      if (RECAPTCHA_SITE_KEY) {
        try {
          recaptchaToken = await executeRecaptcha('signup');
        } catch (recaptchaError: any) {
          setError(recaptchaError.message || 'Security verification failed. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      const result = await onSignup(email, password, name, phone, recaptchaToken);
      
      // Reset reCAPTCHA after submission (if configured)
      if (RECAPTCHA_SITE_KEY) {
        resetRecaptcha();
      }
      
      // If signup succeeded, show success state
      if (result) {
        setSuccess(true);
        // The parent component will handle the view change and show toast
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      if (RECAPTCHA_SITE_KEY) {
        resetRecaptcha();
      }
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // If signup was successful, show success message
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl mb-4">Check Your Email!</h1>
            <p className="text-gray-600 mb-6">
              We've sent a verification link to <strong>{email}</strong>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-blue-900 mb-2">
                <strong>Next Steps:</strong>
              </p>
              <ol className="text-sm text-blue-800 space-y-1 ml-4">
                <li>1. Check your email inbox</li>
                <li>2. Click the verification link</li>
                <li>3. Return here to login</li>
              </ol>
            </div>
            <div className="space-y-3">
              <Button
                onClick={onLoginClick}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6"
              >
                Go to Login
              </Button>
              <Button
                onClick={onBackToHome}
                variant="outline"
                className="w-full py-6"
              >
                Back to Home
              </Button>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Didn't receive the email? Check your spam folder or wait a few minutes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <Button
          onClick={onBackToHome}
          variant="ghost"
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Signup Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform hover:scale-105 transition-transform">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl mb-2">Create Account</h1>
            <p className="text-gray-600">Join BizDizy and grow your business</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched({ ...touched, name: true })}
                  className={`pl-10 ${touched.name && !name.trim() ? 'border-red-300' : ''}`}
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched({ ...touched, email: true })}
                  className={`pl-10 ${touched.email && !email.includes('@') ? 'border-red-300' : ''}`}
                  required
                />
              </div>
              <p className="text-xs text-gray-500">We'll send a verification email to this address</p>
            </div>

            {/* Phone (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(123) 456-7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  className={`pl-10 pr-10 ${touched.password && !isPasswordValid ? 'border-orange-300' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordStrength.color === 'red' ? 'bg-red-500 w-1/4' :
                          passwordStrength.color === 'orange' ? 'bg-orange-500 w-1/2' :
                          passwordStrength.color === 'yellow' ? 'bg-yellow-500 w-3/4' :
                          passwordStrength.color === 'green' ? 'bg-green-500 w-full' :
                          'bg-gray-300 w-0'
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${
                      passwordStrength.color === 'red' ? 'text-red-600' :
                      passwordStrength.color === 'orange' ? 'text-orange-600' :
                      passwordStrength.color === 'yellow' ? 'text-yellow-600' :
                      passwordStrength.color === 'green' ? 'text-green-600' :
                      'text-gray-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>

                  {/* Password Requirements Checklist */}
                  <div className="space-y-1">
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.met ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-gray-400" />
                        )}
                        <span className={req.met ? 'text-green-700' : 'text-gray-600'}>
                          {req.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched({ ...touched, confirmPassword: true })}
                  className={`pl-10 pr-10 ${
                    touched.confirmPassword && confirmPassword && !doPasswordsMatch ? 'border-red-300' : ''
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {touched.confirmPassword && confirmPassword && (
                <div className="flex items-center gap-2 text-xs">
                  {doPasswordsMatch ? (
                    <>
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-2 sm:gap-3">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5 flex-shrink-0"
                />
                <Label htmlFor="terms" className="text-xs sm:text-sm cursor-pointer">
                  I agree to the terms and conditions *
                </Label>
              </div>
              <div className="mt-2 ml-7 sm:ml-8 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={onTermsClick}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Terms of Service
                </button>
                <span className="text-gray-400">•</span>
                <button
                  type="button"
                  onClick={onPrivacyClick}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Privacy Policy
                </button>
              </div>
            </div>

            {/* reCAPTCHA v3 notice */}
            {RECAPTCHA_SITE_KEY && (
              <div className="text-xs text-gray-500 text-center">
                This site is protected by reCAPTCHA
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6 mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating your account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onLoginClick}
                className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}