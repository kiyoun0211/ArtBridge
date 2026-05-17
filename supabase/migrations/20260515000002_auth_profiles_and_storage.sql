-- Minimal auth + storage layer on top of the design schema.
-- Adds: profiles (role tracking), handle_new_user trigger, storage buckets.

-- ===== profiles =====
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          text not null default 'buyer' check (role in ('artist','buyer')),
  email         text not null,
  display_name  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Allow each user to read/update only their own row
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id);

-- ===== handle_new_user trigger =====
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'buyer'),
    new.raw_user_meta_data ->> 'display_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===== Storage buckets (private; signed URLs in app code) =====
insert into storage.buckets (id, name, public)
values ('artwork-originals', 'artwork-originals', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('space-uploads', 'space-uploads', false)
on conflict (id) do nothing;
