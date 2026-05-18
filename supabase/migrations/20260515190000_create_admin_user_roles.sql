-- P0 admin auth/rbac baseline for Web Admin UI
create table if not exists public.admin_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin_owner', 'admin_operator', 'admin_viewer')),
  is_active boolean not null default true,
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_user_roles_role_active
  on public.admin_user_roles (role, is_active);

drop trigger if exists trg_admin_user_roles_updated_at on public.admin_user_roles;
create trigger trg_admin_user_roles_updated_at
before update on public.admin_user_roles
for each row
execute function public.set_current_timestamp_updated_at();

alter table public.admin_user_roles enable row level security;

drop policy if exists "admin_user_roles_service_role_all" on public.admin_user_roles;
create policy "admin_user_roles_service_role_all"
on public.admin_user_roles
for all
to service_role
using (true)
with check (true);
