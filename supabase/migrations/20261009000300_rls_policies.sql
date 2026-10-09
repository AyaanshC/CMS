-- firm_settings: everyone signed in reads (portal shows bank details); owner writes
create policy firm_read on firm_settings for select to authenticated using (true);
create policy firm_write on firm_settings for update to authenticated using (has_role('owner')) with check (has_role('owner'));

-- clients
create policy clients_read on clients for select to authenticated using (
  (is_staff() and (sees_all_projects() or has_role('director')
     or exists (select 1 from projects p where p.client_id = clients.id and can_see_project(p.id))))
  or id = my_client_id());
create policy clients_insert on clients for insert to authenticated with check (
  has_role('owner') or has_role('director') or has_role('project_manager') or has_role('admin'));
create policy clients_update on clients for update to authenticated using (
  has_role('owner') or has_role('director') or has_role('project_manager') or has_role('admin'));

-- profiles: staff see everyone; clients see staff and themselves
create policy profiles_read on profiles for select to authenticated using (
  is_staff() or kind = 'staff' or id = auth.uid());
-- Column grants stop anyone changing kind/client_id/email through the API.
-- (A policy that re-queries profiles would recurse, so columns are restricted instead.)
revoke update on profiles from authenticated;
grant update (full_name, phone, avatar_url, title, active) on profiles to authenticated;
create policy profiles_update_self on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner on profiles for update to authenticated using (has_role('owner'));

-- user_roles: staff read (team page shows roles); owner writes
create policy roles_read on user_roles for select to authenticated using (is_staff() or user_id = auth.uid());
create policy roles_write on user_roles for all to authenticated using (has_role('owner')) with check (has_role('owner'));

-- projects
create policy projects_read on projects for select to authenticated using (can_see_project(id));
create policy projects_insert on projects for insert to authenticated with check (
  has_role('owner') or has_role('director') or has_role('project_manager') or has_role('admin'));
create policy projects_update on projects for update to authenticated using (can_manage_project(id));

-- project children
create policy members_read on project_members for select to authenticated using (can_see_project(project_id));
create policy members_write on project_members for all to authenticated
  using (has_role('owner') or has_role('director') or exists (select 1 from projects where id = project_id and manager_id = auth.uid()))
  with check (has_role('owner') or has_role('director') or exists (select 1 from projects where id = project_id and manager_id = auth.uid()));
create policy rooms_read on project_rooms for select to authenticated using (can_see_project(project_id));
create policy rooms_write on project_rooms for all to authenticated using (can_manage_project(project_id)) with check (can_manage_project(project_id));
create policy milestones_read on project_milestones for select to authenticated using (can_see_project(project_id));
create policy milestones_write on project_milestones for all to authenticated using (can_manage_project(project_id)) with check (can_manage_project(project_id));

-- BOQ: clients see non-draft versions; only drafts are editable
create policy boq_read on boq_versions for select to authenticated using (
  can_manage_project(project_id) or (is_project_client(project_id) and status <> 'draft'));
create policy boq_insert on boq_versions for insert to authenticated with check (can_manage_project(project_id) and status = 'draft');
create policy boq_update on boq_versions for update to authenticated
  using (can_manage_project(project_id) and status = 'draft')
  with check (can_manage_project(project_id) and status in ('draft', 'submitted'));
create policy boq_sections_read on boq_sections for select to authenticated using (
  exists (select 1 from boq_versions v where v.id = boq_version_id));      -- inherits boq_read
create policy boq_sections_write on boq_sections for all to authenticated
  using (can_manage_project(boq_version_project(boq_version_id)) and boq_version_status(boq_version_id) = 'draft')
  with check (can_manage_project(boq_version_project(boq_version_id)) and boq_version_status(boq_version_id) = 'draft');
create policy boq_items_read on boq_line_items for select to authenticated using (
  exists (select 1 from boq_sections s where s.id = section_id));          -- inherits boq_sections_read
create policy boq_items_write on boq_line_items for all to authenticated
  using (can_manage_project(boq_version_project(section_version(section_id))) and boq_version_status(section_version(section_id)) = 'draft')
  with check (can_manage_project(boq_version_project(section_version(section_id))) and boq_version_status(section_version(section_id)) = 'draft');

