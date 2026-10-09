-- Invoice balances and effective status (one definition used everywhere) -----
create view public.invoice_summary with (security_invoker = true) as
select i.id,
       i.project_id,
       coalesce(p.paid, 0)::numeric(14,2) as amount_paid,
       (i.total_amount - coalesce(p.paid, 0))::numeric(14,2) as amount_due,
       case
         when i.status = 'cancelled' then 'cancelled'
         when i.status = 'draft' then 'draft'
         when i.total_amount - coalesce(p.paid, 0) <= 0 then 'paid'
         when i.due_date < current_date then 'overdue'
         when coalesce(p.paid, 0) > 0 then 'partial'
         else 'sent'
       end as effective_status
from public.invoices i
left join (select invoice_id, sum(amount) as paid from public.payments group by invoice_id) p
  on p.invoice_id = i.id;

-- Invoice numbering: only when sent, sequential per financial year -----------
create function public.assign_invoice_number() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_fy text; v_no int; v_prefix text;
begin
  if new.status = 'sent' and new.invoice_number is null then
    new.issue_date := coalesce(new.issue_date, current_date);
    v_fy := financial_year(new.issue_date);
    insert into invoice_counters (fy, last_no) values (v_fy, 1)
      on conflict (fy) do update set last_no = invoice_counters.last_no + 1
      returning last_no into v_no;
    select invoice_prefix into v_prefix from firm_settings;
    new.invoice_number := coalesce(v_prefix, 'INV') || '/' || v_fy || '/' || lpad(v_no::text, 4, '0');
  end if;
  return new;
end $$;
create trigger invoices_number before insert or update of status on public.invoices
  for each row execute function public.assign_invoice_number();

-- Payment guard -------------------------------------------------------------
create function public.guard_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_total numeric; v_status invoice_status; v_paid numeric;
begin
  select total_amount, status into v_total, v_status from invoices where id = new.invoice_id for update;
  if v_status is distinct from 'sent' then
    raise exception 'Payments can only be recorded against sent invoices';
  end if;
  select coalesce(sum(amount), 0) into v_paid from payments where invoice_id = new.invoice_id;
  if v_paid + new.amount > v_total then
    raise exception 'Payment of % exceeds amount due %', new.amount, v_total - v_paid;
  end if;
  return new;
end $$;
create trigger payments_guard before insert on public.payments
  for each row execute function public.guard_payment();

-- Snag lifecycle timestamps ---------------------------------------------------
create function public.stamp_snag_status() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'fixed' then new.fixed_at := coalesce(new.fixed_at, now()); end if;
    if new.status = 'verified' then new.designer_verified_at := now(); end if;
    if new.status = 'closed' then new.client_closed_at := now(); end if;
  end if;
  return new;
end $$;
create trigger snags_stamp before update of status on public.snags
  for each row execute function public.stamp_snag_status();

-- Activity log + notification helpers -----------------------------------------
create function public.log_activity(p_project uuid, p_client uuid, p_title text, p_desc text, p_type activity_type)
returns void language sql security definer set search_path = public as $$
  insert into activity_logs (project_id, client_id, actor_id, title, description, type)
  values (p_project, p_client, auth.uid(), p_title, coalesce(p_desc, ''), p_type)
$$;

create function public.notify_project_staff(p_project uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  select distinct u, p_type, p_title, p_body, p_link from (
    select director_id as u from projects where id = p_project
    union select manager_id from projects where id = p_project
    union select user_id from user_roles where role = 'owner'
  ) x
  where u is not null and u is distinct from auth.uid()
$$;

create function public.notify_project_clients(p_project uuid, p_type text, p_title text, p_body text, p_link text)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, title, body, link)
  select pr.id, p_type, p_title, p_body, p_link
  from profiles pr join projects p on p.client_id = pr.client_id
  where p.id = p_project and pr.kind = 'client' and pr.active and pr.id is distinct from auth.uid()
$$;

create function public.on_client_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform log_activity(null, new.id, 'New client created', 'Client profile for ' || new.full_name || ' created.', 'note');
  return new;
end $$;
create trigger clients_activity after insert on public.clients for each row execute function public.on_client_insert();

create function public.on_project_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.id, new.client_id, 'Project created', new.name || ' created at stage ' || new.status, 'stage_change');
  elsif new.status is distinct from old.status then
    perform log_activity(new.id, new.client_id, 'Stage changed to ' || new.status, 'From ' || old.status || ' to ' || new.status, 'stage_change');
  end if;
  return new;
end $$;
create trigger projects_activity after insert or update of status on public.projects for each row execute function public.on_project_change();

