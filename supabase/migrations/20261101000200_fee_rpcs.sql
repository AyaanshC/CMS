create function public.apply_fee_template(p_project uuid, p_template uuid) returns int
language plpgsql security definer set search_path = public as $$
declare v_kind fee_stage_kind; v_stages jsonb; v_count int;
begin
  if not can_manage_project(p_project) then raise exception 'Not allowed'; end if;
  select kind, stages into v_kind, v_stages from fee_templates where id = p_template;
  if v_kind is null then raise exception 'Unknown template'; end if;
  if exists (select 1 from project_fee_stages where project_id = p_project and kind = v_kind) then
    raise exception 'This project already has % stages; edit them instead', v_kind;
  end if;
  insert into project_fee_stages (project_id, kind, name, percent, sort_order, checklist)
  select p_project, v_kind, s->>'name', (s->>'percent')::numeric, ord::int,
         (select coalesce(jsonb_agg(jsonb_build_object('label', c, 'done', false)), '[]'::jsonb)
            from jsonb_array_elements_text(coalesce(s->'checklist', '[]'::jsonb)) c)
  from jsonb_array_elements(v_stages) with ordinality as x(s, ord);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

create function public.complete_fee_stage(p_stage uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare v record; v_total numeric; v_amount numeric; v_invoice uuid;
begin
  select * into v from project_fee_stages where id = p_stage for update;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  if v.status = 'complete' then raise exception 'Stage is already complete'; end if;
  v_total := fee_percent_total(v.project_id, v.kind);
  if v_total <> 100 then raise exception 'Stage percentages must total 100 (currently total %)', v_total; end if;
  if exists (select 1 from jsonb_array_elements(v.checklist) c where not coalesce((c->>'done')::boolean, false)) then
    raise exception 'Finish the stage checklist first';
  end if;

  update project_fee_stages set status = 'complete', percent_complete = 100, completed_at = now() where id = p_stage;

  select amount into v_amount from fee_stage_summary where id = p_stage;
  if coalesce(v_amount, 0) <= 0 then return null; end if;   -- e.g. hourly fee, or no approved BOQ yet

  insert into invoices (project_id, status, subtotal, gst_rate, fee_stage_id, notes)
  values (v.project_id, 'draft', v_amount, (select gst_rate from firm_settings), p_stage, 'Stage: ' || v.name)
  returning id into v_invoice;

  perform log_activity(v.project_id, null, 'Stage complete: ' || v.name, 'Draft invoice queued for Finance', 'stage_change');
  insert into notifications (user_id, type, title, body, link)
  select r.user_id, 'invoice_draft', 'Ready to invoice: ' || v.name, 'A draft invoice is waiting in the Finance queue.', '/finance'
  from user_roles r where r.role = 'finance';
  return v_invoice;
end $$;

-- Reopening is allowed only while the stage's invoice is still a draft (the draft is deleted).
create function public.reopen_fee_stage(p_stage uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v record;
begin
  select * into v from project_fee_stages where id = p_stage for update;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  if exists (select 1 from invoices where fee_stage_id = p_stage and status = 'sent') then
    raise exception 'This stage has been invoiced and cannot be reopened; raise a credit note instead';
  end if;
  delete from invoices where fee_stage_id = p_stage and status = 'draft';
  update project_fee_stages set status = 'in_progress', completed_at = null where id = p_stage;
end $$;

-- Keep projects.progress_percent equal to weighted design-stage progress.
create function public.sync_project_progress() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_project uuid := coalesce(new.project_id, old.project_id); v_total numeric;
begin
  select sum(percent) into v_total from project_fee_stages where project_id = v_project and kind = 'design_fee';
  if coalesce(v_total, 0) > 0 then
    update projects set progress_percent = round((
      select sum(percent * percent_complete) from project_fee_stages where project_id = v_project and kind = 'design_fee') / v_total)
    where id = v_project;
  end if;
  return null;
end $$;
create trigger fee_stages_progress after insert or update or delete on public.project_fee_stages
  for each row execute function public.sync_project_progress();
