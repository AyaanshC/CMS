create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  dedupe_key text not null unique,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_email text,
  project_id uuid references public.projects(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  title text not null,
  body text not null,
  link text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id),
  email_status text not null default 'none' check (email_status in ('none', 'pending', 'sent', 'skipped', 'failed')),
  email_error text,
  check (recipient_id is not null or recipient_email is not null)
);
create index on public.alerts (recipient_id) where acknowledged_at is null;
create index on public.alerts (email_status) where email_status = 'pending';
alter table public.alerts enable row level security;
create policy alerts_read on alerts for select to authenticated using (recipient_id = auth.uid() or has_role('owner'));

create function public.acknowledge_alert(p_alert uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update alerts set acknowledged_at = now(), acknowledged_by = auth.uid()
   where id = p_alert and recipient_id = auth.uid() and acknowledged_at is null;
  if not found then raise exception 'Not allowed'; end if;
end $$;

-- Rules from spec 5.4. Idempotent: each alert has a dedupe key; re-running inserts nothing new.
create function public.generate_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int := 0; v_n int; v_reminders boolean;
begin
  select coalesce((alert_preferences->>'payment_reminders')::boolean, true) into v_reminders from firm_settings;

  -- 1. Draft stage/CO invoice unsent for 3+ days -> finance; 7+ days -> owner
  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'unbilled_stage', 'unbilled_stage:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         'Invoice not sent: ' || p.name, coalesce(i.notes, 'Draft invoice') || ' has waited ' || (p_today - i.created_at::date) || ' days.', '/finance'
  from invoices i join projects p on p.id = i.project_id
  join user_roles r on r.role = 'finance'
  where i.status = 'draft' and (i.fee_stage_id is not null or i.change_order_id is not null) and i.created_at::date <= p_today - 3
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'unbilled_stage_escalation', 'unbilled_stage_escalation:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         'Escalation: invoice unsent 7+ days on ' || p.name, coalesce(i.notes, 'Draft invoice'), '/finance'
  from invoices i join projects p on p.id = i.project_id
  join user_roles r on r.role = 'owner'
  where i.status = 'draft' and (i.fee_stage_id is not null or i.change_order_id is not null) and i.created_at::date <= p_today - 7
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- 2. Client reminders: due in 3 days, overdue 7 days (email to client)
  if v_reminders then
    insert into alerts (kind, dedupe_key, recipient_email, project_id, invoice_id, title, body, email_status)
    select k.kind, k.kind || ':' || i.id, c.email, i.project_id, i.id,
           case k.kind when 'invoice_due_soon' then 'Payment reminder: ' || i.invoice_number || ' due on ' || to_char(i.due_date, 'DD Mon YYYY')
                       else 'Overdue: ' || i.invoice_number || ' was due on ' || to_char(i.due_date, 'DD Mon YYYY') end,
           'Amount due: ₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || '. Payment details are on your project portal.',
           'pending'
    from invoices i
    join invoice_summary s on s.id = i.id
    join projects p on p.id = i.project_id
    join clients c on c.id = p.client_id
    cross join lateral (values
      ('invoice_due_soon', i.due_date - 3),
      ('invoice_overdue_7', i.due_date + 7)) as k(kind, fire_on)
    where i.status = 'sent' and s.amount_due > 0 and c.email is not null and k.fire_on <= p_today
      and (k.kind <> 'invoice_due_soon' or i.due_date >= p_today)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  -- 3. Escalations: 30 days -> project director (owner if none); 45 days -> owners
  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'invoice_overdue_30', 'invoice_overdue_30:' || i.id, coalesce(p.director_id, (select user_id from user_roles where role = 'owner' limit 1)),
         i.project_id, i.id, i.invoice_number || ' is 30+ days overdue (' || p.name || ')',
         '₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || ' outstanding. Call the client.', '/finance'
  from invoices i join invoice_summary s on s.id = i.id join projects p on p.id = i.project_id
  where i.status = 'sent' and s.amount_due > 0 and i.due_date + 30 <= p_today
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, invoice_id, title, body, link)
  select 'invoice_overdue_45', 'invoice_overdue_45:' || i.id || ':' || r.user_id, r.user_id, i.project_id, i.id,
         i.invoice_number || ' is 45+ days overdue (' || p.name || ')',
         '₹' || to_char(s.amount_due, 'FM99,99,99,990.00') || ' outstanding.', '/finance'
  from invoices i join invoice_summary s on s.id = i.id join projects p on p.id = i.project_id
  join user_roles r on r.role = 'owner'
  where i.status = 'sent' and s.amount_due > 0 and i.due_date + 45 <= p_today
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  -- Staff alerts also appear in the notification bell.
  insert into notifications (user_id, type, title, body, link)
  select a.recipient_id, 'alert', a.title, a.body, a.link from alerts a
  where a.recipient_id is not null and a.created_at > now() - interval '1 minute'
    and not exists (select 1 from notifications n where n.user_id = a.recipient_id and n.type = 'alert' and n.title = a.title);

  return v_count;
end $$;

select cron.schedule('generate-alerts', '30 2 * * *', $$select public.generate_alerts()$$);
