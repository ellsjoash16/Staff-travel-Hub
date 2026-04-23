-- Allow admins to update any profile row (needed for avatar management)
-- Use a security definer function to avoid recursive RLS on the profiles table
create or replace function public.get_my_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

grant execute on function public.get_my_role() to authenticated;

-- Admins can update any profile (e.g. to set avatar_url)
create policy "Admin can update any profile"
  on public.profiles for update
  using (public.get_my_role() = 'admin');
