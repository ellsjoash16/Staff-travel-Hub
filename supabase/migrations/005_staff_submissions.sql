-- Staff profile image on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS staff_image_url  text,
  ADD COLUMN IF NOT EXISTS staff_image_path text;

-- Show on map toggle for courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS show_on_map boolean NOT NULL DEFAULT false;

-- Staff submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id          text        PRIMARY KEY,
  name        text        NOT NULL,
  loc_name    text        NOT NULL DEFAULT '',
  loc_lat     double precision,
  loc_lng     double precision,
  date        text,
  review      text        NOT NULL DEFAULT '',
  image_urls  text[]      NOT NULL DEFAULT '{}',
  image_paths text[]      NOT NULL DEFAULT '{}',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read submissions"  ON public.submissions FOR SELECT USING (true);
CREATE POLICY "Public write submissions" ON public.submissions FOR ALL    USING (true);
