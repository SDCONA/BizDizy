import { useState, useEffect, useRef } from 'react';
import { transformImageUrl, IMAGE_PRESETS } from '../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  preset?: keyof typeof IMAGE_PRESETS;
  width?: number;
  height?: number;
  quality?: number;
  priority?: boolean; // Don't lazy load if true
  onClick?: () => void;
}

/**
 * Optimized image component with:
 * - WebP conversion
 * - Lazy loading
 * - Blur-up placeholder
 * - Responsive sizing
 */
export function OptimizedImage({
  src,
  alt,
  className = '',
  preset,
  width,
  height,
  quality = 85,
  priority = false,
  onClick
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    if (priority) return; // Skip lazy loading for priority images

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Load 200px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Get optimized image URL
  const getOptimizedUrl = (format: 'webp' | 'jpg' = 'webp') => {
    if (preset) {
      // Use preset with WebP
      return transformImageUrl(src, { ...IMAGE_PRESETS[preset], format });
    }
    
    // Custom transformation
    return transformImageUrl(src, {
      width,
      height,
      quality,
      format,
      resize: 'cover'
    });
  };

  // Thumbnail for blur placeholder (10% of original size, low quality)
  const thumbnailUrl = transformImageUrl(src, {
    width: width ? Math.round(width * 0.1) : 50,
    quality: 20,
    format: 'webp'
  });

  const optimizedUrl = getOptimizedUrl('webp');
  const fallbackUrl = getOptimizedUrl('jpg');

  return (
    <div className={`relative overflow-hidden ${className}`} ref={imgRef}>
      {/* Blur placeholder - loads immediately, tiny file */}
      {!isLoaded && isInView && (
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
          aria-hidden="true"
        />
      )}

      {/* Main image - loads when in viewport */}
      {isInView && (
        <picture>
          {/* WebP for modern browsers */}
          <source srcSet={optimizedUrl} type="image/webp" />
          
          {/* JPEG fallback for older browsers */}
          <source srcSet={fallbackUrl} type="image/jpeg" />
          
          {/* Actual img element */}
          <img
            src={fallbackUrl}
            alt={alt}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setIsLoaded(true)}
            loading={priority ? 'eager' : 'lazy'}
            onClick={onClick}
          />
        </picture>
      )}

      {/* Loading state placeholder (before image enters viewport) */}
      {!isInView && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse" />
      )}
    </div>
  );
}

/**
 * Optimized background image with blur-up effect
 */
export function OptimizedBackgroundImage({
  src,
  className = '',
  children,
  preset,
  quality = 85
}: {
  src: string;
  className?: string;
  children?: React.ReactNode;
  preset?: keyof typeof IMAGE_PRESETS;
  quality?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);

  const optimizedUrl = preset
    ? transformImageUrl(src, { ...IMAGE_PRESETS[preset], format: 'webp' })
    : transformImageUrl(src, { quality, format: 'webp' });

  const thumbnailUrl = transformImageUrl(src, {
    width: 50,
    quality: 20,
    format: 'webp'
  });

  return (
    <div className={`relative ${className}`}>
      {/* Blur placeholder background */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-xl scale-110 transition-opacity duration-500"
        style={{
          backgroundImage: `url(${thumbnailUrl})`,
          opacity: isLoaded ? 0 : 1
        }}
      />

      {/* Main background */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `url(${optimizedUrl})` }}
      />

      {/* Preload main image */}
      <img
        src={optimizedUrl}
        alt=""
        className="hidden"
        onLoad={() => setIsLoaded(true)}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
