-- TutorPro English classroom file storage bucket
-- Run this SQL in the Supabase SQL editor to create the storage bucket and policies.
-- The app uses this bucket for teacher classroom uploads that students can view on the lesson board.

-- Create the classroom-files bucket (private, files accessed via signed URLs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'classroom-files',
  'classroom-files',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/svg+xml',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/epub+zip',
    'text/plain',
    'application/octet-stream'
  ]
) ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- The TutorPro app uses its own parent/teacher/admin login plus the Supabase publishable key.
-- These storage policies allow the classroom app to upload and create signed URLs while
-- keeping the bucket private from normal public browsing.
DROP POLICY IF EXISTS "Classroom participants upload files" ON storage.objects;
CREATE POLICY "Classroom participants upload files"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'classroom-files');

DROP POLICY IF EXISTS "Classroom participants read files" ON storage.objects;
CREATE POLICY "Classroom participants read files"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'classroom-files');

DROP POLICY IF EXISTS "Classroom participants update files" ON storage.objects;
CREATE POLICY "Classroom participants update files"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'classroom-files')
  WITH CHECK (bucket_id = 'classroom-files');

DROP POLICY IF EXISTS "Classroom participants delete files" ON storage.objects;
CREATE POLICY "Classroom participants delete files"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'classroom-files');

SELECT 'TutorPro classroom-files Supabase Storage bucket is ready' AS result;
