interface FooterProps {
  onTermsClick: () => void;
  onPrivacyClick: () => void;
  onContactClick: () => void;
}

export function Footer({ onTermsClick, onPrivacyClick, onContactClick }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white text-gray-900 mt-auto mb-16 md:mb-0">
      <div className="container mx-auto px-4">
        {/* Bottom Bar - show on all devices, but adjust spacing for mobile */}
        <div className="border-t border-gray-200 flex items-center justify-center min-h-[6rem] py-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 min-h-[3rem] mx-[5px] my-[0px]">
            <p className="text-gray-600 text-sm mr-2">
              © {currentYear} BizDizy. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <button 
                onClick={onTermsClick}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </button>
              <button 
                onClick={onPrivacyClick}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={onContactClick}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}