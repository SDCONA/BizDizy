import { createClient } from './client';
import { projectId, publicAnonKey } from './info';
import { compressImage, validateImageFile } from '../imageOptimization';

const supabase = createClient();
const BUCKET_NAME = 'make-726d4144-portfolio';

/**
 * Trigger bucket initialization on the server
 */
async function initializeBucket(): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/admin/init-storage`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    await response.json();
  } catch (error) {
    // Silently handle bucket initialization errors
  }
}

/**
 * Check if the storage bucket exists
 */
export async function checkStorageBucket(): Promise<boolean> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/storage/status`,
      {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      }
    );
    
    const data = await response.json();
    
    if (data.bucketExists) {
      return true;
    } else {
      await initializeBucket();
      return false;
    }
  } catch (error) {
    return false;
  }
}

/**
 * Upload an image to Supabase Storage via server endpoint
 * @param file - The image file to upload
 * @param businessId - The business ID to organize files
 * @returns The public URL of the uploaded image
 */
export async function uploadPortfolioImage(
  file: File,
  businessId: string
): Promise<string> {
  try {
    // Validate file type first
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid image file');
    }
    
    // Compress image if it's larger than 2MB
    let fileToUpload = file;
    const MAX_SIZE_BEFORE_COMPRESSION = 2 * 1024 * 1024; // 2MB
    const MAX_SIZE_TOTAL = 5 * 1024 * 1024; // 5MB (Supabase limit)
    
    if (file.size > MAX_SIZE_BEFORE_COMPRESSION) {
      try {
        // Compress to max 2000px width with 85% quality
        fileToUpload = await compressImage(file, 2000, 0.85);
        
        // If still too large after compression, try again with lower quality
        if (fileToUpload.size > MAX_SIZE_TOTAL) {
          fileToUpload = await compressImage(file, 1600, 0.75);
        }
        
        // Final check
        if (fileToUpload.size > MAX_SIZE_TOTAL) {
          throw new Error(`Image is too large even after compression. Please use a smaller image (current: ${(fileToUpload.size / 1024 / 1024).toFixed(2)}MB, max: 5MB)`);
        }
      } catch (compressionError) {
        // If compression fails, check if original is within limits
        if (file.size > MAX_SIZE_TOTAL) {
          throw new Error('Image is too large and compression failed. Please use a smaller image (max 5MB).');
        }
        // Use original if it's within limits
        fileToUpload = file;
      }
    } else if (file.size > MAX_SIZE_TOTAL) {
      throw new Error(`Image file is too large. Maximum size is 5MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('businessId', businessId);
    
    // Upload via server endpoint (uses service role with full permissions)
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-726d4144/storage/upload`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: formData
      }
    );
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      // If bucket not found, try to initialize it
      if (data.error?.includes('Bucket not found') || data.details?.message?.includes('Bucket not found')) {
        await initializeBucket();
        throw new Error('Storage is being initialized. Please wait a moment and try uploading again.');
      }
      
      if (data.error?.includes('size') || data.error?.includes('payload') || data.error?.includes('too large') || data.statusCode === '413') {
        throw new Error('Image file is too large. Please use images under 5MB.');
      }
      
      if (data.error?.includes('type') || data.error?.includes('format')) {
        throw new Error('Invalid image format. Please use JPG, PNG, GIF, or WEBP images.');
      }
      
      // Provide the actual error message
      const errorMsg = data.message || data.error || 'Unknown error';
      throw new Error(`Upload failed: ${errorMsg}`);
    }
    
    return data.url;
  } catch (error) {
    
    if (error instanceof Error) {
      throw error; // Re-throw our custom errors
    }
    
    throw new Error('Network error during upload. Please check your connection and try again.');
  }
}

/**
 * Upload multiple images
 * @param files - Array of image files
 * @param businessId - The business ID
 * @returns Array of public URLs
 */
export async function uploadMultipleImages(
  files: File[],
  businessId: string
): Promise<string[]> {
  const uploadPromises = files.map(file => uploadPortfolioImage(file, businessId));
  const results = await Promise.all(uploadPromises);
  return results;
}

/**
 * Delete an image from storage
 * @param imageUrl - The public URL of the image
 */
export async function deletePortfolioImage(imageUrl: string): Promise<void> {
  try {
    // Extract file path from URL
    const url = new URL(imageUrl);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf(BUCKET_NAME) + 1).join('/');
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      throw new Error('Failed to delete image. Please try again.');
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Delete all portfolio images for a business
 * @param businessId - The business ID
 */
export async function deleteAllBusinessImages(businessId: string): Promise<void> {
  try {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(businessId);
    
    if (listError) {
      throw new Error('Failed to delete images. Please try again.');
    }
    
    if (files && files.length > 0) {
      const filePaths = files.map(file => `${businessId}/${file.name}`);
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove(filePaths);
      
      if (deleteError) {
        throw new Error('Failed to delete images. Please try again.');
      }
    }
  } catch (error) {
    // Re-throw if it's already a user-friendly Error, otherwise make it user-friendly
    if (error instanceof Error && error.message.startsWith('Failed to')) {
      throw error;
    }
    throw new Error('Failed to delete images. Please try again.');
  }
}

/**
 * Convert base64 data URL to File object
 * @param dataUrl - Base64 data URL
 * @param fileName - Name for the file
 */
export function dataURLtoFile(dataUrl: string, fileName: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, { type: mime });
}
