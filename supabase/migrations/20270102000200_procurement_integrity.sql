-- Aggregate writes and financial guards run in database transactions.
alter table public.purchase_orders add column request_id uuid unique, add column request_hash text;
alter table public.goods_receipts add column request_id uuid unique, add column request_hash text;
alter table public.vendor_bills add column request_id uuid unique, add column request_hash text;
alter table public.vendor_payments add column request_id uuid unique;

create function public.guard_procurement_links() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_po uuid; v_project uuid; v_vendor uuid; v_ordered numeric; v_accepted numeric; v_bill record; v_paid numeric; v_total numeric;
begin
  if tg_table_name = 'po_lines' then
    if new.boq_line_item_id is null then return new; end if;
    if not exists(select 1 from boq_line_items i join boq_sections s on s.id = i.section_id
      join boq_versions b on b.id = s.boq_version_id join purchase_orders p on p.id = new.po_id
      where i.id = new.boq_line_item_id and b.project_id = p.project_id and b.status = 'approved' and b.is_active) then
      raise exception 'The PO line must belong to this project''s current approved BOQ';
    end if;
  elsif tg_table_name = 'grn_lines' then
    select po_id, quantity into v_po, v_ordered from po_lines where id = new.po_line_id for update;
    if v_po is null or not exists(select 1 from goods_receipts where id = new.grn_id and po_id = v_po) then
      raise exception 'The receipt line does not belong to this purchase order';
    end if;
    select coalesce(sum(quantity_received - quantity_rejected),0) into v_accepted from grn_lines where po_line_id = new.po_line_id and id <> new.id;
    if v_accepted + new.quantity_received - new.quantity_rejected > v_ordered then raise exception 'Accepted quantity exceeds the order'; end if;
  elsif tg_table_name = 'vendor_bills' then
    if new.po_id is null then return new; end if;
    if not exists(select 1 from purchase_orders where id = new.po_id and project_id = new.project_id and vendor_id = new.vendor_id and status in ('issued','closed')) then
      raise exception 'The bill must match an issued order, project and vendor';
    end if;
  elsif tg_table_name = 'vendor_bill_lines' then
    select * into v_bill from vendor_bills where id = new.bill_id for update;
    if new.po_line_id is not null and not exists(select 1 from po_lines where id = new.po_line_id and po_id = v_bill.po_id) then
      raise exception 'The bill line must belong to the bill''s purchase order';
    end if;
    if v_bill.po_id is not null and new.po_line_id is null then raise exception 'Choose a PO line for an order-linked bill'; end if;
    if new.gst_rate < 0 or new.gst_rate > 28 then raise exception 'GST must be between 0 and 28 percent'; end if;
  elsif tg_table_name = 'vendor_payments' then
    if new.created_by is distinct from auth.uid() and auth.uid() is not null then raise exception 'Payment recorder must be the signed-in user'; end if;
    if new.is_advance then
      if new.bill_id is not null then raise exception 'An advance must not be recorded as a bill settlement'; end if;
      if not can_procure(new.project_id) then raise exception 'Not allowed'; end if;
    else
      select * into v_bill from vendor_bills where id = new.bill_id for update;
      if v_bill.id is null or v_bill.status <> 'approved' or v_bill.project_id <> new.project_id or v_bill.vendor_id <> new.vendor_id then
        raise exception 'Payments require an approved bill for the same project and vendor';
      end if;
      select coalesce(sum(amount + gst_amount),0) into v_total from vendor_bill_lines where bill_id = new.bill_id;
      select coalesce(sum(amount + tds_amount),0) into v_paid from vendor_payments where bill_id = new.bill_id and id <> new.id;
      if v_paid + new.amount + new.tds_amount > v_total then raise exception 'Payment and TDS exceed the outstanding bill balance'; end if;
    end if;
  end if;
  return new;
end $$;
create trigger po_lines_links before insert or update on public.po_lines for each row execute function public.guard_procurement_links();
create trigger grn_lines_links before insert or update on public.grn_lines for each row execute function public.guard_procurement_links();
create trigger bills_links before insert or update on public.vendor_bills for each row execute function public.guard_procurement_links();
create trigger bill_lines_links before insert or update on public.vendor_bill_lines for each row execute function public.guard_procurement_links();
create trigger vendor_payments_guard before insert or update on public.vendor_payments for each row execute function public.guard_procurement_links();

