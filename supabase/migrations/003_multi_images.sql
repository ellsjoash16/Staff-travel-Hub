-- Add multi-image support to posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_urls  text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS image_paths text[] NOT NULL DEFAULT '{}';

-- Migrate existing single images into the arrays
UPDATE public.posts
SET
  image_urls  = ARRAY[image_url],
  image_paths = ARRAY[image_path]
WHERE image_url IS NOT NULL AND array_length(image_urls, 1) IS NULL;
