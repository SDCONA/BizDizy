import { Settings, Plus, MessageCircle } from 'lucide-react';
import { AuthUser } from '../types/user';

interface BottomNavProps {
  currentUser: AuthUser | null;
  onManageClick: () => void;
  onRegisterClick: () => void;
  onMessagesClick?: () => void;
  unreadCount?: number;
}

export function BottomNav({
  currentUser,
  onManageClick,
  onRegisterClick,
  onMessagesClick,
  unreadCount,
}: BottomNavProps) {
  // Only show if user is logged in
  if (!currentUser) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {/* Messages */}
        {onMessagesClick && (
          <button
            onClick={onMessagesClick}
            className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
              )}
            </div>
            <span className="text-xs">Messages</span>
          </button>
        )}

        {/* Register Business - Center with special styling */}
        <button
          onClick={onRegisterClick}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2"
        >
          <div className="w-12 h-12 -mt-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <span className="text-xs text-gray-600 mt-1">Register</span>
        </button>

        {/* My Businesses */}
        <button
          onClick={onManageClick}
          className="flex flex-col items-center justify-center gap-1 flex-1 py-2 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs">Businesses</span>
        </button>
      </div>
    </nav>
  );
}