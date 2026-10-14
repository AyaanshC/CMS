alter table public.timesheet_entries add column billed_invoice_id uuid references public.invoices(id) on delete set null;
create function public.bill_hourly_time(p_project uuid,p_from date,p_to date) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_project projects; v_id uuid; v_total numeric; v_gst numeric; v_entry record;
begin
  if not can_bill_project(p_project) then raise exception 'Not allowed'; end if;
  if p_to<p_from or p_to-p_from>366 then raise exception 'Choose a billing period of at most one year'; end if;
  select * into v_project from projects where id=p_project for update;
  if v_project.fee_basis<>'hourly' or coalesce(v_project.fee_rate,0)<=0 then raise exception 'Set a positive hourly fee rate first'; end if;
  perform 1 from timesheet_entries where project_id=p_project and work_date between p_from and p_to and status='approved' and billable and billed_invoice_id is null for update;
  select sum(round(hours*v_project.fee_rate,2)) into v_total from timesheet_entries
    where project_id=p_project and work_date between p_from and p_to and status='approved' and billable and billed_invoice_id is null;
  if coalesce(v_total,0)<=0 then raise exception 'No approved, unbilled time in this period'; end if;
  select gst_rate into v_gst from firm_settings;
  insert into invoices(project_id,status,subtotal,gst_rate,notes) values(p_project,'draft',v_total,v_gst,'Approved billable time: '||p_from||' to '||p_to) returning id into v_id;
  for v_entry in select t.id,t.hours,t.work_date,t.activity,p.full_name from timesheet_entries t join profiles p on p.id=t.profile_id
    where t.project_id=p_project and t.work_date between p_from and p_to and t.status='approved' and t.billable and t.billed_invoice_id is null loop
    insert into invoice_items(invoice_id,description,quantity,unit_rate) values(v_id,v_entry.work_date||' · '||v_entry.full_name||' · '||v_entry.activity,v_entry.hours,v_project.fee_rate);
    update timesheet_entries set billed_invoice_id=v_id where id=v_entry.id;
  end loop;
  perform log_activity(p_project,null,'Hourly invoice drafted',p_from||' to '||p_to,'note');
  return v_id;
end $$;
create function public.create_itemized_invoice(p jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;v_line jsonb;v_subtotal numeric;
begin
  if jsonb_array_length(p->'items') not between 1 and 200 then raise exception 'Invoice needs 1–200 lines'; end if;
  select sum(round((i->>'quantity')::numeric*(i->>'unit_rate')::numeric,2)) into v_subtotal from jsonb_array_elements(p->'items') i;
  insert into invoices(project_id,status,subtotal,discount,gst_rate,due_date,notes)
  values((p->>'project_id')::uuid,case when coalesce((p->>'send')::boolean,false) then 'sent'::invoice_status else 'draft'::invoice_status end,v_subtotal,coalesce((p->>'discount')::numeric,0),(p->>'gst_rate')::numeric,(p->>'due_date')::date,p->>'notes') returning id into v_id;
  for v_line in select * from jsonb_array_elements(p->'items') loop
    insert into invoice_items(invoice_id,description,quantity,unit_rate) values(v_id,v_line->>'description',(v_line->>'quantity')::numeric,(v_line->>'unit_rate')::numeric);
  end loop;
  return v_id;
end $$;
revoke execute on function public.bill_hourly_time(uuid,date,date),public.create_itemized_invoice(jsonb) from public,anon;
grant execute on function public.bill_hourly_time(uuid,date,date),public.create_itemized_invoice(jsonb) to authenticated;
