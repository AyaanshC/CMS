alter table public.firm_settings
  add column risk_weights jsonb not null default
    '{"fee_burn":25,"overdue":20,"schedule":15,"cost_variance":15,"approvals":10,"critical_snags":10,"pending_changes":5}'::jsonb,
  add column monthly_billing_target numeric(14,2);

create function public.generate_delivery_alerts(p_today date default current_date) returns int
language plpgsql security definer set search_path = public as $$
declare v_week date := date_trunc('week', p_today)::date - 7; v_count int := 0; v_n int;
begin
  -- Missing timesheets for last week, from Monday onwards: tell the person.
  drop table if exists pg_temp.missing;   -- the function may run twice in one transaction
  create temp table missing on commit drop as
    select pr.id, pr.full_name from profiles pr
    where pr.kind = 'staff' and pr.active and pr.weekly_capacity_hours > 0
      and not exists (select 1 from timesheet_entries e where e.profile_id = pr.id
                      and e.work_date between v_week and v_week + 6 and e.status in ('submitted', 'approved'));

  insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
  select 'timesheet_missing', 'timesheet_missing:' || m.id || ':' || v_week, m.id,
         'Timesheet for week of ' || to_char(v_week, 'DD Mon') || ' not submitted', 'Please submit it today.', '/timesheets'
  from missing m
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  if p_today >= v_week + 8 then   -- Tuesday or later
    insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
    select 'timesheet_missing_manager', 'timesheet_missing_manager:' || p.manager_id || ':' || m.id || ':' || v_week, p.manager_id,
           m.full_name || ' has not submitted last week''s timesheet', 'Week of ' || to_char(v_week, 'DD Mon'), '/timesheets/approvals'
    from missing m
    join (select distinct profile_id, project_id from timesheet_entries where work_date >= v_week - 28) recent on recent.profile_id = m.id
    join projects p on p.id = recent.project_id
    where p.manager_id is not null and p.manager_id <> m.id
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;

    insert into alerts (kind, dedupe_key, recipient_id, title, body, link)
    select 'timesheet_missing_summary', 'timesheet_missing_summary:' || r.user_id || ':' || v_week, r.user_id,
           (select count(*) from missing) || ' people missed last week''s timesheet',
           (select string_agg(full_name, ', ' order by full_name) from missing), '/timesheets/approvals'
    from user_roles r where r.role = 'owner' and exists (select 1 from missing)
    on conflict (dedupe_key) do nothing;
    get diagnostics v_n = row_count; v_count := v_count + v_n;
  end if;

  -- Fee burn (blended cost) per design stage.
  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'fee_burn', 'fee_burn:' || s.id || ':' || u.uid, u.uid, s.project_id,
         'Fee burn on ' || p.name || ' · ' || s.name,
         round(c.blended / nullif(s.amount, 0) * 100) || '% of the stage fee used at ' || s.percent_complete || '% complete.',
         '/projects/' || s.project_id
  from fee_stage_summary s
  join projects p on p.id = s.project_id
  join (select e.fee_stage_id, sum(e.hours * coalesce(b.blended_rate, 0)) as blended
        from timesheet_entries e join profiles pr on pr.id = e.profile_id left join rate_bands b on b.id = pr.rate_band_id
        where e.status in ('submitted', 'approved') and e.fee_stage_id is not null group by e.fee_stage_id) c on c.fee_stage_id = s.id
  cross join lateral (values (p.manager_id), (p.director_id)) as u(uid)
  where s.kind = 'design_fee' and s.status <> 'complete' and s.amount > 0
    and c.blended > 0.8 * s.amount and s.percent_complete < 70 and u.uid is not null
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  insert into alerts (kind, dedupe_key, recipient_id, project_id, title, body, link)
  select 'fee_burn_over', 'fee_burn_over:' || s.id || ':' || r.user_id, r.user_id, s.project_id,
         'Stage over budget: ' || p.name || ' · ' || s.name, 'Labour cost has exceeded the stage fee.', '/projects/' || s.project_id
  from fee_stage_summary s
  join projects p on p.id = s.project_id
  join (select e.fee_stage_id, sum(e.hours * coalesce(b.blended_rate, 0)) as blended
        from timesheet_entries e join profiles pr on pr.id = e.profile_id left join rate_bands b on b.id = pr.rate_band_id
        where e.status in ('submitted', 'approved') and e.fee_stage_id is not null group by e.fee_stage_id) c on c.fee_stage_id = s.id
  join user_roles r on r.role = 'owner'
  where s.kind = 'design_fee' and s.amount > 0 and c.blended > s.amount
  on conflict (dedupe_key) do nothing;
  get diagnostics v_n = row_count; v_count := v_count + v_n;

  return v_count;
end $$;

select cron.schedule('delivery-alerts', '45 6 * * *', $$select public.generate_delivery_alerts()$$);
