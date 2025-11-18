import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { RECAPTCHA_SITE_KEY, executeRecaptcha, isRecaptchaLoaded, loadRecaptchaScript } from '../utils/recaptcha';

interface RecaptchaTestProps {
  onBack: () => void;
}

export function RecaptchaTest({ onBack }: RecaptchaTestProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; token?: string } | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load reCAPTCHA script on mount
  useEffect(() => {
    const loadScript = async () => {
      try {
        await loadRecaptchaScript();
        setScriptLoaded(true);
      } catch (error) {
        console.error('Failed to load reCAPTCHA:', error);
      }
    };
    
    loadScript();
  }, []);

  const testRecaptcha = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      // Check if reCAPTCHA is configured
      if (!RECAPTCHA_SITE_KEY) {
        setResult({
          success: false,
          message: 'reCAPTCHA Site Key not configured. Please add VITE_RECAPTCHA_SITE_KEY to .env file.'
        });
        setIsLoading(false);
        return;
      }

      // Check if reCAPTCHA is loaded
      if (!isRecaptchaLoaded()) {
        setResult({
          success: false,
          message: 'reCAPTCHA script not loaded. Please check your internet connection and reload the page.'
        });
        setIsLoading(false);
        return;
      }

      // Execute reCAPTCHA
      const token = await executeRecaptcha('test');

      if (token) {
        setResult({
          success: true,
          message: 'reCAPTCHA token generated successfully! Token length: ' + token.length,
          token: token.substring(0, 50) + '...'
        });
      } else {
        setResult({
          success: false,
          message: 'Failed to generate reCAPTCHA token'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Error: ' + (error.message || 'Unknown error')
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Back Button */}
        <Button
          onClick={onBack}
          variant="ghost"
          className="mb-6 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        {/* Test Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-3xl">🤖</span>
            </div>
            <h1 className="text-3xl mb-2">reCAPTCHA v3 Test</h1>
            <p className="text-gray-600">
              Test if Google reCAPTCHA v3 is properly configured
            </p>
          </div>

          {/* Configuration Status */}
          <div className="space-y-4 mb-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm mb-3">Configuration Status:</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {RECAPTCHA_SITE_KEY ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">Site Key configured</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-700">Site Key not configured</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {isRecaptchaLoaded() ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-700">reCAPTCHA script loaded</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-700">reCAPTCHA script not loaded yet</span>
                    </>
                  )}
                </div>
              </div>
              
              {RECAPTCHA_SITE_KEY && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    Site Key: {RECAPTCHA_SITE_KEY.substring(0, 20)}...
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Test Result */}
          {result && (
            <div className={`mb-6 p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm mb-2 ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.message}
                  </p>
                  {result.token && (
                    <p className="text-xs text-green-700 font-mono bg-white rounded px-2 py-1 mt-2">
                      {result.token}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Test Button */}
          <Button
            onClick={testRecaptcha}
            disabled={isLoading || !RECAPTCHA_SITE_KEY}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-6"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Testing reCAPTCHA...
              </>
            ) : (
              'Test reCAPTCHA'
            )}
          </Button>

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm text-blue-900 mb-2">How it works:</h3>
            <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
              <li>Click "Test reCAPTCHA" button</li>
              <li>reCAPTCHA v3 runs invisibly in the background</li>
              <li>If successful, you'll see a token generated</li>
              <li>This token is sent to the backend for verification during signup</li>
            </ul>
          </div>

          {/* Troubleshooting */}
          {!RECAPTCHA_SITE_KEY && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm text-yellow-900 mb-2">⚠️ Setup Required:</h3>
              <p className="text-xs text-yellow-800 mb-2">
                Create a <code className="bg-yellow-100 px-1 rounded">.env</code> file in the root directory with:
              </p>
              <pre className="text-xs bg-yellow-100 p-2 rounded overflow-x-auto">
                VITE_RECAPTCHA_SITE_KEY=your_site_key_here
              </pre>
              <p className="text-xs text-yellow-800 mt-2">
                Then restart your development server.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}