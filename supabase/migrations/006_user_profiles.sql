-- Profiles table
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  avatar_url text,
  role       text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Add user_id and status to posts
alter table public.posts
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists status  text not null default 'approved';

-- Existing posts remain approved
update public.posts set status = 'approved' where true;

-- Enable RLS on profiles
alter table public.profiles enable row level security;

create policy "Anyone can read profiles"
  on public.profiles for select using (true);
create policy "User can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "User can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Update posts RLS
drop policy if exists "Public read posts" on public.posts;
create policy "Read approved or own posts" on public.posts
  for select using (
    status = 'approved'
    or auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Anon insert posts" on public.posts;
create policy "Auth users can insert posts" on public.posts
  for insert with check (auth.uid() is not null);

drop policy if exists "Anon update posts" on public.posts;
create policy "Owner or admin can update posts" on public.posts
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Anon delete posts" on public.posts;
create policy "Owner or admin can delete posts" on public.posts
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );
