import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
  onSetAsMain?: (index: number) => void;
}

export function ImageLightbox({ images, initialIndex, onClose, onSetAsMain }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowLeft") handlePrevious();
    if (e.key === "ArrowRight") handleNext();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Image Counter */}
      <div className="absolute top-4 left-4 text-white px-4 py-2 bg-black/50 rounded-lg">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Set as Main Button */}
      {onSetAsMain && (
        <div className="absolute bottom-38 md:bottom-4 left-1/2 -translate-x-1/2 z-20 pb-safe">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSetAsMain(currentIndex);
              onClose();
            }}
            disabled={currentIndex === 0}
            size="sm"
            className="bg-white text-black hover:bg-gray-200 disabled:opacity-50 shadow-xl font-medium"
          >
            {currentIndex === 0 ? '✓ Current Main' : 'Set as Main'}
          </Button>
        </div>
      )}

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
          >
            <ChevronLeft className="w-8 h-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 w-12 h-12"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          >
            <ChevronRight className="w-8 h-8" />
          </Button>
        </>
      )}

      {/* Image */}
      <img
        src={images[currentIndex]}
        alt={`Image ${currentIndex + 1}`}
        className="max-w-[90vw] max-h-[75vh] md:max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}