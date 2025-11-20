import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
  Search, 
  Send, 
  MoreVertical, 
  ArrowLeft,
  Smile,
  User,
  Shield,
  Flag,
  BellOff,
  Archive,
  Trash2,
  Building2,
  X
} from 'lucide-react';
import { AuthUser } from '../types/user';
import { Conversation, Message as MessageType, Business } from '../types/business';
import * as api from '../utils/api';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';

interface MessagesProps {
  currentUser: AuthUser;
  onBack: () => void;
  initialBusinessId?: string;
}

interface EnrichedConversation extends Conversation {
  user_display_name?: string;
  conversation_type: 'consumer' | 'business';
  business_context?: Business;
  unread_count?: number;
}

const supabase = createClient();

export function Messages({ currentUser, onBack, initialBusinessId }: MessagesProps) {
  const [conversations, setConversations] = useState<EnrichedConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EnrichedConversation | null>(null);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection state for bulk actions
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedConversations, setSelectedConversations] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Load user's businesses and conversations
  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  // Handle initial business conversation
  useEffect(() => {
    if (initialBusinessId && conversations.length > 0 && !selectedConversation) {
      const conv = conversations.find(c => c.business_id === initialBusinessId);
      if (conv) {
        handleSelectConversation(conv);
      }
    }
  }, [initialBusinessId, conversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Instant scroll to bottom when conversation is selected
  useEffect(() => {
    if (selectedConversation && messagesContainerRef.current) {
      // Instant scroll without animation when opening conversation
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [selectedConversation?.id]);

  function scrollToBottom(instant = false) {
    if (messagesContainerRef.current) {
      if (instant) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }

  async function loadData() {
    try {
      // Load user's businesses and consumer conversations in parallel
      const [businesses, consumerConvs] = await Promise.all([
        api.getBusinessesByOwner(currentUser.id),
        api.getUserConversations(currentUser.id)
      ]);
      
      setUserBusinesses(businesses);

      const allConversations: EnrichedConversation[] = [];

      // Add consumer conversations with unread counts
      for (const conv of consumerConvs) {
        const { data: unreadMessages } = await supabase
          .from('messages')
          .select('id')
          .eq('conversation_id', conv.id)
          .eq('sender_type', 'business')
          .is('read_at', null);

        allConversations.push({
          ...conv,
          conversation_type: 'consumer' as const,
          unread_count: unreadMessages?.length || 0
        });
      }

      // Load all business conversations in parallel
      if (businesses.length > 0) {
        const businessConvsPromises = businesses.map(business =>
          api.getBusinessConversations(business.id).then(convs => ({
            business,
            conversations: convs
          }))
        );
        
        const businessConvsResults = await Promise.all(businessConvsPromises);
        
        // Process business conversations
        for (const { business, conversations } of businessConvsResults) {
          for (const conv of conversations) {
            // Fetch username directly from users table (more reliable than auth metadata)
            const { data: userRecord } = await supabase
              .from('users')
              .select('username, email')
              .eq('id', conv.user_id)
              .single();
            
            const userName = userRecord?.username || userRecord?.email?.split('@')[0] || `User ${conv.user_id.substring(0, 8)}`;
            
            // Get unread count
            const { data: unreadMessages } = await supabase
              .from('messages')
              .select('id')
              .eq('conversation_id', conv.id)
              .eq('sender_type', 'user')
              .is('read_at', null);
            
            allConversations.push({
              ...conv,
              conversation_type: 'business' as const,
              business_context: business,
              user_display_name: userName,
              unread_count: unreadMessages?.length || 0
            });
          }
        }
      }

      // Sort all conversations by most recent
      allConversations.sort((a, b) => {
        const aTime = a.last_message_at || a.created_at;
        const bTime = b.last_message_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(allConversations);
    } catch (error: any) {
      console.error('Failed to load conversations:', error);
      toast.error(error.message || 'Failed to load conversations');
    }
  }

  async function handleSelectConversation(conversation: EnrichedConversation) {
    if (isSelectionMode) {
      handleToggleConversationSelection(conversation.id);
      return;
    }
    
    setSelectedConversation(conversation);
    
    // Immediately reset unread count in local state
    setConversations(prev => 
      prev.map(c => c.id === conversation.id ? { ...c, unread_count: 0 } : c)
    );
    
    try {
      const msgs = await api.getConversationMessages(conversation.id);
      setMessages(msgs);
      
      // Mark messages as read
      await api.markMessagesAsRead(conversation.id, currentUser.id);
    } catch (error: any) {
      toast.error('Failed to load messages');
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      // Use the conversation type to determine sender type
      const senderType = selectedConversation.conversation_type === 'consumer' ? 'user' : 'business';
      const message = await api.sendMessage(
        selectedConversation.id,
        senderType,
        newMessage.trim()
      );
      
      setMessages([...messages, message]);
      setNewMessage('');
      
      // Refresh conversations to update last_message_at
      await loadData();
      
      // Keep focus on the input field
      messageInputRef.current?.focus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedConversations.size === filteredConversations.length) {
      setSelectedConversations(new Set());
    } else {
      setSelectedConversations(new Set(filteredConversations.map(c => c.id)));
    }
  };

  const handleToggleConversationSelection = (id: string) => {
    const newSelected = new Set(selectedConversations);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedConversations(newSelected);
  };

  const handleDeleteSelected = async () => {
    try {
      // Delete selected conversations from backend
      for (const convId of Array.from(selectedConversations)) {
        await api.deleteConversation(convId);
      }
      
      // Update local state
      setConversations(prev => prev.filter(c => !selectedConversations.has(c.id)));
      setSelectedConversations(new Set());
      setIsSelectionMode(false);
      
      if (selectedConversation && selectedConversations.has(selectedConversation.id)) {
        setSelectedConversation(null);
      }
      
      toast.success(`Deleted ${selectedConversations.size} conversation(s)`);
    } catch (error: any) {
      toast.error('Failed to delete conversations');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  const filteredConversations = conversations.filter(conversation => {
    const participantName = conversation.conversation_type === 'consumer' 
      ? conversation.business?.name || ''
      : conversation.user_display_name || '';
    
    return participantName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentConversationData = selectedConversation;

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-4 md:py-12 px-2 md:px-4">
      {/* Original size: max-w-7xl (1280px) - Current: 30% smaller (~896px) */}
      <div className="max-w-[56rem] mx-auto">
        <div className="h-[calc(100vh-20rem)] md:h-[calc(100vh-12rem)] flex bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar - Conversations List */}
      <div className={`w-full md:w-80 border-r border-white/30 flex flex-col bg-gradient-to-br from-white/95 via-blue-50/90 to-white/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${selectedConversation ? 'hidden md:flex' : ''}`}>
        {/* Glass overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
        
        {/* Header */}
        <div className="p-4 border-b border-white/30 relative z-10 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-blue-500/20 rounded-xl transition-all duration-300">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">All Messages</h1>
            </div>
            
            {/* Selection Controls */}
            <div className="flex items-center space-x-2">
              {!isSelectionMode ? (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="hover:bg-blue-500/20 hover:shadow-md rounded-xl transition-all duration-300"
                >
                  Select
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedConversations(new Set());
                    }}
                    className="hover:bg-red-500/20 hover:shadow-md rounded-xl transition-all duration-300"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  {selectedConversations.size > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setShowDeleteDialog(true)}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-[0_4px_16px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.5)] rounded-xl transition-all duration-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedConversations.size})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Select All Checkbox */}
          {isSelectionMode && (
            <div className="flex items-center space-x-2 mb-4 bg-white/60 backdrop-blur-md rounded-xl p-2 border border-white/40">
              <Checkbox 
                checked={selectedConversations.size === filteredConversations.length && filteredConversations.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Select All ({filteredConversations.length})
              </label>
            </div>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <Input
              placeholder="Search conversations..."
              className="pl-10 bg-white/80 backdrop-blur-md border-white/40 focus:border-blue-500/60 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus:shadow-[0_6px_20px_rgba(59,130,246,0.3)] transition-all duration-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto relative z-10 p-2">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No conversations yet</p>
              <p className="text-sm text-gray-400 mt-2">
                Visit a business profile to start a conversation
              </p>
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const participantName = conversation.conversation_type === 'consumer' 
                ? conversation.business?.name || 'Business'
                : conversation.user_display_name || 'User';
              
              const initials = participantName.split(' ').map(n => n[0]).join('').substring(0, 2);
              
              return (
                <div
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`p-4 mb-2 rounded-xl border-2 cursor-pointer hover:bg-gradient-to-r hover:from-blue-500/10 hover:to-indigo-500/10 backdrop-blur-sm shadow-sm hover:shadow-md ${
                    selectedConversation?.id === conversation.id 
                      ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border-blue-300/60 shadow-[0_4px_16px_rgba(59,130,246,0.3)]' 
                      : 'border-gray-200/60 bg-white/40'
                  } ${selectedConversations.has(conversation.id) ? 'bg-blue-50/80 backdrop-blur-md border-blue-300/50' : ''}`}
                >
                  <div className="flex items-start space-x-3">
                    {/* Selection Checkbox */}
                    {isSelectionMode && (
                      <div className="flex items-center justify-center pt-1">
                        <Checkbox 
                          checked={selectedConversations.has(conversation.id)}
                          onCheckedChange={() => handleToggleConversationSelection(conversation.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                    
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-blue-500/30 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                          {conversation.conversation_type === 'consumer' ? (
                            <Building2 className="w-6 h-6" />
                          ) : (
                            <User className="w-6 h-6" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {participantName}
                        </h3>
                        {conversation.last_message_at && (
                          <span className="text-xs text-gray-500">
                            {formatTime(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={conversation.conversation_type === 'consumer' ? 'default' : 'secondary'} className="text-xs">
                          {conversation.conversation_type === 'consumer' 
                            ? 'Personal' 
                            : conversation.business_context?.name || 'Business'
                          }
                        </Badge>
                        {conversation.business?.city && conversation.conversation_type === 'consumer' && (
                          <span className="text-xs text-gray-500 truncate">
                            {conversation.business.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? '' : 'hidden md:flex'}`}>
        {currentConversationData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/30 bg-gradient-to-r from-white/95 via-blue-50/90 to-white/95 backdrop-blur-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
              <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden hover:bg-blue-500/20 rounded-xl transition-all duration-300"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  
                  <div className="relative">
                    <Avatar className="h-10 w-10 ring-2 ring-blue-500/40 shadow-xl">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {currentConversationData.conversation_type === 'consumer' ? (
                          <Building2 className="w-5 h-5" />
                        ) : (
                          <User className="w-5 h-5" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {currentConversationData.conversation_type === 'consumer'
                        ? currentConversationData.business?.name || 'Business'
                        : currentConversationData.user_display_name || 'User'
                      }
                    </h3>
                    {currentConversationData.business?.city && currentConversationData.conversation_type === 'consumer' && (
                      <p className="text-sm text-gray-500">{currentConversationData.business.city}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Badge variant={currentConversationData.conversation_type === 'consumer' ? 'default' : 'secondary'}>
                    {currentConversationData.conversation_type === 'consumer' 
                      ? 'Personal' 
                      : currentConversationData.business_context?.name || 'Business'
                    }
                  </Badge>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 hover:bg-blue-500/20 hover:shadow-md rounded-xl transition-all duration-300"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      align="end" 
                      className="w-56 bg-gradient-to-br from-white/95 via-blue-50/90 to-white/95 backdrop-blur-xl border-white/40"
                      sideOffset={5}
                    >
                      <DropdownMenuItem className="cursor-pointer hover:bg-blue-500/10 rounded-lg">
                        <BellOff className="h-4 w-4 mr-2" />
                        Mute Notifications
                      </DropdownMenuItem>
                      <DropdownMenuItem className="cursor-pointer hover:bg-blue-500/10 rounded-lg">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive Conversation
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/30" />
                      <DropdownMenuItem className="text-orange-600 cursor-pointer hover:bg-orange-500/10 rounded-lg">
                        <Flag className="h-4 w-4 mr-2" />
                        Report User
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 cursor-pointer hover:bg-red-500/10 rounded-lg">
                        <Shield className="h-4 w-4 mr-2" />
                        Block User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50/80 via-blue-50/30 to-gray-50/80" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((message) => {
                  const isOwnMessage = 
                    (selectedConversation.conversation_type === 'consumer' && message.sender_type === 'user') ||
                    (selectedConversation.conversation_type === 'business' && message.sender_type === 'business');
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] ${
                          isOwnMessage
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                            : 'bg-gradient-to-br from-white/95 to-gray-50/90 text-gray-900 backdrop-blur-md border border-white/40'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          isOwnMessage ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/30 bg-gradient-to-r from-white/95 via-blue-50/90 to-white/95 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
              <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent pointer-events-none"></div>
              <form onSubmit={handleSendMessage} className="flex items-center space-x-2 relative z-10">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending}
                  className="flex-1 bg-white/80 backdrop-blur-md border-white/40 focus:border-blue-500/60 rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] focus:shadow-[0_6px_20px_rgba(59,130,246,0.3)] transition-all duration-300"
                  ref={messageInputRef}
                />
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-blue-500/20 hover:shadow-md rounded-xl transition-all duration-300"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={!newMessage.trim() || isSending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-[0_4px_16px_rgba(59,130,246,0.4)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.5)] rounded-xl transition-all duration-300 hover:scale-105"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          /* No Conversation Selected */
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50/80 via-blue-50/30 to-gray-50/80">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_8px_24px_rgba(59,130,246,0.2)]">
                <Search className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversation selected
              </h3>
              <p className="text-gray-500">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-gradient-to-br from-white/95 via-blue-50/90 to-white/95 backdrop-blur-xl border-white/40">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedConversations.size} Conversation{selectedConversations.size > 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedConversations.size} conversation{selectedConversations.size > 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => setShowDeleteDialog(false)}
              className="bg-white/90 backdrop-blur-md hover:bg-white border-white/60 rounded-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-[0_4px_16px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.5)] rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
      </div>
    </div>
  );
}