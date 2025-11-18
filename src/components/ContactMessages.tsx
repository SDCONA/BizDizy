import { useState, useEffect } from "react";
import { ArrowLeft, Mail, Trash2, Clock, CheckCircle2, MailOpen, Loader2, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner@2.0.3";
import { 
  getContactMessages, 
  markContactMessageAsRead, 
  deleteContactMessage,
  replyToContactMessage
} from "../utils/api";
import { ContactMessage } from "../types/business";
import { EmptyState } from "./EmptyState";
import { Pagination } from "./Pagination";

interface ContactMessagesProps {
  onBack?: () => void;
}

export function ContactMessages({ onBack }: ContactMessagesProps) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState<Record<string, boolean>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const MESSAGES_PER_PAGE = 20;

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await getContactMessages();
      setMessages(data);
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markContactMessageAsRead(messageId);
      setMessages(messages.map(msg => 
        msg.id === messageId ? { ...msg, read: true } : msg
      ));
      toast.success('Message marked as read');
    } catch (error) {
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteContactMessage(deleteId);
      setMessages(messages.filter(msg => msg.id !== deleteId));
      toast.success('Message deleted');
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const toggleExpand = (messageId: string) => {
    if (expandedId === messageId) {
      setExpandedId(null);
    } else {
      setExpandedId(messageId);
      // Auto-mark as read when expanded
      const message = messages.find(msg => msg.id === messageId);
      if (message && !message.read) {
        handleMarkAsRead(messageId);
      }
    }
  };

  const handleSendReply = async (messageId: string) => {
    const reply = replyText[messageId];
    if (!reply || !reply.trim()) {
      toast.error('Please enter a reply');
      return;
    }

    try {
      setSendingReply(prev => ({ ...prev, [messageId]: true }));
      await replyToContactMessage(messageId, reply);
      toast.success('Reply sent successfully');
      setReplyText(prev => ({ ...prev, [messageId]: '' }));
    } catch (error) {
      toast.error('Failed to send reply');
    } finally {
      setSendingReply(prev => ({ ...prev, [messageId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
  };

  const unreadCount = messages.filter(msg => !msg.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {onBack && (
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
            <MailOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3>Contact Messages</h3>
            <p className="text-gray-500 text-sm">
              Messages from the Contact Us form
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Badge className="bg-red-500 text-white px-3 py-1">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {/* Messages List */}
      <div>
        {messages.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No messages yet"
            description="Contact form submissions will appear here"
          />
        ) : (
          <div className="space-y-4">
            {messages.slice((currentPage - 1) * MESSAGES_PER_PAGE, currentPage * MESSAGES_PER_PAGE).map((message) => (
              <Card 
                key={message.id}
                className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                  !message.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
                onClick={() => toggleExpand(message.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {!message.read ? (
                        <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <h3 className={!message.read ? "text-blue-900" : "text-gray-900"}>
                        {message.subject}
                      </h3>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <span>{message.name}</span> • <span>{message.email}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {formatDate(message.created_at)}
                    </div>

                    {/* Expanded message */}
                    {expandedId === message.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-2">Message:</p>
                          <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                            {message.message}
                          </p>
                        </div>
                        
                        {/* Reply Section */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <label className="text-sm text-gray-500 mb-2 block">
                            Reply to {message.name}:
                          </label>
                          <Textarea
                            value={replyText[message.id] || ''}
                            onChange={(e) => setReplyText(prev => ({ ...prev, [message.id]: e.target.value }))}
                            placeholder="Type your reply here..."
                            className="mb-2 min-h-[100px]"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSendReply(message.id)}
                            disabled={sendingReply[message.id] || !replyText[message.id]?.trim()}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendingReply[message.id] ? 'Sending...' : 'Send Reply'}
                          </Button>
                          <p className="text-xs text-gray-500 mt-2">
                            Note: In production, this would send an email to {message.email}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {!message.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkAsRead(message.id);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(message.id);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {messages.length > MESSAGES_PER_PAGE && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(messages.length / MESSAGES_PER_PAGE)}
          onPageChange={setCurrentPage}
          itemsPerPage={MESSAGES_PER_PAGE}
          totalItems={messages.length}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}