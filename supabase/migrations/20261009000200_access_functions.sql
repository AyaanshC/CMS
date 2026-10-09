create function public.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = r)
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and kind = 'staff' and active)
$$;

create function public.my_client_id() returns uuid
language sql stable security definer set search_path = public as $$
  select client_id from profiles where id = auth.uid() and active
$$;

create function public.sees_all_projects() returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('owner') or has_role('finance') or has_role('admin')
$$;

create function public.is_project_client(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from projects where id = p and client_id = my_client_id())
$$;

create function public.can_see_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select sees_all_projects()
      or exists (select 1 from projects where id = p
                 and (director_id = auth.uid() or manager_id = auth.uid() or client_id = my_client_id()))
      or exists (select 1 from project_members where project_id = p and profile_id = auth.uid())
$$;

create function public.can_manage_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() and can_see_project(p)
$$;

create function public.can_bill_project(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select has_role('owner') or has_role('finance')
      or exists (select 1 from projects where id = p and (director_id = auth.uid() or manager_id = auth.uid()))
$$;

create function public.can_see_project_finance(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select can_bill_project(p) or is_project_client(p)
$$;

create function public.boq_version_project(v uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select project_id from boq_versions where id = v
$$;

create function public.boq_version_status(v uuid) returns public.boq_status
language sql stable security definer set search_path = public as $$
  select status from boq_versions where id = v
$$;

create function public.section_version(s uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select boq_version_id from boq_sections where id = s
$$;

create function public.invoice_project(i uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select project_id from invoices where id = i
$$;

create function public.snag_project(s uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select project_id from snags where id = s
$$;
