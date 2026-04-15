CREATE TABLE IF NOT EXISTS public.courses (
  id          text             PRIMARY KEY,
  title       text             NOT NULL,
  description text,
  image_url   text,
  image_path  text,
  rise_url    text             NOT NULL,
  loc_name    text             NOT NULL DEFAULT '',
  loc_lat     double precision,
  loc_lng     double precision,
  created_at  timestamptz      NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read courses"  ON public.courses FOR SELECT USING (true);
CREATE POLICY "Public write courses" ON public.courses FOR ALL    USING (true);
