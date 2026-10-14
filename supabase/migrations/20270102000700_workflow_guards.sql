-- Preserve the financial record after issue, including through direct API writes.
create function public.guard_issued_invoice() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if old.status <> 'draft' and (
    new.project_id is distinct from old.project_id or new.subtotal is distinct from old.subtotal
    or new.discount is distinct from old.discount or new.gst_rate is distinct from old.gst_rate
    or new.invoice_number is distinct from old.invoice_number or new.issue_date is distinct from old.issue_date
    or new.status = 'draft') then
    raise exception 'Issued invoice amounts and identity are immutable; use a credit note';
  end if;
  return new;
end $$;
create trigger invoices_immutable before update on public.invoices for each row execute function public.guard_issued_invoice();

create function public.guard_invoice_item() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_status invoice_status;
begin
  v_id := case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
  select status into v_status from invoices where id=v_id for update;
  if v_status is distinct from 'draft' then raise exception 'Only draft invoice lines can be changed'; end if;
  if tg_op='UPDATE' and old.invoice_id is distinct from new.invoice_id then
    raise exception 'Invoice lines cannot move between invoices';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger invoice_items_draft before insert or update or delete on public.invoice_items for each row execute function public.guard_invoice_item();

create or replace function public.create_itemized_invoice(p jsonb) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_id uuid;v_line jsonb;v_subtotal numeric;
begin
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') not between 1 and 200 then raise exception 'Invoice needs 1–200 lines'; end if;
  if exists(select 1 from jsonb_array_elements(p->'items') i where coalesce((i->>'quantity')::numeric,0)<=0 or coalesce((i->>'unit_rate')::numeric,-1)<0 or length(trim(coalesce(i->>'description','')))=0) then raise exception 'Each invoice line needs a description, positive quantity and nonnegative rate'; end if;
  select sum(round((i->>'quantity')::numeric*(i->>'unit_rate')::numeric,2)) into v_subtotal from jsonb_array_elements(p->'items') i;
  if coalesce((p->>'discount')::numeric,0)>v_subtotal then raise exception 'Discount exceeds subtotal'; end if;
  insert into invoices(project_id,status,subtotal,discount,gst_rate,due_date,notes)
  values((p->>'project_id')::uuid,'draft',v_subtotal,coalesce((p->>'discount')::numeric,0),(p->>'gst_rate')::numeric,(p->>'due_date')::date,p->>'notes') returning id into v_id;
  for v_line in select * from jsonb_array_elements(p->'items') loop
    insert into invoice_items(invoice_id,description,quantity,unit_rate) values(v_id,v_line->>'description',(v_line->>'quantity')::numeric,(v_line->>'unit_rate')::numeric);
  end loop;
  if coalesce((p->>'send')::boolean,false) then update invoices set status='sent' where id=v_id; end if;
  return v_id;
end $$;

create function public.guard_owner_role() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and old.role='owner' and (tg_op='DELETE' or new.role is distinct from old.role or new.user_id is distinct from old.user_id) then
    perform pg_advisory_xact_lock(hashtext('active-owners'));
    if old.user_id=auth.uid() then raise exception 'You cannot remove your own owner role'; end if;
    if not exists(select 1 from profiles p join user_roles r on p.id=r.user_id where p.active and r.role='owner' and p.id<>old.user_id) then raise exception 'At least one active owner must remain'; end if;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger owner_role_guard before update or delete on public.user_roles for each row execute function public.guard_owner_role();

create or replace function public.finalize_material(p_material uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v material_options;
begin
  select * into v from material_options where id=p_material;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  perform 1 from projects where id=v.project_id for update;
  select * into v from material_options where id=p_material for update;
  if not v.is_selected then raise exception 'Select an option first'; end if;
  update material_options set locked_at=now(),locked_by=auth.uid() where project_id=v.project_id and room_name=v.room_name and category=v.category;
  perform log_activity(v.project_id,null,'Material finalized: '||v.product_name,v.room_name||' · '||v.category,'note');
  return p_material;
end $$;
