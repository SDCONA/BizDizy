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
      if (data && data.content) {
        setContent(data.content);
      } else {
        setContent(getContent());
      }
    } catch (error) {
      setContent(getContent());
    } finally {
      setIsLoading(false);
    }
  }

  function getContent() {
    if (type === 'terms') {
      return `# Terms of Service

Last updated: ${new Date().toLocaleDateString()}

Welcome to BizDizy. By accessing or using our business directory platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.

## 1. Acceptance of Terms

By creating an account, accessing, or using BizDizy ("the Platform"), you agree to comply with and be legally bound by these Terms of Service. If you do not agree to these terms, please do not use our services.

## 2. Description of Service

BizDizy is an online business directory platform that allows businesses to create listings and consumers to search for and discover local businesses. We provide a platform for information sharing only and DO NOT provide any business services ourselves.

## 3. No Liability and Disclaimers

**IMPORTANT: BizDizy and its owners, operators, employees, and affiliates accept ZERO responsibility and ZERO liability for:**

- Any information, content, or listings posted by businesses or users
- The accuracy, completeness, or reliability of any business information
- Any services, products, or interactions between users and listed businesses
- Any damages, losses, injuries, or disputes arising from business transactions
- Any fraudulent, misleading, or inaccurate business listings
- Any reviews, ratings, or user-generated content
- Any technical issues, data loss, or service interruptions
- Any decisions made based on information found on our platform

**YOU USE THIS PLATFORM ENTIRELY AT YOUR OWN RISK.**

## 4. User Accounts and Responsibilities

You are solely responsible for:
- Maintaining the confidentiality of your account credentials
- All activities that occur under your account
- Ensuring your account information is accurate and up-to-date
- Any content you post, upload, or share on the platform

We reserve the right to suspend or terminate accounts at any time for any reason without notice.

## 5. Business Listings

Business owners who create listings acknowledge and agree that:
- They are solely responsible for all information in their listings
- All information must be accurate, current, and not misleading
- They have the legal right to represent the business
- BizDizy makes no guarantees about listing visibility or customer acquisition
- We may modify, remove, or reject any listing at our sole discretion

## 6. Reviews and Ratings

Users posting reviews agree that:
- Reviews must be based on genuine experiences
- Reviews must not contain offensive, defamatory, or illegal content
- We may remove any review at our discretion
- We are not responsible for the accuracy or validity of any review
- Reviews reflect individual opinions only and not the views of BizDizy

## 7. Intellectual Property

All content on BizDizy, except user-generated content, is owned by BizDizy. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and distribute your content.

## 8. Prohibited Activities

You may not:
- Post false, misleading, or fraudulent information
- Violate any laws or regulations
- Infringe on intellectual property rights
- Harass, abuse, or harm other users
- Attempt to hack, disrupt, or compromise the platform
- Use automated systems to scrape or collect data
- Impersonate another person or business

## 9. Third-Party Links and Services

Our platform may contain links to third-party websites or services. We have NO control over and accept NO responsibility for the content, privacy policies, or practices of any third-party sites.

## 10. Indemnification

You agree to indemnify, defend, and hold harmless BizDizy and its affiliates from any claims, damages, losses, or expenses (including legal fees) arising from your use of the platform or violation of these terms.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW, BIZDIZY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, OR OTHER INTANGIBLE LOSSES.

THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.

## 12. Modifications to Service and Terms

We reserve the right to:
- Modify, suspend, or discontinue any part of the platform at any time
- Change these terms at any time without prior notice
- Your continued use after changes constitutes acceptance of new terms

## 13. Termination

We may terminate or suspend your access immediately, without prior notice or liability, for any reason, including breach of these terms.

## 14. Governing Law

These terms shall be governed by and construed in accordance with applicable local laws, without regard to conflict of law provisions.

## 15. Dispute Resolution

Any disputes arising from these terms or use of the platform shall be resolved through binding arbitration, not in court.

## 16. Severability

If any provision of these terms is found to be unenforceable, the remaining provisions will remain in full effect.

## 17. Entire Agreement

These Terms of Service constitute the entire agreement between you and BizDizy regarding use of the platform.

## 18. No Guarantees

BizDizy makes NO guarantees or warranties about:
- Business quality, reliability, or legitimacy
- Accuracy of any information on the platform
- Results from using our services
- Uptime, availability, or performance

## 19. Contact Information

For questions about these terms, you may contact us through the platform. We are under no obligation to respond or provide support.

**BY USING BIZDIZY, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO THESE TERMS, INCLUDING ALL DISCLAIMERS AND LIMITATIONS OF LIABILITY.**`;
    } else {
      return `# Privacy Policy

Last updated: ${new Date().toLocaleDateString()}

BizDizy ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your information when you use our business directory platform.

## 1. Information We Collect

**Personal Information:**
- Name, email address, phone number
- Account credentials (username and encrypted password)
- Business information (for business owners): company name, address, phone, website, description
- Profile information and preferences

**User-Generated Content:**
- Business listings and descriptions
- Reviews and ratings
- Comments and messages
- Photos and media uploads

**Automatically Collected Information:**
- IP address and device information
- Browser type and version
- Usage data and browsing patterns
- Cookies and similar tracking technologies
- Log files and analytics data

## 2. How We Use Your Information

We use collected information to:
- Provide, operate, and maintain the platform
- Create and manage user accounts
- Process and display business listings
- Enable communication between users and businesses
- Send administrative messages and notifications
- Respond to inquiries and provide customer support
- Improve and optimize our services
- Analyze usage patterns and trends
- Detect and prevent fraud and security issues
- Comply with legal obligations

## 3. Information Sharing and Disclosure

**We DO NOT sell your personal information to third parties.**

We may share your information with:

**Business Listings:** When you contact a business through our platform, we share your contact information with that business.

**Service Providers:** We may share data with third-party service providers who help us operate the platform (hosting, analytics, email services, etc.).

**Legal Requirements:** We may disclose information when required by law, court order, or government request.

**Business Transfers:** In the event of a merger, acquisition, or sale of assets, user information may be transferred.

**Public Information:** Business listings, reviews, and ratings are publicly visible to all users.

**With Your Consent:** We may share information with your explicit permission.

## 4. Data Security

We implement reasonable security measures to protect your information, including:
- Encryption of sensitive data
- Secure server infrastructure
- Regular security assessments
- Access controls and authentication

**HOWEVER, NO METHOD OF TRANSMISSION OVER THE INTERNET OR ELECTRONIC STORAGE IS 100% SECURE.** We cannot guarantee absolute security of your data.

## 5. Your Privacy Rights

Depending on your location, you may have the right to:
- **Access:** Request a copy of your personal information
- **Correction:** Update or correct inaccurate information
- **Deletion:** Request deletion of your account and data
- **Portability:** Receive your data in a portable format
- **Opt-Out:** Unsubscribe from marketing communications
- **Object:** Object to certain data processing activities

To exercise these rights, contact us through the platform.

## 6. Cookies and Tracking Technologies

We use cookies and similar technologies to:
- Remember your preferences and settings
- Analyze site traffic and usage
- Improve user experience
- Provide personalized content

You can control cookies through your browser settings, but disabling cookies may limit platform functionality.

## 7. Third-Party Services and Links

Our platform may contain links to third-party websites, services, or integrations. We are NOT responsible for the privacy practices of these third parties. Please review their privacy policies separately.

Third-party services we may use include:
- Analytics tools (Google Analytics, etc.)
- Email service providers
- Payment processors
- Social media integrations

## 8. Data Retention

We retain your information for as long as your account is active or as needed to provide services. We may retain certain information after account deletion for:
- Legal compliance and record-keeping
- Fraud prevention
- Resolving disputes
- Enforcing our terms

## 9. Children's Privacy

BizDizy is NOT intended for users under the age of 13. We do not knowingly collect personal information from children under 13. If we discover that we have collected information from a child under 13, we will delete it immediately.

## 10. International Data Transfers

Your information may be transferred to and processed in countries other than your own. By using our platform, you consent to such transfers. We take steps to ensure appropriate safeguards are in place.

## 11. California Privacy Rights (CCPA)

If you are a California resident, you have specific rights under the California Consumer Privacy Act:
- Right to know what personal information is collected
- Right to delete personal information
- Right to opt-out of sale of personal information (we do not sell your data)
- Right to non-discrimination for exercising your rights

## 12. European Privacy Rights (GDPR)

If you are in the European Economic Area, you have rights under the General Data Protection Regulation:
- Right to access your personal data
- Right to rectification of inaccurate data
- Right to erasure ("right to be forgotten")
- Right to restrict processing
- Right to data portability
- Right to object to processing
- Right to withdraw consent

## 13. Email Communications

We may send you:
- Account-related notifications (required)
- Service updates and announcements
- Marketing communications (you can opt-out)
- Responses to your inquiries

You can unsubscribe from marketing emails using the link provided in each email.

## 14. Business Owner Information

If you create a business listing, the following information will be publicly visible:
- Business name and description
- Contact information (phone, email, address, website)
- Business hours and service areas
- Photos and portfolio items
- Customer reviews and ratings

## 15. User Reviews and Public Content

Any reviews, ratings, or comments you post are publicly visible and may be indexed by search engines. Do not include sensitive personal information in public posts.

## 16. Account Security

You are responsible for:
- Keeping your password confidential
- Logging out from shared devices
- Notifying us of unauthorized account access
- Using strong, unique passwords

## 17. Data Breach Notification

In the event of a data breach that affects your personal information, we will notify you as required by applicable law.

## 18. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated "Last updated" date. Significant changes may be communicated via email or platform notification.

Your continued use of BizDizy after changes constitutes acceptance of the updated Privacy Policy.

## 19. Do Not Track Signals

We do not currently respond to "Do Not Track" browser signals.

## 20. Disclaimer of Liability

**IMPORTANT:** While we take reasonable steps to protect your information, we accept NO LIABILITY for:
- Unauthorized access or data breaches
- Loss, theft, or misuse of your information
- Actions of third-party service providers
- Technical failures or security vulnerabilities

**YOU USE THE PLATFORM AT YOUR OWN RISK.**

## 21. Contact Us

For privacy-related questions, concerns, or to exercise your rights, you may contact us through the platform contact form.

**BY USING BIZDIZY, YOU ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTOOD THIS PRIVACY POLICY AND AGREE TO THE COLLECTION, USE, AND DISCLOSURE OF YOUR INFORMATION AS DESCRIBED HEREIN.**`;
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