-- =============================================================================
-- Private Family Archive — initial schema, RLS, and Storage policies
-- Guidelines: docs/DEVELOPMENT_GUIDELINES.md §7, §15, §16, §17
--
-- Security model (defense in depth):
--   * RLS is enabled on every table below.
--   * Reads require an ACTIVE member whose session is AAL2 (MFA completed).
--   * Writes require an ACTIVE admin (owner|admin) at AAL2.
--   * Role lives in `profiles.role` and is NOT user-writable (admin-only writes).
--   * The media bucket is PRIVATE; access is via short-lived signed URLs only.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they can read profiles without
-- triggering RLS recursion). search_path is pinned for safety.
-- ----------------------------------------------------------------------------
create or replace function public.has_aal2()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.is_active
      and p.role in ('owner', 'admin')
  );
$$;

-- Convenience: a member fully authorized to READ content.
create or replace function public.can_read()
returns boolean
language sql
stable
as $$
  select public.is_active_member() and public.has_aal2();
$$;

-- Convenience: an admin fully authorized to WRITE content.
create or replace function public.can_write()
returns boolean
language sql
stable
as $$
  select public.is_admin() and public.has_aal2();
$$;

-- Per-post read authorization by visibility (guidelines §17):
--   'family'          → any authorized member may read
--   'owner'/'private' → owner|admin only
create or replace function public.can_read_post(p_visibility text)
returns boolean
language sql
stable
as $$
  select public.has_aal2()
     and public.is_active_member()
     and (p_visibility = 'family' or public.is_admin());
$$;

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — one row per auth user; role is the source of truth for authz.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  slug         text unique,
  role         text not null default 'viewer'
                 check (role in ('owner', 'admin', 'family', 'viewer')),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- site_settings — single row (id = 1) of editable site-wide values.
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id          int primary key default 1 check (id = 1),
  site_name   text not null default '우리 가족 아카이브',
  owner_label text not null default '수진',
  owner_slug  text not null default 'sujin',
  copyright   text not null default '우리 가족 아카이브',
  updated_at  timestamptz not null default now()
);

create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- categories — owner/family scopes, self-referencing for sub-menus.
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.categories (id) on delete cascade,
  scope       text not null check (scope in ('owner', 'family')),
  name        text not null,
  slug        text not null,
  sort        int not null default 0,
  description text,
  created_at  timestamptz not null default now()
);