create function public.create_purchase_order(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_request uuid := (p->>'request_id')::uuid; v_hash text := md5(p::text); v_existing record; v_line jsonb;
begin
  if jsonb_array_length(p->'lines') not between 1 and 200 then raise exception 'A purchase order needs 1–200 lines'; end if;
  if v_request is not null then
    perform pg_advisory_xact_lock(hashtextextended('po:' || v_request::text,0));
    select * into v_existing from purchase_orders where request_id = v_request;
    if found then
      if v_existing.created_by <> auth.uid() or v_existing.request_hash <> v_hash then raise exception 'This request was already used for a different order'; end if;
      return v_existing.id;
    end if;
  end if;
  insert into purchase_orders(project_id,vendor_id,order_date,expected_delivery,notes,request_id,request_hash)
  values((p->>'project_id')::uuid,(p->>'vendor_id')::uuid,coalesce(nullif(p->>'order_date','')::date,current_date),nullif(p->>'expected_delivery','')::date,p->>'notes',v_request,v_hash) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p->'lines') loop
    insert into po_lines(po_id,boq_line_item_id,description,unit,quantity,rate,gst_rate)
    values(v_id,nullif(v_line->>'boq_line_item_id','')::uuid,v_line->>'description',v_line->>'unit',(v_line->>'quantity')::numeric,(v_line->>'rate')::numeric,coalesce((v_line->>'gst_rate')::numeric,18));
  end loop;
  return v_id;
end $$;

create function public.record_goods_receipt(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_request uuid := (p->>'request_id')::uuid; v_hash text := md5(p::text); v_existing record; v_line jsonb;
begin
  if jsonb_array_length(p->'lines') not between 1 and 200 then raise exception 'A receipt needs 1–200 lines'; end if;
  if v_request is not null then
    perform pg_advisory_xact_lock(hashtextextended('grn:' || v_request::text,0));
    select * into v_existing from goods_receipts where request_id = v_request;
    if found then
      if v_existing.received_by <> auth.uid() or v_existing.request_hash <> v_hash then raise exception 'This request was already used for a different receipt'; end if;
      return v_existing.id;
    end if;
  end if;
  insert into goods_receipts(po_id,received_on,notes,photo_url,request_id,request_hash)
  values((p->>'po_id')::uuid,(p->>'received_on')::date,p->>'notes',p->>'photo_url',v_request,v_hash) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p->'lines') order by value->>'po_line_id' loop
    insert into grn_lines(grn_id,po_line_id,quantity_received,quantity_rejected,condition_note)
    values(v_id,(v_line->>'po_line_id')::uuid,(v_line->>'quantity_received')::numeric,coalesce((v_line->>'quantity_rejected')::numeric,0),v_line->>'condition_note');
  end loop;
  return v_id;
end $$;

create function public.record_vendor_bill(p jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare v_id uuid; v_request uuid := (p->>'request_id')::uuid; v_hash text := md5(p::text); v_existing record; v_line jsonb;
begin
  if jsonb_array_length(p->'lines') not between 1 and 200 then raise exception 'A bill needs 1–200 lines'; end if;
  if v_request is not null then
    perform pg_advisory_xact_lock(hashtextextended('bill:' || v_request::text,0));
    select * into v_existing from vendor_bills where request_id = v_request;
    if found then
      if v_existing.created_by <> auth.uid() or v_existing.request_hash <> v_hash then raise exception 'This request was already used for a different bill'; end if;
      return v_existing.id;
    end if;
  end if;
  insert into vendor_bills(vendor_id,project_id,po_id,bill_number,bill_date,due_date,notes,file_path,request_id,request_hash)
  values((p->>'vendor_id')::uuid,(p->>'project_id')::uuid,nullif(p->>'po_id','')::uuid,p->>'bill_number',(p->>'bill_date')::date,nullif(p->>'due_date','')::date,p->>'notes',p->>'file_path',v_request,v_hash) returning id into v_id;
  for v_line in select * from jsonb_array_elements(p->'lines') loop
    insert into vendor_bill_lines(bill_id,po_line_id,description,quantity,rate,gst_rate)
    values(v_id,nullif(v_line->>'po_line_id','')::uuid,v_line->>'description',(v_line->>'quantity')::numeric,(v_line->>'rate')::numeric,coalesce((v_line->>'gst_rate')::numeric,18));
  end loop;
  return v_id;
end $$;

revoke execute on function public.create_purchase_order(jsonb),public.record_goods_receipt(jsonb),public.record_vendor_bill(jsonb) from public,anon;
grant execute on function public.create_purchase_order(jsonb),public.record_goods_receipt(jsonb),public.record_vendor_bill(jsonb) to authenticated;
