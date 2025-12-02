import { useState } from 'react';
import { Button } from './ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from './ui/dialog';
import { 
  Share2, 
  Link as LinkIcon, 
  QrCode, 
  Facebook, 
  Twitter, 
  Linkedin, 
  MessageCircle,
  Mail,
  Copy,
  Check,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Business } from '../types/business';
import QRCode from 'qrcode';

interface ShareBusinessCardProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareBusinessCard({ business, isOpen, onClose }: ShareBusinessCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  // Generate the business profile URL
  const businessUrl = `https://bizdizy.com/?view=profile&id=${business.id}`;
  const shareTitle = `Check out ${business.name} on BizDizy`;
  const shareText = business.description 
    ? `${business.name} - ${business.description.slice(0, 100)}${business.description.length > 100 ? '...' : ''}`
    : `${business.name} - ${business.category?.name || 'Business'} in ${business.city || 'your area'}`;

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      // Fallback method using textarea (more reliable in iframes and restricted contexts)
      const textArea = document.createElement('textarea');
      textArea.value = businessUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast.success('Link copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } else {
          throw new Error('Copy command was unsuccessful');
        }
      } catch (err) {
        document.body.removeChild(textArea);
        throw err;
      }
    } catch (error) {
      console.error('Copy failed:', error);
      toast.error('Failed to copy link. Please copy manually.');
    }
  };

  // Native share API (for mobile devices)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: businessUrl,
        });
      } catch (error: any) {
        // User cancelled share or error occurred
        if (error.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Generate and show QR code
  const handleShowQRCode = async () => {
    try {
      const url = await QRCode.toDataURL(businessUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#2563eb', // Blue color
          light: '#ffffff',
        },
      });
      setQrCodeUrl(url);
      setShowQRCode(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  // Download QR code
  const handleDownloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `${business.name.replace(/\s+/g, '-')}-QRCode.png`;
    link.href = qrCodeUrl;
    link.click();
    toast.success('QR code downloaded!');
  };

  // Share to social media
  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(businessUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(businessUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToLinkedIn = () => {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(businessUrl)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + businessUrl)}`,
      '_blank'
    );
  };

  const shareViaEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + '\n\n' + businessUrl)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-white via-blue-50/30 to-white border-2 border-blue-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Share2 className="w-6 h-6 text-blue-600" />
            Share Business Card
          </DialogTitle>
          <DialogDescription>
            Share <span className="font-semibold text-gray-800">{business.name}</span> with others
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto px-1">
          {/* QR Code Section */}
          {showQRCode && qrCodeUrl ? (
            <div className="bg-white p-4 rounded-xl border-2 border-blue-200 text-center space-y-3">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto rounded-lg shadow-lg max-w-[250px]" />
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={handleDownloadQRCode}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                <Button
                  onClick={() => setShowQRCode(false)}
                  variant="outline"
                  size="sm"
                >
                  Hide
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Copy Link */}
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg text-xs text-gray-700 truncate">
                  {businessUrl}
                </div>
                <Button
                  onClick={handleCopyLink}
                  size="sm"
                  className={`shrink-0 ${
                    copied 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Native Share (Mobile) */}
              {navigator.share && (
                <Button
                  onClick={handleNativeShare}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="sm"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share via...
                </Button>
              )}

              {/* Social Media Sharing */}
              <div className="space-y-2">
                <p className="text-xs text-gray-600">Share on social media</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={shareToWhatsApp}
                    variant="outline"
                    size="sm"
                    className="justify-start hover:bg-green-50 hover:border-green-500 hover:text-green-600"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    onClick={shareToFacebook}
                    variant="outline"
                    size="sm"
                    className="justify-start hover:bg-blue-50 hover:border-blue-500 hover:text-blue-600"
                  >
                    <Facebook className="w-4 h-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    onClick={shareToTwitter}
                    variant="outline"
                    size="sm"
                    className="justify-start hover:bg-sky-50 hover:border-sky-500 hover:text-sky-600"
                  >
                    <Twitter className="w-4 h-4 mr-2" />
                    Twitter
                  </Button>
                  <Button
                    onClick={shareToLinkedIn}
                    variant="outline"
                    size="sm"
                    className="justify-start hover:bg-blue-50 hover:border-blue-700 hover:text-blue-700"
                  >
                    <Linkedin className="w-4 h-4 mr-2" />
                    LinkedIn
                  </Button>
                </div>
              </div>

              {/* Email */}
              <Button
                onClick={shareViaEmail}
                variant="outline"
                size="sm"
                className="w-full justify-start hover:bg-purple-50 hover:border-purple-500 hover:text-purple-600"
              >
                <Mail className="w-4 h-4 mr-2" />
                Share via Email
              </Button>

              {/* QR Code Button */}
              <Button
                onClick={handleShowQRCode}
                variant="outline"
                size="sm"
                className="w-full justify-start hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-600"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR Code
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}