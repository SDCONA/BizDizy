// ============================================
// IMAGE OPTIMIZATION UTILITIES
// For performance optimization at scale
// ============================================

/**
 * Supabase image transformation parameters
 * Docs: https://supabase.com/docs/guides/storage/image-transformations
 */
export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number; // 1-100
  format?: 'webp' | 'avif' | 'jpg' | 'png';
  resize?: 'contain' | 'cover' | 'fill';
}

/**
 * Transform Supabase storage URL with optimization parameters
 * 
 * Example:
 * transformImageUrl(url, { width: 400, quality: 80, format: 'webp' })
 */
export function transformImageUrl(
  url: string, 
  options: ImageTransformOptions = {}
): string {
  if (!url) return url;
  
  // Check if it's a Supabase storage URL
  const isSupabaseUrl = url.includes('supabase.co/storage/v1/object');
  if (!isSupabaseUrl) return url;
  
  // Build transformation parameters
  const params = new URLSearchParams();
  
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.quality) params.append('quality', options.quality.toString());
  if (options.format) params.append('format', options.format);
  if (options.resize) params.append('resize', options.resize);
  
  // If no transformations, return original URL
  if (params.toString() === '') return url;
  
  // Add transformation parameters to URL
  return `${url}?${params.toString()}`;
}

/**
 * Preset image sizes for common use cases
 */
export const IMAGE_PRESETS = {
  // Thumbnails (category cards, small previews)
  THUMBNAIL: { width: 200, quality: 75, format: 'webp' as const },
  
  // Business card images
  CARD: { width: 400, quality: 80, format: 'webp' as const },
  
  // Business profile header
  PROFILE_HEADER: { width: 800, quality: 85, format: 'webp' as const },
  
  // Gallery images
  GALLERY_THUMB: { width: 300, quality: 75, format: 'webp' as const },
  GALLERY_FULL: { width: 1200, quality: 85, format: 'webp' as const },
  
  // User avatars
  AVATAR_SMALL: { width: 40, height: 40, quality: 75, format: 'webp' as const, resize: 'cover' as const },
  AVATAR_MEDIUM: { width: 80, height: 80, quality: 80, format: 'webp' as const, resize: 'cover' as const },
  AVATAR_LARGE: { width: 200, height: 200, quality: 85, format: 'webp' as const, resize: 'cover' as const },
};

/**
 * Get optimized image URL using preset
 */
export function getOptimizedImageUrl(
  url: string,
  preset: keyof typeof IMAGE_PRESETS
): string {
  return transformImageUrl(url, IMAGE_PRESETS[preset]);
}

/**
 * Lazy loading configuration for images
 */
export const LAZY_LOAD_CONFIG = {
  // Load images when they're within 200px of viewport
  rootMargin: '200px',
  
  // Trigger only once
  threshold: 0.01,
};

/**
 * Generate srcset for responsive images
 * Creates multiple sizes for different screen densities
 */
export function generateSrcSet(url: string, baseWidth: number): string {
  if (!url.includes('supabase.co/storage')) return '';
  
  const sizes = [
    { width: baseWidth, descriptor: '1x' },
    { width: baseWidth * 1.5, descriptor: '1.5x' },
    { width: baseWidth * 2, descriptor: '2x' },
  ];
  
  return sizes
    .map(({ width, descriptor }) => {
      const optimized = transformImageUrl(url, { 
        width: Math.round(width), 
        quality: 85,
        format: 'webp'
      });
      return `${optimized} ${descriptor}`;
    })
    .join(', ');
}

/**
 * Validate image file before upload
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Max 5MB (Supabase free tier limit for individual files)
  const MAX_SIZE = 5 * 1024 * 1024;
  
  // Allowed types
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only JPG, PNG, WebP, GIF, and AVIF images are allowed',
    };
  }
  
  if (file.size > MAX_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    return {
      valid: false,
      error: `Image must be smaller than 5MB (current size: ${sizeMB}MB)`,
    };
  }
  
  return { valid: true };
}

/**
 * Compress image on client side before upload
 * Returns a compressed File object
 */
export async function compressImage(
  file: File,
  maxWidth: number = 2000,
  quality: number = 0.85
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Scale down if larger than maxWidth
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            
            // Create new file with same name
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Get image dimensions from file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Preload critical images
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${url}`));
    img.src = url;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(preloadImage));
}
