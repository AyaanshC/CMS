-- Serialise whole-week writes and reject stale browser snapshots.
create function public.save_timesheet_checked(p_week date,p_rows jsonb,p_expected text[],p_submit boolean default false)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_ids text[];v_count int;
begin
  if not account_active() then raise exception 'Your account is inactive'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_week::text));
  select coalesce(array_agg(id::text||':'||status::text order by id),'{}'::text[]) into v_ids from timesheet_entries
    where profile_id=auth.uid() and work_date between p_week and p_week+6;
  if v_ids is distinct from (select coalesce(array_agg(x order by x),'{}'::text[]) from unnest(p_expected) x) then
    raise exception 'This week changed in another session. Reload it before saving; your draft has been kept.';
  end if;
  v_count := save_timesheet_week(p_week,p_rows);
  if p_submit then perform submit_timesheet_week(p_week); end if;
  return jsonb_build_object('revision',(select coalesce(jsonb_agg(id::text||':'||status::text order by id),'[]'::jsonb) from timesheet_entries where profile_id=auth.uid() and work_date between p_week and p_week+6));
end $$;
revoke execute on function public.save_timesheet_checked(date,jsonb,text[],boolean) from public,anon;
grant execute on function public.save_timesheet_checked(date,jsonb,text[],boolean) to authenticated;

create or replace function public.submit_timesheet_week(p_week date) returns int
language plpgsql security definer set search_path=public as $$
declare v_count int;
begin
  if not account_active() then raise exception 'Your account is inactive'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text),hashtext(p_week::text));
  update timesheet_entries set status=case when project_id is null then 'approved'::timesheet_status else 'submitted' end,
    submitted_at=now(),decided_at=case when project_id is null then now() end,decision_note=null
  where profile_id=auth.uid() and work_date between p_week and p_week+6 and status in ('draft','rejected');
  get diagnostics v_count=row_count;
  return v_count;
end $$;

create or replace function public.acknowledge_alert(p_alert uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not account_active() then raise exception 'Your account is inactive'; end if;
  update alerts set acknowledged_at=now(),acknowledged_by=auth.uid() where id=p_alert and recipient_id=auth.uid() and acknowledged_at is null;
  if not found then raise exception 'Not allowed'; end if;
end $$;
create or replace function public.staff_week_hours(p_from date,p_to date)
returns table(profile_id uuid,week_start date,total_hours numeric,billable_hours numeric,submitted boolean)
language sql stable security definer set search_path=public as $$
  select e.profile_id,date_trunc('week',e.work_date)::date,
    sum(e.hours) filter(where e.status in('submitted','approved')),
    coalesce(sum(e.hours) filter(where e.billable and e.status in('submitted','approved')),0),
    bool_and(e.status in('submitted','approved'))
  from timesheet_entries e where account_active() and e.work_date between p_from and p_to
    and (has_role('owner') or has_role('director') or has_role('finance') or e.profile_id=auth.uid()) group by 1,2
$$;
-- Alert generation is a scheduler/service operation, never a public RPC.
revoke execute on function public.generate_alerts(date),public.generate_delivery_alerts(date),public.generate_procurement_alerts(date) from public,anon,authenticated;
grant execute on function public.generate_alerts(date),public.generate_delivery_alerts(date),public.generate_procurement_alerts(date) to service_role;
