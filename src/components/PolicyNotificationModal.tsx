import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import {
  getUserPolicyNotifications,
  acknowledgePolicyNotification,
} from '../utils/api';
import { PolicyNotification } from '../types/business';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

export function PolicyNotificationModal() {
  const [notifications, setNotifications] = useState<PolicyNotification[]>([]);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const data = await getUserPolicyNotifications();
      setNotifications(data);
      if (data.length > 0) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Failed to load policy notifications:', error);
    }
  }

  async function handleAcknowledge() {
    if (notifications.length === 0) return;
    
    try {
      setIsAcknowledging(true);
      
      // Acknowledge ALL notifications at once
      await Promise.all(
        notifications.map(notification => 
          acknowledgePolicyNotification(notification.id)
        )
      );

      setIsOpen(false);
      setNotifications([]);
    } catch (error) {
      toast.error('Failed to acknowledge policy');
    } finally {
      setIsAcknowledging(false);
    }
  }

  if (notifications.length === 0) return null;

  // Check if we have both types of policies updated
  const hasTermsUpdate = notifications.some(n => n.policy?.type === 'terms');
  const hasPrivacyUpdate = notifications.some(n => n.policy?.type === 'privacy');
  
  let policyText = '';
  if (hasTermsUpdate && hasPrivacyUpdate) {
    policyText = 'Our Terms of Service and Privacy Policy have been updated';
  } else if (hasTermsUpdate) {
    policyText = 'Our Terms of Service has been updated';
  } else {
    policyText = 'Our Privacy Policy has been updated';
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle>Policy Update</DialogTitle>
              <DialogDescription>
                {policyText}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            {isAcknowledging ? 'Processing...' : 'OK'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}