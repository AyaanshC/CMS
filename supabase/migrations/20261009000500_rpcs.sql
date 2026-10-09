create function public.client_decide_boq(p_boq uuid, p_approve boolean, p_signer text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_project uuid; v_status boq_status;
begin
  select project_id, status into v_project, v_status from boq_versions where id = p_boq for update;
  if v_project is null or not is_project_client(v_project) then
    raise exception 'Not allowed';
  end if;
  if v_status <> 'submitted' then
    raise exception 'Only submitted BOQs can be approved or rejected';
  end if;
  if p_approve then
    if coalesce(trim(p_signer), '') = '' then raise exception 'Signer name is required'; end if;
    update boq_versions set is_active = false where project_id = v_project and id <> p_boq;
    update boq_versions
       set status = 'approved', approved_at = now(), approved_by = trim(p_signer), is_active = true,
           approval_note = coalesce(nullif(trim(p_note), ''), 'Approved by ' || trim(p_signer))
     where id = p_boq;
  else
    if coalesce(trim(p_note), '') = '' then raise exception 'A reason is required to request changes'; end if;
    update boq_versions
       set status = 'rejected',
           approval_note = 'Changes requested by ' || coalesce(nullif(trim(p_signer), ''), 'client') || ': ' || trim(p_note)
     where id = p_boq;
  end if;
end $$;

create function public.client_close_snag(p_snag uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_project uuid; v_status snag_status;
begin
  select project_id, status into v_project, v_status from snags where id = p_snag for update;
  if v_project is null or not is_project_client(v_project) then raise exception 'Not allowed'; end if;
  if v_status not in ('fixed', 'verified') then raise exception 'A snag can be closed only after it is fixed'; end if;
  update snags set status = 'closed' where id = p_snag;
end $$;

create function public.react_to_update(p_update uuid, p_kind text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('like', 'love') then raise exception 'Unknown reaction'; end if;
  if not can_see_project((select project_id from project_updates where id = p_update)) then raise exception 'Not allowed'; end if;
  update project_updates
     set likes = likes + (p_kind = 'like')::int, loved = loved + (p_kind = 'love')::int
   where id = p_update;
end $$;

-- Invoker: RLS on project_milestones decides who may toggle.
create function public.toggle_milestone(p_id uuid) returns void
language sql security invoker set search_path = public as $$
  update project_milestones
     set completed_at = case when completed_at is null then now() else null end
   where id = p_id
$$;

-- Invoker: RLS on boq_* decides; whole payload succeeds or fails together.
create function public.create_boq_version(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_project uuid := (p->>'project_id')::uuid; v_sec jsonb; v_sec_id uuid; v_item jsonb; v_next int;
begin
  select coalesce(max(version_number), 0) + 1 into v_next from boq_versions where project_id = v_project;
  insert into boq_versions (project_id, version_number, version_label, gst_percent, discount_amount, designer_fee)
  values (v_project, v_next, p->>'version_label',
          coalesce((p->>'gst_percent')::numeric, (select gst_rate from firm_settings)),
          coalesce((p->>'discount_amount')::numeric, 0),
          coalesce((p->>'designer_fee')::numeric, 0))
  returning id into v_id;

  for v_sec in select * from jsonb_array_elements(coalesce(p->'sections', '[]'::jsonb)) loop
    insert into boq_sections (boq_version_id, room_id, name, category, sort_order)
    values (v_id, nullif(v_sec->>'room_id', '')::uuid, v_sec->>'name',
            coalesce(v_sec->>'category', 'General'), coalesce((v_sec->>'sort_order')::int, 0))
    returning id into v_sec_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_sec->'items', '[]'::jsonb)) loop
      insert into boq_line_items (section_id, description, specifications, unit, quantity, unit_rate, remarks, sort_order)
      values (v_sec_id, v_item->>'description', v_item->>'specifications', v_item->>'unit',
              (v_item->>'quantity')::numeric, (v_item->>'unit_rate')::numeric, v_item->>'remarks',
              coalesce((v_item->>'sort_order')::int, 0));
    end loop;
  end loop;
  return v_id;
end $$;

-- Public intake form. Creates a lead only; portal access is granted by staff later.
-- ponytail: no rate limiting; add a captcha or per-IP limit if the form is abused.
create function public.submit_onboarding(p jsonb) returns text
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_project uuid; v_ref text; v_room text; v_i int := 0;
begin
  if coalesce(trim(p->>'full_name'), '') = '' or length(p->>'full_name') > 120 then raise exception 'Name is required'; end if;
  if coalesce(trim(p->>'phone'), '') = '' or length(p->>'phone') > 30 then raise exception 'Phone is required'; end if;

  insert into clients (full_name, phone, email, address, source, tags, notes)
  values (trim(p->>'full_name'), trim(p->>'phone'), nullif(trim(p->>'email'), ''), nullif(trim(p->>'address'), ''),
          'website', '{New}',
          left(concat_ws('. ', 'Style: ' || (p->>'style'), 'Budget: ' || (p->>'budget_label')), 500))
  returning id into v_client;

  insert into projects (client_id, name, status, property_type, property_address, area_sqft, total_budget)
  values (v_client, trim(p->>'full_name') || ' Residence', 'lead', left(p->>'property_type', 60),
          nullif(trim(p->>'address'), ''), nullif(p->>'area_sqft', '')::numeric, nullif(p->>'budget_estimate', '')::numeric)
  returning id, reference_number into v_project, v_ref;

  for v_room in select jsonb_array_elements_text(coalesce(p->'rooms', '[]'::jsonb)) loop
    v_i := v_i + 1;
    exit when v_i > 20;
    insert into project_rooms (project_id, name, sort_order) values (v_project, left(v_room, 60), v_i);
  end loop;

  perform notify_project_staff(v_project, 'new_lead', 'New enquiry: ' || trim(p->>'full_name'), 'Submitted via website intake form', '/projects/' || v_project);
  return v_ref;
end $$;

revoke execute on function public.submit_onboarding(jsonb) from public;
grant execute on function public.submit_onboarding(jsonb) to anon, authenticated;
