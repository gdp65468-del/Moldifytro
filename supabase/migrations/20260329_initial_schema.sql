create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text not null,
  photo_url text,
  plan_type text not null default 'free',
  published_templates_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.platform_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  image_url text not null,
  thumbnail_url text not null,
  template_mode text not null default 'full_frame' check (template_mode in ('full_frame')),
  is_active boolean not null default true,
  image_storage_path text,
  image_provider text,
  cloudinary_public_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  template_mode text not null check (template_mode in ('full_frame', 'overlay_logo')),
  frame_url text not null,
  frame_storage_path text,
  thumbnail_url text,
  status text not null default 'draft' check (status in ('draft', 'pending_payment', 'published')),
  is_public boolean not null default false,
  publish_unlocked boolean not null default false,
  share_slug text,
  uses_count integer not null default 0,
  views_count integer not null default 0,
  downloads_count integer not null default 0,
  published_at timestamptz,
  price_paid numeric(10,2),
  source text not null default 'custom' check (source in ('custom', 'platform')),
  platform_template_id uuid references public.platform_templates(id),
  overlay_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_templates_share_slug_unique
  on public.user_templates (share_slug)
  where share_slug is not null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  template_id uuid not null references public.user_templates(id) on delete cascade,
  provider text not null,
  amount numeric(10,2) not null,
  status text not null check (status in ('pending', 'approved', 'rejected')),
  checkout_url text,
  asaas_checkout_id text,
  asaas_payment_id text,
  asaas_event text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.template_uses (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.user_templates(id) on delete cascade,
  used_by text not null default 'anonymous',
  action text not null check (action in ('view', 'download')),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_platform_templates_updated_at on public.platform_templates;
create trigger trg_platform_templates_updated_at before update on public.platform_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_templates_updated_at on public.user_templates;
create trigger trg_user_templates_updated_at before update on public.user_templates
for each row execute function public.set_updated_at();

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.platform_templates enable row level security;
alter table public.user_templates enable row level security;
alter table public.payments enable row level security;
alter table public.template_uses enable row level security;

create policy "users_select_own" on public.users
for select using (auth.uid() = id);

create policy "users_insert_own" on public.users
for insert with check (auth.uid() = id);

create policy "users_update_own" on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "roles_select_own" on public.user_roles
for select using (auth.uid() = user_id);

create policy "platform_templates_read_all" on public.platform_templates
for select using (true);

create policy "platform_templates_admin_write" on public.platform_templates
for all using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin' and ur.active = true
  )
) with check (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin' and ur.active = true
  )
);

create policy "user_templates_read_public_or_owner" on public.user_templates
for select using (is_public = true or auth.uid() = owner_id);

create policy "user_templates_insert_owner" on public.user_templates
for insert with check (auth.uid() = owner_id);

create policy "user_templates_update_owner" on public.user_templates
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "user_templates_delete_owner" on public.user_templates
for delete using (auth.uid() = owner_id);

create policy "payments_read_own" on public.payments
for select using (auth.uid() = user_id);

create policy "template_uses_insert_any" on public.template_uses
for insert with check (true);

create policy "template_uses_select_none" on public.template_uses
for select using (false);

insert into storage.buckets (id, name, public)
values ('users', 'users', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('platform', 'platform', true)
on conflict (id) do nothing;

create policy "users_bucket_owner_rw" on storage.objects
for all
using (bucket_id = 'users' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'users' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "platform_bucket_read_public" on storage.objects
for select using (bucket_id = 'platform');

