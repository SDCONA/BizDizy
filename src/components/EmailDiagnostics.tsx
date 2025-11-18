import { Button } from './ui/button';
import { ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';

interface EmailDiagnosticsProps {
  onBack: () => void;
}

export function EmailDiagnostics({ onBack }: EmailDiagnosticsProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl mb-2">🔍 Email Not Working - Diagnostic Checklist</h1>
          <p className="text-gray-600 mb-8">
            Follow this step-by-step guide to fix email verification issues
          </p>

          {/* CRITICAL CHECK 1 */}
          <div className="mb-8 bg-red-50 border-2 border-red-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-red-900 mb-3">🚨 CRITICAL #1: Enable Custom SMTP</h2>
                <p className="text-red-800 mb-4">
                  This is the #1 reason emails don't work! You MUST enable custom SMTP.
                </p>
                <ol className="space-y-2 text-sm text-red-900 ml-4 list-decimal">
                  <li>Go to: <strong>Supabase Dashboard → Project Settings → Auth</strong></li>
                  <li>Scroll to <strong>"SMTP Settings"</strong> section</li>
                  <li>Look for toggle: <strong>"Enable Custom SMTP"</strong></li>
                  <li className="bg-red-100 p-2 rounded">
                    ⚠️ <strong>MAKE SURE THIS TOGGLE IS ON!</strong>
                  </li>
                  <li>Then fill in the settings below and click <strong>Save</strong></li>
                </ol>
                <div className="mt-4 bg-white rounded p-4 border border-red-200">
                  <p className="font-semibold text-red-900 mb-2">SMTP Settings:</p>
                  <ul className="text-sm space-y-1 text-gray-700">
                    <li>• <strong>Host:</strong> smtp.gmail.com</li>
                    <li>• <strong>Port Number:</strong> 587</li>
                    <li>• <strong>Username:</strong> bizdizy@gmail.com</li>
                    <li>• <strong>Password:</strong> [Your NEW App Password - 16 chars without spaces]</li>
                    <li>• <strong>Sender email:</strong> bizdizy@gmail.com</li>
                    <li>• <strong>Sender name:</strong> BizDizy</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* CRITICAL CHECK 2 */}
          <div className="mb-8 bg-orange-50 border-2 border-orange-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-orange-900 mb-3">🚨 CRITICAL #2: Enable Email Confirmations</h2>
                <ol className="space-y-2 text-sm text-orange-900 ml-4 list-decimal">
                  <li>Go to: <strong>Supabase Dashboard → Authentication → Providers</strong></li>
                  <li>Click on <strong>"Email"</strong> provider</li>
                  <li>Look for: <strong>"Confirm email"</strong> toggle</li>
                  <li className="bg-orange-100 p-2 rounded">
                    ⚠️ <strong>TURN THIS ON!</strong>
                  </li>
                  <li>Click <strong>Save</strong></li>
                </ol>
              </div>
            </div>
          </div>

          {/* CHECK 3 */}
          <div className="mb-8 bg-blue-50 border border-blue-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-blue-900 mb-3">✅ Check #3: Email Template</h2>
                <ol className="space-y-2 text-sm text-blue-900 ml-4 list-decimal">
                  <li>Go to: <strong>Supabase Dashboard → Authentication → Email Templates</strong></li>
                  <li>Find template: <strong>"Confirm signup"</strong></li>
                  <li>Make sure it exists and is not empty</li>
                  <li>Default template should work fine - don't change unless needed</li>
                </ol>
              </div>
            </div>
          </div>

          {/* CHECK 4 */}
          <div className="mb-8 bg-purple-50 border border-purple-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-purple-900 mb-3">✅ Check #4: Rate Limits</h2>
                <ol className="space-y-2 text-sm text-purple-900 ml-4 list-decimal">
                  <li>Go to: <strong>Supabase Dashboard → Authentication → Rate Limits</strong></li>
                  <li>Set <strong>"Rate limit for sending emails"</strong> to at least <strong>30</strong></li>
                  <li>Set other limits to reasonable values (50-100)</li>
                  <li>Click <strong>Save</strong></li>
                </ol>
              </div>
            </div>
          </div>

          {/* CHECK 5 */}
          <div className="mb-8 bg-green-50 border border-green-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-green-900 mb-3">✅ Check #5: Check Supabase Logs</h2>
                <p className="text-green-800 mb-3">
                  After trying to sign up or send test email, check for errors:
                </p>
                <ol className="space-y-2 text-sm text-green-900 ml-4 list-decimal">
                  <li>Go to: <strong>Supabase Dashboard → Logs → Auth Logs</strong></li>
                  <li>Look for recent entries with errors</li>
                  <li>Also check: <strong>Logs → Edge Functions</strong></li>
                  <li>Look for email-related error messages</li>
                  <li className="bg-green-100 p-2 rounded">
                    📋 <strong>Copy any error messages and share them!</strong>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* TESTING */}
          <div className="mb-8 bg-yellow-50 border border-yellow-300 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h2 className="text-xl text-yellow-900 mb-3">🧪 After Making Changes</h2>
                <ol className="space-y-2 text-sm text-yellow-900 ml-4 list-decimal">
                  <li>
                    <strong>Wait 2-3 minutes</strong> after saving settings (Supabase needs time to apply changes)
                  </li>
                  <li>
                    <strong>Use the Email Test page</strong> to test
                  </li>
                  <li>
                    <strong>Check browser console</strong> (F12) for logs
                  </li>
                  <li>
                    <strong>Check your email</strong> (inbox AND spam folder)
                  </li>
                  <li>
                    <strong>Check Supabase Logs</strong> for any errors
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* COMMON MISTAKES */}
          <div className="bg-gray-50 border border-gray-300 rounded-xl p-6">
            <h2 className="text-xl text-gray-900 mb-3">⚠️ Common Mistakes</h2>
            <ul className="space-y-2 text-sm text-gray-700 ml-4 list-disc">
              <li>
                <strong>App Password has SPACES:</strong> Remove all spaces when pasting (should be 16 chars like: abcdabcdabcdabcd)
              </li>
              <li>
                <strong>"Enable Custom SMTP" is OFF:</strong> Most common issue - toggle must be ON!
              </li>
              <li>
                <strong>"Confirm email" is OFF:</strong> If this is off, no confirmation emails are sent
              </li>
              <li>
                <strong>Wrong Port:</strong> Must be 587 (not 465 or 25)
              </li>
              <li>
                <strong>Forgot to click SAVE:</strong> Always click Save after changing settings
              </li>
              <li>
                <strong>Didn't wait:</strong> Wait 2-3 minutes after saving before testing
              </li>
            </ul>
          </div>

          <div className="mt-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <p className="text-sm text-indigo-900">
              💡 <strong>Pro Tip:</strong> After completing ALL steps above, take a screenshot of your SMTP Settings page 
              and Auth Provider settings. This helps verify everything is configured correctly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
