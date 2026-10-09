create function public.cost_rate_on(p_profile uuid, p_date date) returns numeric
language sql stable security definer set search_path = public as $$
  select cost_rate from staff_cost_rates where profile_id = p_profile and effective_from <= p_date
  order by effective_from desc limit 1
$$;
revoke execute on function public.cost_rate_on(uuid, date) from public, anon, authenticated;

create function public.project_cost_rollup()
returns table (project_id uuid, fee_stage_id uuid, hours numeric, billable_hours numeric, unrated_hours numeric, blended_cost numeric, actual_cost numeric)
language sql stable security definer set search_path = public as $$
  select e.project_id, e.fee_stage_id,
         sum(e.hours), coalesce(sum(e.hours) filter (where e.billable), 0),
         coalesce(sum(e.hours) filter (where b.id is null), 0),
         round(sum(e.hours * coalesce(b.blended_rate, 0)), 2),
         case when public.has_role('owner'::app_role) or public.has_role('finance'::app_role)
              then round(sum(e.hours * coalesce(cost_rate_on(e.profile_id, e.work_date), 0)), 2) end
  from timesheet_entries e
  join profiles pr on pr.id = e.profile_id
  left join rate_bands b on b.id = pr.rate_band_id
  where e.project_id is not null and e.status in ('submitted', 'approved') and can_bill_project(e.project_id)
  group by e.project_id, e.fee_stage_id
$$;

create function public.staff_week_hours(p_from date, p_to date)
returns table (profile_id uuid, week_start date, total_hours numeric, billable_hours numeric, submitted boolean)
language sql stable security definer set search_path = public as $$
  select e.profile_id, date_trunc('week', e.work_date)::date,
         sum(e.hours) filter (where e.status in ('submitted', 'approved')),
         coalesce(sum(e.hours) filter (where e.billable and e.status in ('submitted', 'approved')), 0),
         bool_and(e.status in ('submitted', 'approved'))
  from timesheet_entries e
  where e.work_date between p_from and p_to
    and (public.has_role('owner'::app_role) or public.has_role('director'::app_role) or public.has_role('finance'::app_role) or e.profile_id = auth.uid())
  group by 1, 2
$$;
