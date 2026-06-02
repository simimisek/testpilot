-- =============================================
-- TestPilot - Supabase Schema
-- Spusť celý tento soubor v Supabase SQL Editoru
-- =============================================

-- 1. Organizace
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz default now()
);

-- 2. Profily uživatelů (rozšíření Supabase auth.users)
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  role            text not null default 'member' check (role in ('app_admin', 'member')),
  organization_id uuid references public.organizations(id) on delete set null,
  created_at      timestamptz default now()
);

-- 3. Projekty
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  last_import_at  timestamptz,
  last_export_at  timestamptz
);

-- 4. Test cases
create table public.tests (
  id              bigint generated always as identity primary key,
  test_id         text not null,
  project_id      uuid not null references public.projects(id) on delete cascade,
  area            text default '',
  name            text not null,
  description     text default '',
  steps           text default '',
  expected_result text default '',
  notes           text default '',
  priority        text default '' check (priority in ('', 'High', 'Medium', 'Low')),
  status          text default 'Ready to Test' check (status in ('Ready to Test','Pass','Fail','Blocked','Skipped','Not Relevant')),
  last_test_date  text default '',
  build           text default '',
  bug_id          text default '',
  run_note        text default '',
  archived        boolean default false,
  unique(test_id, project_id)
);

-- =============================================
-- AUTO-CREATE PROFILE on new user signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table public.organizations enable row level security;
alter table public.profiles       enable row level security;
alter table public.projects       enable row level security;
alter table public.tests          enable row level security;

-- Pomocná funkce: vrátí roli přihlášeného uživatele
create or replace function public.my_role()
returns text language sql security definer stable
as $$ select role from public.profiles where id = auth.uid() $$;

-- Pomocná funkce: vrátí organization_id přihlášeného uživatele
create or replace function public.my_org()
returns uuid language sql security definer stable
as $$ select organization_id from public.profiles where id = auth.uid() $$;

-- Organizations: admin vidí vše, member vidí jen svou
create policy "org_select" on public.organizations for select
  using (my_role() = 'app_admin' or id = my_org());

create policy "org_admin_all" on public.organizations for all
  using (my_role() = 'app_admin');

-- Profiles: admin vidí vše, user vidí sám sebe
create policy "profile_select_admin" on public.profiles for select
  using (my_role() = 'app_admin');

create policy "profile_select_self" on public.profiles for select
  using (id = auth.uid());

create policy "profile_update_self" on public.profiles for update
  using (id = auth.uid());

create policy "profile_admin_all" on public.profiles for all
  using (my_role() = 'app_admin');

-- Projects: admin vidí vše, member vidí jen projekty své organizace
create policy "project_select" on public.projects for select
  using (my_role() = 'app_admin' or organization_id = my_org());

create policy "project_insert" on public.projects for insert
  with check (my_role() = 'app_admin' or organization_id = my_org());

create policy "project_update" on public.projects for update
  using (my_role() = 'app_admin' or organization_id = my_org());

create policy "project_delete" on public.projects for delete
  using (my_role() = 'app_admin' or organization_id = my_org());

-- Tests: viditelné přes projekt → organizaci
create policy "test_select" on public.tests for select
  using (
    my_role() = 'app_admin'
    or project_id in (
      select id from public.projects where organization_id = my_org()
    )
  );

create policy "test_insert" on public.tests for insert
  with check (
    my_role() = 'app_admin'
    or project_id in (
      select id from public.projects where organization_id = my_org()
    )
  );

create policy "test_update" on public.tests for update
  using (
    my_role() = 'app_admin'
    or project_id in (
      select id from public.projects where organization_id = my_org()
    )
  );

create policy "test_delete" on public.tests for delete
  using (
    my_role() = 'app_admin'
    or project_id in (
      select id from public.projects where organization_id = my_org()
    )
  );

-- =============================================
-- PRVOTNÍ ADMIN ÚČET
-- Po vytvoření účtu v Supabase Auth spusť:
-- (nahraď 'tvuj-user-id' skutečným UUID z auth.users)
-- =============================================
-- update public.profiles set role = 'app_admin' where id = 'tvuj-user-id';
