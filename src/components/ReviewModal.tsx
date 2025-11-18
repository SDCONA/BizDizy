import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Star, Send } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { User } from "../types/user";
import { Review } from "../types/business";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessName: string;
  currentUser: User | null;
  onLoginRequired: () => void;
  onSubmitReview: (review: Omit<Review, "id" | "date">) => void;
  existingReview?: Review | null;
  canEdit?: boolean;
}

export function ReviewModal({ open, onOpenChange, businessName, currentUser, onLoginRequired, onSubmitReview, existingReview, canEdit = true }: ReviewModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');

  // Update state when existingReview changes or modal opens
  useEffect(() => {
    if (open && existingReview) {
      setRating(existingReview.rating);
      setComment(existingReview.comment || '');
    } else if (open && !existingReview) {
      setRating(0);
      setComment('');
    }
  }, [open, existingReview]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!currentUser) {
      toast.error("Please log in to leave a review");
      onOpenChange(false);
      onLoginRequired();
      return;
    }
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    setIsSubmitting(true);

    // Create review object
    const review: Omit<Review, "id" | "date"> = {
      userId: currentUser.id,
      authorName: currentUser.username,
      rating,
      comment: comment,
    };

    // Submit review
    setTimeout(() => {
      onSubmitReview(review);
      setIsSubmitting(false);
      setRating(0);
      setComment('');
      onOpenChange(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>{existingReview ? 'Update Your Review' : 'Leave a Review'}</DialogTitle>
              <DialogDescription>
                {currentUser ? (
                  existingReview ? `Update your review for ${businessName}` : `Share your experience with ${businessName}`
                ) : (
                  "Please log in to leave a review"
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!currentUser && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              You need to be logged in to leave a review. Please log in or create an account.
            </p>
            <Button
              onClick={() => {
                onOpenChange(false);
                onLoginRequired();
              }}
              className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Log In / Sign Up
            </Button>
          </div>
        )}

        {currentUser && existingReview && !canEdit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              Reviews can only be edited within 15 days of posting. Your review was posted more than 15 days ago and can no longer be modified.
            </p>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full mt-3"
            >
              Close
            </Button>
          </div>
        )}

        {currentUser && canEdit && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Your Rating *</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredRating || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Your Review *</Label>
              <Textarea
                id="comment"
                name="comment"
                placeholder="Tell us about your experience..."
                rows={5}
                required
                className="bg-gray-50 resize-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRating(0);
                  setComment('');
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {isSubmitting ? (existingReview ? "Updating..." : "Submitting...") : (existingReview ? "Update Review" : "Submit Review")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