create function public.on_boq_status() returns trigger language plpgsql security definer set search_path = public as $$
declare v_link text := '/projects/' || new.project_id;
begin
  if new.status is not distinct from old.status then return new; end if;
  if new.status = 'submitted' then
    perform log_activity(new.project_id, null, 'BOQ v' || new.version_number || ' submitted', '', 'boq_submit');
    perform notify_project_clients(new.project_id, 'boq_submitted', 'BOQ v' || new.version_number || ' ready for review', 'Please review and approve the estimate.', null);
  elsif new.status = 'approved' then
    perform log_activity(new.project_id, null, 'BOQ v' || new.version_number || ' approved', coalesce(new.approval_note, ''), 'boq_approve');
    perform notify_project_staff(new.project_id, 'boq_approved', 'BOQ v' || new.version_number || ' approved', coalesce(new.approval_note, ''), v_link);
  elsif new.status = 'rejected' then
    perform log_activity(new.project_id, null, 'BOQ v' || new.version_number || ' changes requested', coalesce(new.approval_note, ''), 'note');
    perform notify_project_staff(new.project_id, 'boq_rejected', 'BOQ v' || new.version_number || ' changes requested', coalesce(new.approval_note, ''), v_link);
  end if;
  return new;
end $$;
create trigger boq_status_activity after update of status on public.boq_versions for each row execute function public.on_boq_status();

create function public.on_snag_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform log_activity(new.project_id, null, 'Snag raised: ' || new.title, 'Priority ' || new.priority, 'snag_raised');
    perform notify_project_staff(new.project_id, 'snag_raised', 'New snag: ' || new.title, 'Priority: ' || upper(new.priority::text), '/projects/' || new.project_id);
  elsif new.status is distinct from old.status then
    perform log_activity(new.project_id, null, 'Snag ' || new.status || ': ' || new.title, '',
                         case when new.status = 'closed' then 'snag_closed'::activity_type else 'note'::activity_type end);
    if new.status = 'fixed' then
      perform notify_project_clients(new.project_id, 'snag_fixed', 'Snag fixed: ' || new.title, 'Please check and close it.', null);
    end if;
  end if;
  return new;
end $$;
create trigger snags_activity after insert or update of status on public.snags for each row execute function public.on_snag_change();

create function public.on_payment_insert() returns trigger language plpgsql security definer set search_path = public as $$
declare v_project uuid; v_number text;
begin
  select project_id, invoice_number into v_project, v_number from invoices where id = new.invoice_id;
  perform log_activity(v_project, null, 'Payment received: ₹' || to_char(new.amount, 'FM99,99,99,990.00'),
                       'Via ' || new.mode || ' for ' || coalesce(v_number, 'invoice'), 'payment_received');
  return new;
end $$;
create trigger payments_activity after insert on public.payments for each row execute function public.on_payment_insert();

create function public.on_invoice_sent() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'sent' and (tg_op = 'INSERT' or old.status is distinct from 'sent') then
    perform notify_project_clients(new.project_id, 'invoice_sent', 'Invoice ' || new.invoice_number || ' issued',
      'Amount due: ₹' || to_char(new.total_amount, 'FM99,99,99,990.00'), null);
  end if;
  return new;
end $$;
create trigger invoices_sent after insert or update of status on public.invoices for each row execute function public.on_invoice_sent();

create function public.on_update_posted() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform notify_project_clients(new.project_id, 'project_update', coalesce(new.title, 'New project update'), left(new.content, 80), null);
  return new;
end $$;
create trigger updates_notify after insert on public.project_updates for each row execute function public.on_update_posted();

create function public.on_client_message() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from profiles where id = new.sender_id and kind = 'client') then
    perform notify_project_staff(new.project_id, 'client_message', 'New client message', left(coalesce(new.content, new.file_name, ''), 80), '/projects/' || new.project_id);
  end if;
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.on_client_message();

-- Audit trail -------------------------------------------------------------------
create table public.audit_log (
  id bigserial primary key,
  table_name text not null,
  row_id text,
  action text not null,
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;
create policy audit_owner_read on public.audit_log for select to authenticated using (has_role('owner'));

create function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
        v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  insert into audit_log (table_name, row_id, action, actor_id, old_data, new_data)
  values (tg_table_name, coalesce(v_new, v_old) ->> 'id', tg_op, auth.uid(), v_old, v_new);
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['clients','projects','boq_versions','boq_line_items','invoices','invoice_items',
                           'payments','expenses','user_roles','firm_settings','project_files','profiles']
  loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()',
                   t || '_audit', t);
  end loop;
end $$;
