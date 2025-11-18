import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Save, Bell, CheckCircle2 } from 'lucide-react';
import {
  getTermsAndPolicies,
  updateTermsAndPolicies,
  notifyPolicyChange,
  type PolicyDocument,
} from '../utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';

export function TermsAndPolicyManagement() {
  const [policies, setPolicies] = useState<{
    terms: PolicyDocument | null;
    privacy: PolicyDocument | null;
  }>({
    terms: null,
    privacy: null,
  });
  const [termsContent, setTermsContent] = useState('');
  const [privacyContent, setPrivacyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notifyUsers, setNotifyUsers] = useState({
    terms: false,
    privacy: false,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadPolicies();
  }, []);

  async function loadPolicies() {
    try {
      setLoading(true);
      const data = await getTermsAndPolicies();

      const terms = data.find((p) => p.type === 'terms_of_service') || null;
      const privacy = data.find((p) => p.type === 'privacy_policy') || null;

      setPolicies({ terms, privacy });
      setTermsContent(terms?.content || '');
      setPrivacyContent(privacy?.content || '');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(type: 'terms_of_service' | 'privacy_policy') {
    try {
      setSaving(true);
      const content = type === 'terms_of_service' ? termsContent : privacyContent;

      if (!content.trim()) {
        toast.error('Content cannot be empty');
        return;
      }

      await updateTermsAndPolicies(type, content);

      // Check if we should notify users
      const shouldNotify =
        type === 'terms_of_service' ? notifyUsers.terms : notifyUsers.privacy;

      if (shouldNotify) {
        const result = await notifyPolicyChange(type);
        toast.success(
          `Policy updated and ${result.notifiedCount} users will be notified`
        );
      } else {
        toast.success('Policy updated successfully');
      }

      // Reset notification checkbox
      setNotifyUsers((prev) => ({
        ...prev,
        [type === 'terms_of_service' ? 'terms' : 'privacy']: false,
      }));

      // Reload to get new version
      await loadPolicies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">Loading policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl">Terms & Policies</h2>
          <p className="text-gray-500">Manage legal documents</p>
        </div>
      </div>

      <Tabs defaultValue="terms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="terms">Terms of Service</TabsTrigger>
          <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
        </TabsList>

        {/* Terms of Service */}
        <TabsContent value="terms">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              <CardDescription>
                {policies.terms
                  ? `Current version: ${policies.terms.version} - Last updated: ${new Date(
                      policies.terms.updated_at
                    ).toLocaleString()}`
                  : 'No terms of service found'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={termsContent}
                onChange={(e) => setTermsContent(e.target.value)}
                placeholder="Enter terms of service content..."
                className="min-h-[400px] font-mono text-sm"
              />

              <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="notify-terms"
                  checked={notifyUsers.terms}
                  onCheckedChange={(checked) =>
                    setNotifyUsers((prev) => ({ ...prev, terms: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="notify-terms" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <span>Notify all users about this policy change</span>
                    </div>
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Users will receive a notification to review the updated terms
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleSave('terms_of_service')}
                disabled={saving || !termsContent.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Terms of Service'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Policy */}
        <TabsContent value="privacy">
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              <CardDescription>
                {policies.privacy
                  ? `Current version: ${policies.privacy.version} - Last updated: ${new Date(
                      policies.privacy.updated_at
                    ).toLocaleString()}`
                  : 'No privacy policy found'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={privacyContent}
                onChange={(e) => setPrivacyContent(e.target.value)}
                placeholder="Enter privacy policy content..."
                className="min-h-[400px] font-mono text-sm"
              />

              <div className="flex items-center space-x-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="notify-privacy"
                  checked={notifyUsers.privacy}
                  onCheckedChange={(checked) =>
                    setNotifyUsers((prev) => ({ ...prev, privacy: checked as boolean }))
                  }
                />
                <div className="flex-1">
                  <Label htmlFor="notify-privacy" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      <span>Notify all users about this policy change</span>
                    </div>
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    Users will receive a notification to review the updated policy
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleSave('privacy_policy')}
                disabled={saving || !privacyContent.trim()}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Privacy Policy'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertDescription>
          Each save creates a new version. Users can be notified about policy changes
          to ensure compliance and transparency.
        </AlertDescription>
      </Alert>
    </div>
  );
}
