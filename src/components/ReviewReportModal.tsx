import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Flag, Send } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { AuthUser } from "../types/user";
import { createReport } from "../utils/api";

interface ReviewReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: string;
  reviewAuthor: string;
  businessName: string;
  currentUser: AuthUser | null;
}

export function ReviewReportModal({ open, onOpenChange, reviewId, reviewAuthor, businessName, currentUser }: ReviewReportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!currentUser) {
      toast.error("You must be logged in to report a review");
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const description = formData.get('details') as string;

    try {
      await createReport({
        reporter_id: currentUser.id,
        report_type: 'review',
        target_id: reviewId,
        reason: reason,
        description: description,
        status: 'pending',
      });

      toast.success("Review report submitted successfully", {
        description: "We'll review this report and take appropriate action."
      });
      onOpenChange(false);
      form.reset();
      setReason("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
      console.error('Error submitting review report:', errorMessage);
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
              <DialogTitle>Report Review</DialogTitle>
              <DialogDescription>
                Report review by {reviewAuthor} for {businessName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="review-report-reason">Reason *</Label>
            <Select
              id="review-report-reason"
              name="reason"
              value={reason}
              onValueChange={setReason}
              required
              className="bg-gray-50"
            >
              <SelectTrigger className="bg-gray-50">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent className="bg-gray-50">
                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                <SelectItem value="false_information">False Information</SelectItem>
                <SelectItem value="spam">Spam</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-report-details">Details *</Label>
            <Textarea
              id="review-report-details"
              name="details"
              placeholder="Please provide more information about why this review should be removed..."
              rows={5}
              required
              className="bg-gray-50 resize-none"
            />
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
      </DialogContent>
    </Dialog>
  );
}