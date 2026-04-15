-- Posts table
create table if not exists public.posts (
  id          text             primary key,
  title       text             not null,
  staff       text             not null,
  review      text             not null,
  loc_name    text             not null default '',
  loc_lat     double precision,
  loc_lng     double precision,
  date        text,
  tags        text[]           not null default '{}',
  image_url   text,
  image_path  text,
  rise_url    text,
  rise_title  text,
  rise_desc   text,
  created_at  timestamptz      not null default now()
);

-- Settings table (single row, id always = 1)
create table if not exists public.settings (
  id       integer primary key default 1,
  title    text    not null default 'Staff Travel Hub',
  logo     text    not null default '✈️',
  heading  text    not null default 'Latest Staff Adventures',
  color    text    not null default '#0077b6',
  password text    not null default 'admin123',
  welcome  text    not null default '',
  constraint settings_singleton check (id = 1)
);

-- Seed default settings row
insert into public.settings (id) values (1)
  on conflict (id) do nothing;

-- RLS: open read/write (internal tool, password-protected at app layer)
alter table public.posts    enable row level security;
alter table public.settings enable row level security;

create policy "Public read posts"    on public.posts    for select using (true);
create policy "Public write posts"   on public.posts    for all    using (true);
create policy "Public read settings" on public.settings for select using (true);
create policy "Public write settings" on public.settings for all   using (true);
