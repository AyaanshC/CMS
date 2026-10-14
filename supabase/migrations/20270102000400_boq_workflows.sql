alter table public.boq_line_items add column line_key uuid not null default gen_random_uuid();
create unique index boq_section_line_identity on public.boq_line_items(section_id,line_key);
-- Recreate the atomic BOQ operation with stable revision identities and serialization.
create or replace function public.create_boq_version(p jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid; v_project uuid := (p->>'project_id')::uuid; v_sec jsonb; v_sec_id uuid; v_item jsonb; v_next int;
begin
  perform 1 from projects where id=v_project for update;
  select coalesce(max(version_number),0)+1 into v_next from boq_versions where project_id=v_project;
  insert into boq_versions(project_id,version_number,version_label,gst_percent,discount_amount,designer_fee)
  values(v_project,v_next,p->>'version_label',coalesce((p->>'gst_percent')::numeric,(select gst_rate from firm_settings)),coalesce((p->>'discount_amount')::numeric,0),coalesce((p->>'designer_fee')::numeric,0)) returning id into v_id;
  for v_sec in select * from jsonb_array_elements(coalesce(p->'sections','[]')) loop
    insert into boq_sections(boq_version_id,room_id,name,category,sort_order)
    values(v_id,nullif(v_sec->>'room_id','')::uuid,v_sec->>'name',coalesce(v_sec->>'category','General'),coalesce((v_sec->>'sort_order')::int,0)) returning id into v_sec_id;
    for v_item in select * from jsonb_array_elements(coalesce(v_sec->'items','[]')) loop
      insert into boq_line_items(section_id,line_key,description,specifications,unit,quantity,unit_rate,remarks,sort_order)
      values(v_sec_id,coalesce(nullif(v_item->>'line_key','')::uuid,gen_random_uuid()),v_item->>'description',v_item->>'specifications',v_item->>'unit',coalesce((v_item->>'quantity')::numeric,(v_item->>'default_qty')::numeric),(coalesce(v_item->>'unit_rate',v_item->>'default_rate'))::numeric,v_item->>'remarks',coalesce((v_item->>'sort_order')::int,0));
    end loop;
  end loop;
  return v_id;
end $$;
create function public.apply_boq_template(p_project uuid,p_template uuid) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_template boq_templates;
begin
  select * into v_template from boq_templates where id=p_template;
  if v_template.id is null then raise exception 'Template unavailable'; end if;
  return create_boq_version(jsonb_build_object('project_id',p_project,'version_label',v_template.name,
    'gst_percent',(select gst_rate from firm_settings),'sections',v_template.sections));
end $$;
revoke execute on function public.apply_boq_template(uuid,uuid) from public,anon;
grant execute on function public.apply_boq_template(uuid,uuid) to authenticated;
