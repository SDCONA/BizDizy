import { Building2, Plus, User, LogOut, MessageCircle, Shield, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { AuthUser } from '../types/user';

interface HeaderProps {
  currentUser: AuthUser | null;
  onLoginClick: () => void;
  onSignupClick: () => void;
  onLogout: () => void;
  onAccountClick: () => void;
  onRegisterClick: () => void;
  onManageClick: () => void;
  onHomeClick: () => void;
  onContactClick: () => void;
  onMessagesClick: () => void;
  onAdminClick?: () => void;
  showAdminLink?: boolean;
  unreadCount?: number;
}

export function Header({
  currentUser,
  onLoginClick,
  onSignupClick,
  onLogout,
  onAccountClick,
  onRegisterClick,
  onManageClick,
  onHomeClick,
  onContactClick,
  onMessagesClick,
  onAdminClick,
  showAdminLink = false,
  unreadCount = 0,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={onHomeClick}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BizDizy
          </h1>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <>
              {/* Admin Link */}
              {showAdminLink && onAdminClick && (
                <Button
                  onClick={onAdminClick}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              )}

              {/* Messages */}
              <Button
                onClick={onMessagesClick}
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-blue-600 relative"
              >
                {unreadCount > 0 && (
                  <div className="absolute top-1 left-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
                <MessageCircle className="w-4 h-4 mr-2" />
                Messages
              </Button>

              {/* Manage Businesses */}
              <Button
                onClick={onManageClick}
                variant="ghost"
                size="sm"
                className="text-gray-700 hover:text-blue-600"
              >
                <Settings className="w-4 h-4 mr-2" />
                My Businesses
              </Button>

              {/* Register Business */}
              <Button
                onClick={onRegisterClick}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register Business
              </Button>

              {/* Account Dropdown */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={onAccountClick}
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:text-blue-600"
                >
                  <User className="w-4 h-4 mr-2" />
                  {currentUser.user_metadata?.name || currentUser.email}
                </Button>
                <Button
                  onClick={onLogout}
                  variant="ghost"
                  size="sm"
                  className="text-gray-700 hover:text-red-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button onClick={onLoginClick} variant="ghost" className="text-gray-700 hover:text-blue-600">
                Login
              </Button>
              <Button
                onClick={onSignupClick}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              >
                Sign Up
              </Button>
            </>
          )}
        </nav>

        {/* Mobile Menu */}
        <div className="md:hidden">
          {currentUser ? (
            <Button
              onClick={onAccountClick}
              variant="ghost"
              size="sm"
            >
              <User className="w-5 h-5" />
            </Button>
          ) : (
            <Button onClick={onLoginClick} size="sm">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}