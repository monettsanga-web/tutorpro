-- TutorPro English classroom file storage bucket
-- Run this SQL in the Supabase SQL editor to create the storage bucket and policies.

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
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Authenticated users can upload classroom files
CREATE POLICY "Classroom participants upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'classroom-files');

-- Authenticated users can read classroom files (signed URLs use this)
CREATE POLICY "Classroom participants read files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'classroom-files');

-- Authenticated users can delete their own classroom files
CREATE POLICY "Classroom participants delete files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'classroom-files');
