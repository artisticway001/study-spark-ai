-- Update RLS policies to allow public access without authentication
-- This is for development/testing purposes only

-- Drop existing policies on answer_keys
DROP POLICY IF EXISTS "Users can view own answer keys" ON public.answer_keys;
DROP POLICY IF EXISTS "Users can create own answer keys" ON public.answer_keys;
DROP POLICY IF EXISTS "Users can update own answer keys" ON public.answer_keys;
DROP POLICY IF EXISTS "Users can delete own answer keys" ON public.answer_keys;

-- Create permissive policies for public access
CREATE POLICY "Anyone can view answer keys"
ON public.answer_keys
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can create answer keys"
ON public.answer_keys
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update answer keys"
ON public.answer_keys
FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can delete answer keys"
ON public.answer_keys
FOR DELETE
TO anon, authenticated
USING (true);

-- Update storage policies for public access
DROP POLICY IF EXISTS "Users can view own answer key images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own answer key images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own answer key images" ON storage.objects;

CREATE POLICY "Anyone can view answer key images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'answer-keys');

CREATE POLICY "Anyone can upload answer key images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'answer-keys');

CREATE POLICY "Anyone can delete answer key images"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'answer-keys');