-- ============================================
-- BIZDIZY STORAGE BUCKETS SETUP
-- ============================================
-- Run this AFTER running COMPLETE_FRESH_SETUP.sql
-- This sets up storage buckets for business gallery images

-- Create the business gallery images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('make-726d4144-gallery', 'make-726d4144-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the gallery bucket
CREATE POLICY "Gallery images are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'make-726d4144-gallery');

CREATE POLICY "Authenticated users can upload gallery images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'make-726d4144-gallery');

CREATE POLICY "Users can update their own gallery images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'make-726d4144-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own gallery images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'make-726d4144-gallery' AND auth.uid()::text = (storage.foldername(name))[1]);
