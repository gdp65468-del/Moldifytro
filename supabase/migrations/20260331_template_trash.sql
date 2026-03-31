alter table public.user_templates
  add column if not exists deleted_at timestamptz,
  add column if not exists purge_at timestamptz;

create index if not exists idx_user_templates_deleted_at
  on public.user_templates (deleted_at);

create index if not exists idx_user_templates_purge_at
  on public.user_templates (purge_at)
  where deleted_at is not null;

create or replace function public.purge_expired_user_templates()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
begin
  delete from public.user_templates
  where deleted_at is not null
    and purge_at is not null
    and purge_at <= now();

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_user_templates() from public;
grant execute on function public.purge_expired_user_templates() to anon;
grant execute on function public.purge_expired_user_templates() to authenticated;
grant execute on function public.purge_expired_user_templates() to service_role;
