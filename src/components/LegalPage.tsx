import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { getCurrentTerms, getCurrentPrivacy } from '../utils/api';

interface LegalPageProps {
  type: 'terms' | 'privacy';
  onBack: () => void;
}

export function LegalPage({ type, onBack }: LegalPageProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContent();
  }, [type]);

  async function loadContent() {
    try {
      const data = type === 'terms' ? await getCurrentTerms() : await getCurrentPrivacy();
      setContent(data?.content || getDefaultContent());
    } catch (error) {
      setContent(getDefaultContent());
    } finally {
      setIsLoading(false);
    }
  }

  function getDefaultContent() {
    if (type === 'terms') {
      return `# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

## 1. Acceptance of Terms

By accessing and using BizDizy, you accept and agree to be bound by the terms and provision of this agreement.

## 2. Use of Service

BizDizy provides a platform for connecting consumers with local businesses. You agree to use the service only for lawful purposes.

## 3. User Accounts

You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.

## 4. Business Listings

Business owners are responsible for the accuracy of their listings. BizDizy reserves the right to remove any listing that violates our policies.

## 5. Reviews and Ratings

Users may post reviews of businesses. Reviews must be honest and based on actual experiences. We reserve the right to remove inappropriate reviews.

## 6. Limitation of Liability

BizDizy is not liable for any damages arising from the use of our service or interactions between users and businesses.

## 7. Changes to Terms

We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of modified terms.

## 8. Contact

For questions about these terms, please contact us through our contact page.`;
    } else {
      return `# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

## 1. Information We Collect

We collect information you provide directly to us, including:
- Name and contact information
- Account credentials
- Business information (for business owners)
- Reviews and ratings
- Messages and communications

## 2. How We Use Your Information

We use your information to:
- Provide and improve our services
- Communicate with you
- Facilitate connections between users and businesses
- Analyze usage patterns
- Ensure security and prevent fraud

## 3. Information Sharing

We do not sell your personal information. We may share information:
- With businesses you contact
- With service providers who assist our operations
- When required by law

## 4. Data Security

We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure.

## 5. Your Rights

You have the right to:
- Access your personal information
- Correct inaccurate information
- Request deletion of your information
- Opt out of marketing communications

## 6. Cookies

We use cookies to improve your experience. You can control cookie settings in your browser.

## 7. Children's Privacy

Our service is not intended for children under 13. We do not knowingly collect information from children.

## 8. Changes to Privacy Policy

We may update this policy. We will notify you of significant changes.

## 9. Contact Us

For privacy questions, please contact us through our contact page.`;
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="p-8">
          <h1 className="text-4xl mb-8">
            {type === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h1>
          <div className="prose max-w-none">
            {content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index} className="text-3xl mb-4 mt-8">{line.substring(2)}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={index} className="text-2xl mb-3 mt-6">{line.substring(3)}</h2>;
              } else if (line.startsWith('- ')) {
                return <li key={index} className="ml-6 text-gray-700">{line.substring(2)}</li>;
              } else if (line.trim()) {
                return <p key={index} className="text-gray-700 mb-4">{line}</p>;
              }
              return null;
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
