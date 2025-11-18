import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Flag, Send } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { AuthUser } from "../types/user";
import { createReport } from "../utils/api";

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  businessName: string;
  currentUser: AuthUser | null;
  onLoginRequired?: () => void;
}

export function ReportModal({ open, onOpenChange, businessId, businessName, currentUser, onLoginRequired }: ReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("Please log in to submit a report");
      onOpenChange(false);
      if (onLoginRequired) {
        onLoginRequired();
      }
      return;
    }

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const description = formData.get('message') as string;

    try {
      await createReport({
        reporter_id: currentUser.id,
        report_type: 'business',
        target_id: businessId,
        reason: reason,
        description: description,
        status: 'pending',
      });

      toast.success("Report submitted successfully", {
        description: "We'll review your report and take appropriate action."
      });
      onOpenChange(false);
      form.reset();
      setReason("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      console.error('Error submitting report:', errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Report Business</DialogTitle>
              <DialogDescription>
                {currentUser ? `Report an issue with ${businessName}` : 'Please log in to report a business'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!currentUser ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 mb-3">
              You need to be logged in to report a business. This helps us prevent spam and maintain the quality of our platform.
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                if (onLoginRequired) {
                  onLoginRequired();
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Log In / Sign Up
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason *</Label>
              <Select name="reason" required value={reason} onValueChange={setReason}>
                <SelectTrigger className="bg-gray-50">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inappropriate Content">Inappropriate Content</SelectItem>
                  <SelectItem value="Spam or Scam">Spam or Scam</SelectItem>
                  <SelectItem value="Fake Business">Fake Business</SelectItem>
                  <SelectItem value="Duplicate Listing">Duplicate Listing</SelectItem>
                  <SelectItem value="Incorrect Information">Incorrect Information</SelectItem>
                  <SelectItem value="Offensive Content">Offensive Content</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-message">Details *</Label>
              <Textarea
                id="report-message"
                name="message"
                placeholder="Please provide details about the issue..."
                rows={5}
                required
                className="bg-gray-50 resize-none"
              />
              <p className="text-xs text-muted-foreground">
                The more details you provide, the faster we can address the issue
              </p>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Your report will be anonymous to the business owner. We'll follow up with you at <strong>{currentUser.email}</strong> if we need more information.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-red-600 hover:bg-red-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}