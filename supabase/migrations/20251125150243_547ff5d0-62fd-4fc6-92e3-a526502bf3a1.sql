-- Make user_id nullable since authentication is removed
ALTER TABLE public.answer_keys 
ALTER COLUMN user_id DROP NOT NULL;