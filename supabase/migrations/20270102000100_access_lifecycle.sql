-- Enforce authorization and lifecycle requirements below the UI.
create function public.account_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and active)
$$;

create or replace function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from user_roles u join profiles p on p.id = u.user_id
                where u.user_id = auth.uid() and u.role = r and p.active and p.kind = 'staff')
$$;

create or replace function public.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select account_active() and (sees_all_projects()
    or exists(select 1 from projects where id = p and
      (director_id = auth.uid() or manager_id = auth.uid() or client_id = my_client_id()))
    or exists(select 1 from project_members where project_id = p and profile_id = auth.uid())
    or (has_role('procurement') and exists(select 1 from projects where id = p and engagement_type = 'design_and_execution')))
$$;

create or replace function public.can_bill_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and (has_role('owner') or has_role('finance')
    or exists(select 1 from projects where id = p and (director_id = auth.uid() or manager_id = auth.uid())))
$$;

create or replace function public.manages_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and exists(select 1 from projects where id = p and (manager_id = auth.uid() or director_id = auth.uid()))
$$;

create or replace function public.can_approve_entry(p_entry uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and e.profile_id <> auth.uid() and
    (has_role('owner') or p.manager_id = auth.uid()
     or (p.director_id = auth.uid() and (p.manager_id is null or p.manager_id = e.profile_id)))
  from timesheet_entries e join projects p on p.id = e.project_id where e.id = p_entry
$$;

create function public.guard_account_activation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.active is distinct from old.active and auth.uid() is not null then
    if not has_role('owner') then raise exception 'Only an active owner can change account access'; end if;
    if old.id = auth.uid() and not new.active then raise exception 'You cannot deactivate yourself'; end if;
    if not new.active and exists(select 1 from user_roles where user_id = old.id and role = 'owner') then
      perform pg_advisory_xact_lock(hashtext('active-owners'));
      if not exists(select 1 from profiles p join user_roles r on r.user_id = p.id
                    where r.role = 'owner' and p.active and p.id <> old.id) then
        raise exception 'At least one active owner must remain';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_activation before update on public.profiles
for each row execute function public.guard_account_activation();

-- A positive visibility check reads metadata as definer, then explicitly authorizes
-- the caller. An RLS-hidden metadata row can no longer make a private object public.
create function public.can_read_project_object(object_name text) returns boolean
language sql stable security definer set search_path = public as $$
  select account_active() and (
    can_manage_project(storage_project_id(object_name))
    or (is_project_client(storage_project_id(object_name)) and (
      exists(select 1 from project_files f where f.storage_path = object_name and f.is_client_visible)
      or exists(select 1 from messages m where m.project_id = storage_project_id(object_name) and m.file_url = object_name)
      or exists(select 1 from project_updates u where u.project_id = storage_project_id(object_name) and object_name = any(u.photos))
      or exists(select 1 from material_options m where m.project_id = storage_project_id(object_name) and m.image_url = object_name)
      or exists(select 1 from snags s where s.project_id = storage_project_id(object_name) and
                (s.before_photo_url = object_name or s.after_photo_url = object_name))
      or exists(select 1 from snag_comments c join snags s on s.id = c.snag_id
                where s.project_id = storage_project_id(object_name) and c.photo_url = object_name)
    )))
$$;
drop policy project_files_read on storage.objects;
create policy project_files_read on storage.objects for select to authenticated
using(bucket_id = 'project-files' and public.can_read_project_object(name));

-- Accounts can still read their own profile to see the inactive-account message.
-- All other profile visibility and self-edit permission require an active account.
drop policy profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using(id = auth.uid() or (account_active() and (is_staff() or kind = 'staff')));
drop policy profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using(id = auth.uid() and account_active()) with check(id = auth.uid() and account_active());
drop policy firm_read on public.firm_settings;
create policy firm_read on public.firm_settings for select to authenticated using(account_active());
do $$ declare v_table text; begin
  for v_table in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relname <> 'profiles'
  loop
    execute format('create policy account_enabled on public.%I as restrictive for all to authenticated using (public.account_active()) with check (public.account_active())', v_table);
  end loop;
end $$;
drop policy ts_read on public.timesheet_entries;
create policy ts_read on public.timesheet_entries for select to authenticated using(account_active() and
  (profile_id = auth.uid() or has_role('owner') or has_role('finance') or (project_id is not null and manages_project(project_id))));
drop policy ts_insert on public.timesheet_entries;
create policy ts_insert on public.timesheet_entries for insert to authenticated with check(account_active() and is_staff() and
  profile_id = auth.uid() and status = 'draft' and (project_id is null or can_see_project(project_id)));
drop policy ts_update on public.timesheet_entries;
create policy ts_update on public.timesheet_entries for update to authenticated
using(account_active() and profile_id = auth.uid() and status in ('draft','rejected'))
with check(account_active() and profile_id = auth.uid() and status = 'draft' and (project_id is null or can_see_project(project_id)));
drop policy ts_delete on public.timesheet_entries;
create policy ts_delete on public.timesheet_entries for delete to authenticated
using(account_active() and profile_id = auth.uid() and status in ('draft','rejected'));

alter table public.snags add column fixed_by uuid references public.profiles(id),
  add column designer_verified_by uuid references public.profiles(id),
  add column client_closed_by uuid references public.profiles(id);

create function public.guard_snag_lifecycle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Serialize snag changes with project handover checks.
  perform 1 from projects where id = new.project_id for update;
  if tg_op = 'UPDATE' and new.project_id <> old.project_id then raise exception 'A snag cannot move between projects'; end if;
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'raised' then raise exception 'New snags must start as raised'; end if;
    return new;
  end if;
  if new.status = old.status then return new; end if;
  if new.status = 'closed' then
    if old.status <> 'verified' or not is_project_client(new.project_id) then
      raise exception 'Only the project client can close a designer-verified snag';
    end if;
    new.client_closed_by := auth.uid();
  elsif not can_manage_project(new.project_id) then
    raise exception 'Not allowed';
  elsif new.status = 'fixed' then
    if old.status <> 'in_progress' or nullif(trim(new.after_photo_url), '') is null then
      raise exception 'Start the work and attach an after photo before marking fixed';
    end if;
    new.fixed_by := auth.uid();
  elsif new.status = 'verified' then
    if old.status <> 'fixed' or not (has_role('owner') or has_role('director') or has_role('project_manager') or has_role('architect')) then
      raise exception 'A designer must verify a fixed snag';
    end if;
    new.designer_verified_by := auth.uid();
  elsif new.status = 'assigned' then
    if old.status <> 'raised' or (new.assigned_to is null and new.vendor_id is null) then
      raise exception 'Choose a team member or vendor before assigning';
    end if;
  elsif new.status = 'in_progress' then
    if old.status <> 'assigned' then raise exception 'Assign the snag before starting work'; end if;
  elsif new.status = 'raised' then
    if old.status = 'closed' then raise exception 'Client-closed snags require a new follow-up snag'; end if;
    new.fixed_at := null; new.designer_verified_at := null; new.client_closed_at := null;
    new.fixed_by := null; new.designer_verified_by := null; new.client_closed_by := null;
  end if;
  return new;
end $$;
create trigger snags_lifecycle before insert or update on public.snags
for each row execute function public.guard_snag_lifecycle();

create or replace function public.client_close_snag(p_snag uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_project uuid; v_status snag_status;
begin
  select project_id into v_project from snags where id = p_snag;
  if v_project is null or not is_project_client(v_project) then raise exception 'Not allowed'; end if;
  perform 1 from projects where id = v_project for update;
  select status into v_status from snags where id = p_snag for update;
  if v_status <> 'verified' then raise exception 'A designer must verify the snag before client closure'; end if;
  update snags set status = 'closed' where id = p_snag;
end $$;

create table public.handover_acceptances (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  accepted_by uuid not null references public.profiles(id),
  signer text not null check(length(trim(signer)) between 1 and 120),
  note text, accepted_at timestamptz not null default now()
);
create index on public.handover_acceptances(project_id, accepted_at);
alter table public.handover_acceptances enable row level security;
create policy handover_read on public.handover_acceptances for select to authenticated using(can_see_project(project_id));
create trigger handover_audit after insert on public.handover_acceptances for each row execute function public.audit_row();

create function public.accept_project_handover(p_project uuid, p_signer text, p_note text default '') returns uuid
language plpgsql security definer set search_path = public as $$
declare v_status project_status;
begin
  if not is_project_client(p_project) then raise exception 'Only the project client can accept handover'; end if;
  select status into v_status from projects where id = p_project for update;
  if v_status <> 'handover' then raise exception 'The studio must prepare handover first'; end if;
  if exists(select 1 from snags where project_id = p_project and status <> 'closed') then raise exception 'Close all snags before accepting handover'; end if;
  insert into handover_acceptances(project_id, accepted_by, signer, note)
  values(p_project, auth.uid(), trim(p_signer), nullif(trim(p_note), ''));
  return p_project;
end $$;

create function public.guard_project_lifecycle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.portal_token is distinct from old.portal_token then raise exception 'The client portal address cannot change'; end if;
  if new.status is distinct from old.status and new.status in ('handover','closed') then
    if exists(select 1 from snags where project_id = new.id and status <> 'closed') then
      raise exception 'Resolve and obtain client sign-off for all snags before handover';
    end if;
    if new.status = 'closed' and not exists(select 1 from handover_acceptances h where h.project_id = new.id
      and h.accepted_at >= coalesce((select max(updated_at) from snags where project_id = new.id), '-infinity'::timestamptz)) then
      raise exception 'The client must accept handover before the project can close';
    end if;
  end if;
  return new;
end $$;
create trigger projects_lifecycle before update on public.projects
for each row execute function public.guard_project_lifecycle();

-- Role replacement and initial staff terms are one transaction.
create function public.configure_staff(p_user uuid, p_roles public.app_role[], p_title text default null) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not has_role('owner') then raise exception 'Only an active owner can manage staff'; end if;
  if coalesce(array_length(p_roles,1),0) = 0 then raise exception 'Choose at least one role'; end if;
  perform pg_advisory_xact_lock(hashtext('active-owners'));
  perform 1 from profiles where id = p_user and kind = 'staff' for update;
  if not found then raise exception 'Staff account not found'; end if;
  if p_user = auth.uid() and not ('owner' = any(p_roles)) then raise exception 'You cannot remove your own owner role'; end if;
  if exists(select 1 from user_roles where user_id = p_user and role = 'owner') and not ('owner' = any(p_roles))
     and not exists(select 1 from profiles p join user_roles r on r.user_id = p.id where p.active and r.role = 'owner' and p.id <> p_user) then
    raise exception 'At least one active owner must remain';
  end if;
  delete from user_roles where user_id = p_user and not (role = any(p_roles));
  insert into user_roles(user_id,role) select p_user, unnest(p_roles) on conflict do nothing;
  if p_title is not null then update profiles set title = p_title where id = p_user; end if;
  return p_user;
end $$;

revoke execute on function public.accept_project_handover(uuid,text,text), public.configure_staff(uuid,public.app_role[],text) from public, anon;
grant execute on function public.accept_project_handover(uuid,text,text), public.configure_staff(uuid,public.app_role[],text) to authenticated;
revoke execute on function public.log_activity(uuid,uuid,text,text,public.activity_type),
  public.notify_project_staff(uuid,text,text,text,text), public.notify_project_clients(uuid,text,text,text,text) from public, anon, authenticated;
