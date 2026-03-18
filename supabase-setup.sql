create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.current_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.status
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.is_approved_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
    or coalesce(public.current_status() = 'approved', false);
$$;

create or replace function public.admin_user_auth_methods()
returns table (user_id uuid, providers text[])
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    i.user_id,
    array_agg(distinct i.provider order by i.provider) as providers
  from auth.identities i
  where public.is_admin()
  group by i.user_id;
$$;

update public.profiles
set role = 'user'
where role = 'editor';

insert into public.settings (id, value)
values ('whatsapp_message', 'مرحباً {name}، نود تذكيرك بأن اشتراك {service} سينتهي بتاريخ {date}.')
on conflict (id) do nothing;

drop table if exists public.service_accounts cascade;

do $$
begin
  alter table public.subscriptions add column if not exists facebook text not null default '';
  alter table public.subscriptions add column if not exists updatedat timestamptz;
  alter table public.subscriptions add column if not exists updatedby uuid references public.profiles (id) on delete set null;

  update public.subscriptions set updatedat = createdat where updatedat is null;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role in ('admin', 'user'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'subscriptions_duration_check'
  ) then
    alter table public.subscriptions
      add constraint subscriptions_duration_check
      check (duration in ('monthly', 'quarterly', 'yearly'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'notifications_type_check'
  ) then
    alter table public.notifications
      add constraint notifications_type_check
      check (type in ('info', 'warning', 'danger'));
  end if;

end
$$;

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.settings enable row level security;
alter table public.notifications enable row level security;

grant usage on schema public to authenticated;
grant execute on function public.admin_user_auth_methods() to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update, delete on public.settings to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

drop policy if exists "Admin users policy" on public.profiles;
drop policy if exists "Allow individual insert" on public.profiles;
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self_preserve_access" on public.profiles;
drop policy if exists "profiles_admin_manage" on public.profiles;

create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self_preserve_access"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = coalesce((select p.role from public.profiles p where p.id = auth.uid()), role)
  and status = coalesce((select p.status from public.profiles p where p.id = auth.uid()), status)
);

create policy "profiles_admin_manage"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "View Policy" on public.subscriptions;
drop policy if exists "subscriptions_select_policy" on public.subscriptions;
drop policy if exists "subscriptions_insert_policy" on public.subscriptions;
drop policy if exists "subscriptions_update_policy" on public.subscriptions;
drop policy if exists "subscriptions_delete_policy" on public.subscriptions;

create policy "subscriptions_select_policy"
on public.subscriptions
for select
to authenticated
using (
  public.is_admin()
  or (auth.uid() = user_id and public.is_approved_or_admin())
);

create policy "subscriptions_insert_policy"
on public.subscriptions
for insert
to authenticated
with check (
  public.is_admin()
  or (auth.uid() = user_id and public.is_approved_or_admin())
);

create policy "subscriptions_update_policy"
on public.subscriptions
for update
to authenticated
using (
  public.is_admin()
  or (auth.uid() = user_id and public.is_approved_or_admin())
)
with check (
  public.is_admin()
  or (auth.uid() = user_id and public.is_approved_or_admin())
);

create policy "subscriptions_delete_policy"
on public.subscriptions
for delete
to authenticated
using (
  public.is_admin()
  or (auth.uid() = user_id and public.is_approved_or_admin())
);

drop policy if exists "settings_select_policy" on public.settings;
drop policy if exists "settings_admin_write_policy" on public.settings;

create policy "settings_select_policy"
on public.settings
for select
to authenticated
using (public.is_approved_or_admin());

create policy "settings_admin_write_policy"
on public.settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "notifications_select_policy" on public.notifications;
drop policy if exists "notifications_delete_policy" on public.notifications;
drop policy if exists "notifications_insert_policy" on public.notifications;
drop policy if exists "notifications_admin_manage" on public.notifications;

create policy "notifications_select_policy"
on public.notifications
for select
to authenticated
using (public.is_admin() or auth.uid() = user_id);

create policy "notifications_delete_policy"
on public.notifications
for delete
to authenticated
using (public.is_admin() or auth.uid() = user_id);

create policy "notifications_insert_policy"
on public.notifications
for insert
to authenticated
with check (public.is_admin());
