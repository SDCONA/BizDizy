import { Business } from "../types/business";
import { Star, MapPin, Phone, ExternalLink, Award, Share2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { toast } from "sonner@2.0.3";
import { OptimizedImage } from "./OptimizedImage";

interface BusinessCardProps {
  business: Business;
  onClick: () => void;
}

export function BusinessCard({ business, onClick }: BusinessCardProps) {
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    // Create shareable URL for this specific business
    const baseUrl = window.location.origin + window.location.pathname;
    const businessUrl = `${baseUrl}?business=${business.id}`;
    
    const categoryDisplay = business.categoryName || business.category?.name || 'business';
    const cityDisplay = business.city || 'your area';
    
    const shareData = {
      title: business.name,
      text: `Check out ${business.name} - ${categoryDisplay} in ${cityDisplay}`,
      url: businessUrl
    };

    // Try to use native Web Share API (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        // Share was successful - OS provides its own feedback
      } catch (err) {
        const error = err as Error;
        // User cancelled the share - this is normal, don't show error
        if (error.name !== "AbortError") {
          // Only show error for actual failures
          fallbackCopyToClipboard(businessUrl);
        }
      }
    } else {
      // Web Share API not supported - fallback to copy link
      fallbackCopyToClipboard(businessUrl);
    }
  };

  const fallbackCopyToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!", {
        description: "Share this link with anyone to show them this business"
      });
    } catch (err) {
      // Fallback for older browsers
      try {
        const input = document.createElement("input");
        input.value = url;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        toast.success("Link copied to clipboard!");
      } catch (fallbackErr) {
        toast.error("Unable to share", {
          description: "Please copy the URL manually"
        });
      }
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
        {business.portfolio && business.portfolio.length > 0 && business.portfolio[0] ? (
          <OptimizedImage
            src={business.portfolio[0]}
            alt={business.name}
            preset="CARD"
            className="w-full h-full group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Award className="w-16 h-16 text-blue-300" />
          </div>
        )}
        {business.featured && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
              Featured
            </Badge>
          </div>
        )}
        
        {/* Share Button Overlay */}
        <div className="absolute top-3 left-3">
          <Button
            size="icon"
            variant="secondary"
            className="w-9 h-9 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="mb-3">
          <h3 className="mb-1">{business.name}</h3>
          <Badge variant="outline" className="text-xs">
            {business.categoryName || business.category?.name || 'Uncategorized'}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {business.description || 'No description available'}
        </p>

        <div className="space-y-2 mb-4">
          {(business.city || business.serviceArea) && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{business.city || business.serviceArea}</span>
            </div>
          )}
          {business.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span>{business.phone}</span>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 flex-shrink min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 flex-shrink-0" />
              <span className="text-amber-600 whitespace-nowrap">{business.rating?.toFixed(1) || '0.0'}</span>
            </div>
            <span className="text-sm text-muted-foreground truncate">
              ({business.reviewCount || 0} reviews)
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="group-hover:bg-blue-50 group-hover:text-blue-600"
          >
            View Details
            <ExternalLink className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}