-- Create storage bucket for answer key images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'answer-keys',
  'answer-keys',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own answer key images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own answer key images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own answer key images" ON storage.objects;

-- Create RLS policies for storage.objects
CREATE POLICY "Users can view own answer key images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'answer-keys' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own answer key images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'answer-keys' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own answer key images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'answer-keys' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);