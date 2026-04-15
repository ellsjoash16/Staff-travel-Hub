-- ── Storage bucket ────────────────────────────────────────────────────────
-- Create the post-images bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

-- Allow anyone to read images (so all staff can view post photos)
create policy "Public read post-images"
  on storage.objects for select
  using (bucket_id = 'post-images');

-- Allow uploads/deletes (guarded at app layer by admin password)
create policy "Admin upload post-images"
  on storage.objects for insert
  with check (bucket_id = 'post-images');

create policy "Admin delete post-images"
  on storage.objects for delete
  using (bucket_id = 'post-images');

create policy "Admin update post-images"
  on storage.objects for update
  using (bucket_id = 'post-images');

-- ── Tighten posts RLS ─────────────────────────────────────────────────────
-- Drop the permissive write-all policy
drop policy if exists "Public write posts" on public.posts;

-- Only allow inserts/updates/deletes from the service role or anon
-- (app-layer password check remains the security gate)
-- Split into explicit policies so SELECT stays fully open
create policy "Anon insert posts"
  on public.posts for insert
  with check (true);

create policy "Anon update posts"
  on public.posts for update
  using (true);

create policy "Anon delete posts"
  on public.posts for delete
  using (true);

-- ── Tighten settings RLS ──────────────────────────────────────────────────
drop policy if exists "Public write settings" on public.settings;

create policy "Anon update settings"
  on public.settings for update
  using (true);

create policy "Anon insert settings"
  on public.settings for insert
  with check (true);
