import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Menu, FileText, Mail, Facebook, Instagram, Twitter, Linkedin, Briefcase, User, LogOut, LogIn, MessageCircle, Shield } from "lucide-react";
import { Separator } from "./ui/separator";
import { User as UserType } from "../types/user";

interface MobileMenuProps {
  onNavigate: (page: "legal" | "contact") => void;
  onMyBusinessClick: () => void;
  hasRegisteredBusiness: boolean;
  currentUser: UserType | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onMyAccountClick: () => void;
  onMessagesClick?: () => void;
  unreadMessageCount?: number;
  isAdmin?: boolean;
  onAdminClick?: () => void;
}

export function MobileMenu({ 
  onNavigate, 
  onMyBusinessClick, 
  hasRegisteredBusiness, 
  currentUser,
  onLoginClick,
  onLogout,
  onMyAccountClick,
  onMessagesClick,
  unreadMessageCount = 0,
  isAdmin = false,
  onAdminClick
}: MobileMenuProps) {
  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition-colors">
        <Menu className="w-5 h-5" />
      </SheetTrigger>
      <SheetContent className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <div className="mt-8 space-y-6">
          {/* User Info Section */}
          {currentUser ? (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{currentUser.username}</p>
                    {isAdmin && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
              <Button
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={onLoginClick}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login / Sign Up
              </Button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-2">
            {currentUser && (
              <>
                {isAdmin && onAdminClick && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
                    onClick={onAdminClick}
                  >
                    <Shield className="w-5 h-5 mr-3 text-purple-600" />
                    <span className="text-purple-600">Admin Dashboard</span>
                    <Badge className="ml-auto bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">Admin</Badge>
                  </Button>
                )}

                {hasRegisteredBusiness && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={onMyBusinessClick}
                  >
                    <Briefcase className="w-5 h-5 mr-3" />
                    My Businesses
                  </Button>
                )}
                
                {onMessagesClick && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start relative"
                    onClick={onMessagesClick}
                  >
                    <MessageCircle className="w-5 h-5 mr-3" />
                    Messages
                    {unreadMessageCount > 0 && (
                      <Badge className="ml-auto bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Badge>
                    )}
                  </Button>
                )}
                
                <Separator />
              </>
            )}
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onNavigate("legal")}
            >
              <FileText className="w-5 h-5 mr-3" />
              Legal & Terms
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => onNavigate("contact")}
            >
              <Mail className="w-5 h-5 mr-3" />
              Contact Us
            </Button>

            {currentUser && (
              <>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={onLogout}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              </>
            )}
          </div>

          <Separator />

          {/* Social Media */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Follow Us</p>
            <div className="flex gap-3 justify-center">
              <Button
                size="icon"
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/60 hover:-translate-y-0.5 transition-all duration-200 border-0 active:translate-y-0"
                style={{ boxShadow: '0 4px 0 0 rgb(37 99 235), 0 8px 15px -3px rgba(37, 99, 235, 0.4)' }}
                onClick={() => window.open("https://facebook.com", "_blank")}
              >
                <Facebook className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 text-white shadow-lg shadow-pink-500/50 hover:shadow-xl hover:shadow-pink-500/60 hover:-translate-y-0.5 transition-all duration-200 border-0 active:translate-y-0"
                style={{ boxShadow: '0 4px 0 0 rgb(219 39 119), 0 8px 15px -3px rgba(219, 39, 119, 0.4)' }}
                onClick={() => window.open("https://instagram.com", "_blank")}
              >
                <Instagram className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-lg shadow-sky-500/50 hover:shadow-xl hover:shadow-sky-500/60 hover:-translate-y-0.5 transition-all duration-200 border-0 active:translate-y-0"
                style={{ boxShadow: '0 4px 0 0 rgb(14 165 233), 0 8px 15px -3px rgba(14, 165, 233, 0.4)' }}
                onClick={() => window.open("https://twitter.com", "_blank")}
              >
                <Twitter className="w-5 h-5" />
              </Button>
              <Button
                size="icon"
                className="bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/50 hover:shadow-xl hover:shadow-blue-600/60 hover:-translate-y-0.5 transition-all duration-200 border-0 active:translate-y-0"
                style={{ boxShadow: '0 4px 0 0 rgb(29 78 216), 0 8px 15px -3px rgba(29, 78, 216, 0.4)' }}
                onClick={() => window.open("https://linkedin.com", "_blank")}
              >
                <Linkedin className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Footer Info */}
          <div className="text-xs text-muted-foreground text-center">
            <p>© 2025 BizDizy</p>
            <p className="mt-1">Connecting businesses with customers</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
