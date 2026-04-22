-- Run this in your Supabase SQL editor to enable the Trips feature

create table if not exists trips (
  id         text primary key,
  name       text not null,
  participants text[] not null default '{}',
  date       date,
  image_url  text,
  image_path text,
  created_at timestamptz default now()
);

-- Allow public read
alter table trips enable row level security;
create policy "Public read" on trips for select using (true);
create policy "Auth insert" on trips for insert with check (true);
create policy "Auth update" on trips for update using (true);
create policy "Auth delete" on trips for delete using (true);
