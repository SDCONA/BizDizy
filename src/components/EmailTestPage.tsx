import { useState } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ArrowLeft } from 'lucide-react';

interface EmailTestPageProps {
  onBack: () => void;
}

export function EmailTestPage({ onBack }: EmailTestPageProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  const testEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult(null);
    console.log('🧪 [FRONTEND] Testing email to:', email);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/auth/test-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();
      console.log('🧪 [FRONTEND] Test result:', data);

      setResult({
        success: response.ok,
        message: data.message || data.error || 'Unknown response',
        details: data.note || data.details
      });
    } catch (error: any) {
      console.error('❌ [FRONTEND] Test error:', error);
      setResult({
        success: false,
        message: error.message || 'Failed to test email'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl mb-2">📧 Email SMTP Test</h1>
          <p className="text-gray-600 mb-6">
            Test if Supabase SMTP is configured correctly by sending a password reset email
          </p>

          <div className="space-y-4">
            <div>
              <label className="block mb-2">Email Address to Test</label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              onClick={testEmail}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Sending Test Email...' : 'Send Test Email'}
            </Button>

            {result && (
              <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className={`font-semibold mb-2 ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </h3>
                <p className={result.success ? 'text-green-700' : 'text-red-700'}>
                  {result.message}
                </p>
                {result.details && (
                  <p className="text-sm mt-2 text-gray-600">
                    {result.details}
                  </p>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-900 mb-2">📝 What to Check:</h3>
              <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
                <li>Open browser console (F12) to see detailed logs</li>
                <li>Check your email inbox (and spam folder)</li>
                <li>Go to Supabase Dashboard → Logs → Edge Functions</li>
                <li>Look for email delivery errors or confirmations</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚙️ SMTP Settings to Verify:</h3>
              <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                <li><strong>Host:</strong> smtp.gmail.com</li>
                <li><strong>Port:</strong> 587</li>
                <li><strong>Username:</strong> bizdizy@gmail.com</li>
                <li><strong>Password:</strong> ffjb rpsa fkcq emos</li>
                <li><strong>Sender Email:</strong> bizdizy@gmail.com</li>
                <li><strong>Sender Name:</strong> BizDizy</li>
              </ul>
              <p className="text-sm text-yellow-800 mt-2">
                ⚠️ Check: Supabase Dashboard → Project Settings → Auth → SMTP Settings
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-purple-900 mb-2">🔐 Auth Settings to Verify:</h3>
              <ul className="text-sm text-purple-800 space-y-1 ml-4 list-disc">
                <li><strong>Enable email confirmations:</strong> Should be ON</li>
                <li><strong>Confirm email:</strong> Should be enabled</li>
                <li><strong>Email rate limit:</strong> Should be at least 30-50</li>
              </ul>
              <p className="text-sm text-purple-800 mt-2">
                📍 Check: Supabase Dashboard → Authentication → Settings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}