create or replace function public.guard_invoice_item() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_status invoice_status;
begin
 v_id:=case when tg_op='DELETE' then old.invoice_id else new.invoice_id end;
 select status into v_status from invoices where id=v_id for update;
 -- An authorized draft deletion cascades after the parent has disappeared.
 if tg_op='DELETE' and v_status is null then return old;end if;
 if v_status is distinct from 'draft' then raise exception 'Only draft invoice lines can be changed';end if;
 if tg_op='UPDATE' and old.invoice_id is distinct from new.invoice_id then raise exception 'Invoice lines cannot move between invoices';end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create or replace function public.guard_issued_invoice() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if new.status='cancelled' and old.status<>'cancelled' and exists(select 1 from payments where invoice_id=old.id) then
   raise exception 'This invoice has recorded payments. Use a credit note instead of cancelling it';
 end if;
 if old.status<>'draft' and (new.project_id is distinct from old.project_id or new.subtotal is distinct from old.subtotal
   or new.discount is distinct from old.discount or new.gst_rate is distinct from old.gst_rate
   or new.invoice_number is distinct from old.invoice_number or new.issue_date is distinct from old.issue_date or new.status='draft') then
   raise exception 'Issued invoice amounts and identity are immutable; use a credit note';
 end if;return new;
end $$;
