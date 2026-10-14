alter table public.payments add column request_id uuid unique,add column request_hash text;
alter table public.vendor_payments add column request_hash text;
create function public.record_cash_payment(p jsonb,p_vendor boolean default false) returns uuid
language plpgsql security invoker set search_path=public as $$
declare v_request uuid:=nullif(p->>'request_id','')::uuid;v_hash text:=md5((p-'request_id')::text);v_id uuid;v_existing_hash text;
begin
 if v_request is not null then
   perform pg_advisory_xact_lock(hashtext(v_request::text));
   if p_vendor then select id,request_hash into v_id,v_existing_hash from vendor_payments where request_id=v_request;
   else select id,request_hash into v_id,v_existing_hash from payments where request_id=v_request;end if;
   if v_id is not null then
     if v_existing_hash is distinct from v_hash then raise exception 'This payment request was already used with different values';end if;
     return v_id;
   end if;
 end if;
 if p_vendor then
   insert into vendor_payments(vendor_id,project_id,bill_id,amount,tds_amount,paid_on,mode,reference,is_advance,request_id,request_hash)
   values((p->>'vendor_id')::uuid,(p->>'project_id')::uuid,nullif(p->>'bill_id','')::uuid,(p->>'amount')::numeric,coalesce((p->>'tds_amount')::numeric,0),(p->>'paid_on')::date,(p->>'mode')::payment_mode,p->>'reference',coalesce((p->>'is_advance')::boolean,false),v_request,v_hash) returning id into v_id;
 else
   insert into payments(invoice_id,amount,tds_amount,payment_date,mode,reference,notes,request_id,request_hash)
   values((p->>'invoice_id')::uuid,(p->>'amount')::numeric,coalesce((p->>'tds_amount')::numeric,0),(p->>'payment_date')::date,(p->>'mode')::payment_mode,p->>'reference',p->>'notes',v_request,v_hash) returning id into v_id;
 end if;
 return v_id;
end $$;
revoke execute on function public.record_cash_payment(jsonb,boolean) from public,anon;
grant execute on function public.record_cash_payment(jsonb,boolean) to authenticated;
