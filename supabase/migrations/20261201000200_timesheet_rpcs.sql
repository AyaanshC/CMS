create function public.save_timesheet_week(p_week date, p_rows jsonb) returns int
language plpgsql security invoker set search_path = public as $$
declare v_row jsonb; v_day int; v_hours numeric; v_count int := 0;
begin
  if extract(isodow from p_week) <> 1 then raise exception 'A timesheet week must start on a Monday'; end if;
  delete from timesheet_entries
   where profile_id = auth.uid() and work_date between p_week and p_week + 6 and status in ('draft', 'rejected');
  for v_row in select * from jsonb_array_elements(p_rows) loop
    for v_day in 0..6 loop
      v_hours := coalesce((v_row->'hours'->>v_day)::numeric, 0);
      continue when v_hours <= 0;
      insert into timesheet_entries (profile_id, work_date, project_id, fee_stage_id, activity, hours, billable, notes)
      values (auth.uid(), p_week + v_day, nullif(v_row->>'project_id', '')::uuid, nullif(v_row->>'fee_stage_id', '')::uuid,
              (v_row->>'activity')::timesheet_activity, v_hours,
              coalesce((v_row->>'billable')::boolean, false) and nullif(v_row->>'project_id', '') is not null,
              nullif(v_row->>'notes', ''));
      v_count := v_count + 1;
    end loop;
  end loop;
  return v_count;
end $$;

create function public.submit_timesheet_week(p_week date) returns int
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  update timesheet_entries
     set status = case when project_id is null then 'approved'::timesheet_status else 'submitted' end,
         submitted_at = now(),
         decided_at = case when project_id is null then now() end,
         decision_note = null
   where profile_id = auth.uid() and work_date between p_week and p_week + 6 and status in ('draft', 'rejected');
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.can_approve_entry(p_entry uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select e.profile_id <> auth.uid() and (
           has_role('owner')
        or (p.manager_id = auth.uid())
        or (p.director_id = auth.uid() and (p.manager_id is null or p.manager_id = e.profile_id)))
  from timesheet_entries e join projects p on p.id = e.project_id
  where e.id = p_entry
$$;

create function public.decide_timesheet_entries(p_ids uuid[], p_approve boolean, p_note text) returns int
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_count int;
begin
  if not p_approve and coalesce(trim(p_note), '') = '' then raise exception 'Say why the time is being sent back'; end if;
  foreach v_id in array p_ids loop
    if not coalesce(can_approve_entry(v_id), false) then
      raise exception 'You are not allowed to approve entry %', v_id;
    end if;
  end loop;
  update timesheet_entries
     set status = case when p_approve then 'approved'::timesheet_status else 'rejected' end,
         decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where id = any(p_ids) and status = 'submitted';
  get diagnostics v_count = row_count;
  if not p_approve then
    insert into notifications (user_id, type, title, body, link)
    select distinct profile_id, 'timesheet_rejected', 'Timesheet sent back', p_note, '/timesheets'
    from timesheet_entries where id = any(p_ids);
  end if;
  return v_count;
end $$;
