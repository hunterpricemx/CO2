-- ============================================================
-- 008_storage.sql
-- Supabase Storage bucket for media uploads
--
-- Run this in the SQL editor, OR create the bucket manually:
-- Dashboard → Storage → New bucket → "conquer-media" (public)
-- ============================================================

-- Create the storage bucket (public so images are accessible without auth)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'conquer-media',
  'conquer-media',
  TRUE,
  5242880,  -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- Storage RLS policies
-- ----------------------------------------------------------------

-- Anyone can read public files
CREATE POLICY "conquer-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'conquer-media');

-- Only admins can upload files
CREATE POLICY "conquer-media: admin upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );

-- Only admins can update files
CREATE POLICY "conquer-media: admin update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );

-- Only admins can delete files
CREATE POLICY "conquer-media: admin delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'conquer-media'
    AND public.is_admin()
  );