-- snags: clients can read and raise; staff manage; client closing goes through an RPC
create policy snags_read on snags for select to authenticated using (can_see_project(project_id));
create policy snags_insert on snags for insert to authenticated with check (can_see_project(project_id) and raised_by = auth.uid());
create policy snags_update on snags for update to authenticated using (can_manage_project(project_id));
create policy snag_comments_read on snag_comments for select to authenticated using (can_see_project(snag_project(snag_id)));
create policy snag_comments_insert on snag_comments for insert to authenticated with check (
  can_see_project(snag_project(snag_id)) and author_id = auth.uid());

-- tasks
create policy tasks_read on tasks for select to authenticated using (
  can_manage_project(project_id) or (is_project_client(project_id) and not is_internal));
create policy tasks_write on tasks for all to authenticated using (can_manage_project(project_id)) with check (can_manage_project(project_id));

-- invoices: drafts are staff-only; sent invoices editable only by owner/finance (e.g. cancel)
create policy invoices_read on invoices for select to authenticated using (
  can_see_project_finance(project_id) and (status <> 'draft' or is_staff()));
create policy invoices_insert on invoices for insert to authenticated with check (can_bill_project(project_id));
create policy invoices_update on invoices for update to authenticated using (
  can_bill_project(project_id) and (status = 'draft' or has_role('owner') or has_role('finance')));
create policy invoice_items_read on invoice_items for select to authenticated using (
  exists (select 1 from invoices i where i.id = invoice_id));
create policy invoice_items_write on invoice_items for all to authenticated
  using (can_bill_project(invoice_project(invoice_id))) with check (can_bill_project(invoice_project(invoice_id)));

-- payments: visible with the invoice; only owner/finance record
create policy payments_read on payments for select to authenticated using (can_see_project_finance(invoice_project(invoice_id)));
create policy payments_insert on payments for insert to authenticated with check (has_role('owner') or has_role('finance'));

-- expenses: staff with finance visibility read; project staff add; owner/finance edit
create policy expenses_read on expenses for select to authenticated using (is_staff() and can_bill_project(project_id));
create policy expenses_insert on expenses for insert to authenticated with check (can_manage_project(project_id));
create policy expenses_update on expenses for update to authenticated using (has_role('owner') or has_role('finance'));

-- communication
create policy messages_read on messages for select to authenticated using (can_see_project(project_id));
create policy messages_insert on messages for insert to authenticated with check (can_see_project(project_id) and sender_id = auth.uid());
create policy updates_read on project_updates for select to authenticated using (can_see_project(project_id));
create policy updates_insert on project_updates for insert to authenticated with check (can_manage_project(project_id));
create policy notifications_own on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_mark on notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- libraries
create policy library_read on item_library for select to authenticated using (is_staff());
create policy library_write on item_library for all to authenticated
  using (has_role('owner') or has_role('director') or has_role('project_manager') or has_role('procurement'))
  with check (has_role('owner') or has_role('director') or has_role('project_manager') or has_role('procurement'));
create policy templates_read on boq_templates for select to authenticated using (is_staff());
create policy templates_write on boq_templates for all to authenticated
  using (has_role('owner') or has_role('director')) with check (has_role('owner') or has_role('director'));
create policy materials_read on material_options for select to authenticated using (can_see_project(project_id));
create policy materials_write on material_options for all to authenticated using (can_manage_project(project_id)) with check (can_manage_project(project_id));

-- files
create policy files_read on project_files for select to authenticated using (
  can_manage_project(project_id) or (is_project_client(project_id) and is_client_visible));
create policy files_write on project_files for all to authenticated using (can_manage_project(project_id)) with check (can_manage_project(project_id));

-- activity: staff only
create policy activity_read on activity_logs for select to authenticated using (
  is_staff() and (case when project_id is not null then can_see_project(project_id) else sees_all_projects() or has_role('director') end));
create policy activity_insert on activity_logs for insert to authenticated with check (is_staff() and actor_id = auth.uid());