-- slug must be unique within a (scope, parent) group.
create unique index if not exists categories_scope_parent_slug_key
  on public.categories (scope, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- ----------------------------------------------------------------------------
-- posts — a titled group of media within one category.
-- ----------------------------------------------------------------------------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories (id) on delete set null,
  title       text not null default '',
  caption     text,
  taken_at    date,
  -- Default 'family': visible to all authorized members. Set 'owner'/'private'
  -- to restrict a post to owner|admin (enforced by can_read_post in RLS).
  visibility  text not null default 'family'
                check (visibility in ('private', 'family', 'owner')),
  effects     jsonb not null default '{}'::jsonb,
  created_by  uuid references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create trigger posts_touch
  before update on public.posts
  for each row execute function public.touch_updated_at();

create index if not exists posts_category_idx on public.posts (category_id);
create index if not exists posts_created_idx on public.posts (created_at desc);

-- ----------------------------------------------------------------------------
-- media — files attached to a post. storage_path is unique; never store URLs.
-- ----------------------------------------------------------------------------
create table if not exists public.media (
  id               uuid primary key default gen_random_uuid(),
  post_id          uuid not null references public.posts (id) on delete cascade,
  kind             text not null check (kind in ('image', 'video')),
  support          text not null default 'web-native'
                     check (support in ('web-native', 'needs-conversion', 'archive-only')),
  status           text not null default 'draft'
                     check (status in ('draft','uploading','uploaded','validating',
                                       'processing','ready','failed','quarantined','deleted')),
  ext              text not null,
  mime             text not null,
  storage_path     text not null unique,
  thumb_path       text,
  poster_path      text,
  placeholder      text,
  width            int,
  height           int,
  duration_seconds numeric,
  exif             jsonb,          -- GPS stripped/private by default (see §13)
  original_name    text,
  alt              text,
  sort             int not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists media_post_idx on public.media (post_id);

-- ----------------------------------------------------------------------------
-- text_blocks — editable copy (plain text), keyed by a stable string.
-- ----------------------------------------------------------------------------
create table if not exists public.text_blocks (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create trigger text_blocks_touch
  before update on public.text_blocks
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- audit_logs — append-only record of admin actions; no user updates/deletes.
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id     bigint generated always as identity primary key,
  actor  uuid references auth.users (id),
  action text not null,
  target text,
  meta   jsonb not null default '{}'::jsonb,
  at     timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.site_settings enable row level security;
alter table public.categories    enable row level security;
alter table public.posts         enable row level security;
alter table public.media         enable row level security;
alter table public.text_blocks   enable row level security;
alter table public.audit_logs    enable row level security;

-- profiles: read own or (admin) all; only admins may write (keeps role immutable
-- by users). An admin-authored Server Action manages display_name changes.
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_write on public.profiles
  for all using (public.can_write()) with check (public.can_write());

-- site_settings: any authorized member reads; admins write.
create policy site_settings_select on public.site_settings
  for select using (public.can_read());
create policy site_settings_write on public.site_settings
  for all using (public.can_write()) with check (public.can_write());

-- categories: members read; admins write.
create policy categories_select on public.categories
  for select using (public.can_read());
create policy categories_write on public.categories
  for all using (public.can_write()) with check (public.can_write());

-- posts: members read non-deleted posts they're allowed to see; admins write.
create policy posts_select on public.posts
  for select using (public.can_read_post(visibility) and deleted_at is null);
create policy posts_write on public.posts
  for all using (public.can_write()) with check (public.can_write());

-- media: readable only when the parent post is readable; admins write.
create policy media_select on public.media
  for select using (
    exists (
      select 1 from public.posts p
      where p.id = media.post_id
        and p.deleted_at is null
        and public.can_read_post(p.visibility)
    )
  );
create policy media_write on public.media
  for all using (public.can_write()) with check (public.can_write());

-- text_blocks: members read; admins write.
create policy text_blocks_select on public.text_blocks
  for select using (public.can_read());
create policy text_blocks_write on public.text_blocks
  for all using (public.can_write()) with check (public.can_write());

-- audit_logs: admins read; inserts by admins only; no updates/deletes at all.
create policy audit_logs_select on public.audit_logs
  for select using (public.is_admin());
create policy audit_logs_insert on public.audit_logs
  for insert with check (public.can_write());

-- =============================================================================
-- Storage: private media bucket + policies
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('private-media', 'private-media', false)
on conflict (id) do nothing;

-- Read: authorized members only (objects are served via signed URLs).
create policy "media read for members"
  on storage.objects for select
  using (bucket_id = 'private-media' and public.can_read());

-- Write/replace/delete: admins only.
create policy "media insert for admins"
  on storage.objects for insert
  with check (bucket_id = 'private-media' and public.can_write());

create policy "media update for admins"
  on storage.objects for update
  using (bucket_id = 'private-media' and public.can_write())
  with check (bucket_id = 'private-media' and public.can_write());

create policy "media delete for admins"
  on storage.objects for delete
  using (bucket_id = 'private-media' and public.can_write());

-- =============================================================================
-- Seed: a single settings row so the app has defaults on first boot.
-- The first real user should be promoted to 'owner' manually, e.g.:
--   update public.profiles set role = 'owner' where id = '<auth-user-uuid>';
-- =============================================================================
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- =============================================================================
-- Auto-provision a profile row when a new auth user is created (invite flow).
-- New users default to role 'viewer' and must be granted higher roles by an
-- admin. Promote the very first user to 'owner' manually (see note above).
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
