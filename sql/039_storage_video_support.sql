-- ============================================================
-- 039_storage_video_support.sql
-- Amplía el bucket conquer-media para permitir videos MP4.
-- Actualiza allowed_mime_types y file_size_limit.
-- ============================================================

UPDATE storage.buckets
SET
  file_size_limit   = 52428800,   -- 50 MB (suficiente para MP4 de referencia)
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime'
  ]
WHERE id = 'conquer-media';
