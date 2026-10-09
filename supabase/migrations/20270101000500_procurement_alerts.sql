create function public.generate_procurement_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'po_late_delivery', 'po_late_delivery:' || o.id || ':' || r.uid, r.uid, o.project_id,
         'Late delivery: ' || coalesce(o.number, 'PO') || ' (' || v.name || ')',
         'Expected ' || to_char(o.expected_delivery, 'DD Mon') || '; items still outstanding on ' || p.name, '/projects/' || o.project_id
  from purchase_orders o
  join vendors v on v.id = o.vendor_id
  join projects p on p.id = o.project_id
  cross join lateral (
    select user_id as uid from user_roles where role = 'procurement'
    union select p.manager_id where p.manager_id is not null
  ) r
  where o.status = 'issued' and o.expected_delivery < p_today
    and exists (select 1 from po_lines l join po_line_progress g on g.po_line_id = l.id
                where l.po_id = o.id and g.received_qty - g.rejected_qty < l.quantity)
  on conflict (dedupe_key) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end $$;

select cron.schedule('procurement-alerts', '0 3 * * *', $$select public.generate_procurement_alerts()$$);
