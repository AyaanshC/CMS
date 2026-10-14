-- Enable live updates only for tables whose RLS governs visible rows.
do $$ declare v_table text; begin
  foreach v_table in array array['messages','notifications','project_updates','snags','tasks','boq_versions','change_orders','invoices','timesheet_entries','project_files'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=v_table) then
      execute format('alter publication supabase_realtime add table public.%I',v_table);
    end if;
  end loop;
end $$;

alter table public.alerts add column delivery_attempts int not null default 0,
  add column next_attempt_at timestamptz not null default now(),
  add column delivery_claim uuid, add column claimed_at timestamptz;
create function public.claim_alert_emails(p_claim uuid) returns setof public.alerts
language sql security definer set search_path=public as $$
  update alerts set delivery_claim=p_claim,claimed_at=now(),delivery_attempts=delivery_attempts+1
  where id in(select id from alerts where recipient_email is not null
    and email_status in ('pending','failed') and delivery_attempts < 5 and next_attempt_at <= now()
    and (claimed_at is null or claimed_at < now()-interval '10 minutes')
    order by created_at for update skip locked limit 50)
  returning *
$$;
revoke execute on function public.claim_alert_emails(uuid) from public,anon,authenticated;
grant execute on function public.claim_alert_emails(uuid) to service_role;

create or replace function public.on_snag_change() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if tg_op='INSERT' then
    perform log_activity(new.project_id,null,'Snag raised: '||new.title,'Priority '||new.priority,'snag_raised');
    perform notify_project_staff(new.project_id,'snag_raised','New snag: '||new.title,'Priority: '||upper(new.priority::text),'/projects/'||new.project_id||'?tab=snags');
  elsif new.status is distinct from old.status then
    perform log_activity(new.project_id,null,'Snag '||new.status||': '||new.title,'',case when new.status='closed' then 'snag_closed'::activity_type else 'note'::activity_type end);
    if new.status='verified' and coalesce((select (alert_preferences->>'snag_fix_alerts')::boolean from firm_settings),false) then
      perform notify_project_clients(new.project_id,'snag_verified','Fix verified: '||new.title,'Please inspect and sign off in your portal.',null);
    end if;
  end if;
  return new;
end $$;

-- Public enquiries are deduplicated and limited even when the RPC is invoked
-- directly. No contact data is returned; the caller receives only a reference.
create table public.intake_requests(
  id uuid primary key default gen_random_uuid(),contact_hash text not null,payload_hash text not null,
  reference text not null,created_at timestamptz not null default now()
);
create index on public.intake_requests(contact_hash,created_at);
alter table public.intake_requests enable row level security;
alter function public.submit_onboarding(jsonb) rename to submit_onboarding_unchecked;
revoke execute on function public.submit_onboarding_unchecked(jsonb) from public,anon,authenticated;
create function public.submit_onboarding(p jsonb) returns text
language plpgsql security definer set search_path=public as $$
declare v_contact text; v_payload text; v_ref text;
begin
  if length(coalesce(p->>'full_name','')) not between 1 and 120 or length(coalesce(p->>'phone','')) not between 6 and 30 then raise exception 'Enter a name and valid phone'; end if;
  if jsonb_array_length(coalesce(p->'rooms','[]'::jsonb)) > 20 then raise exception 'Too many rooms'; end if;
  v_contact := md5(regexp_replace(p->>'phone','[^0-9]','','g'));
  v_payload := md5((p-'request_id'-'website')::text);
  perform pg_advisory_xact_lock(hashtext('intake-rate'));
  select reference into v_ref from intake_requests where contact_hash=v_contact and payload_hash=v_payload and created_at>now()-interval '24 hours' order by created_at desc limit 1;
  if v_ref is not null then return v_ref; end if;
  if (select count(*) from intake_requests where contact_hash=v_contact and created_at>now()-interval '10 minutes') >= 2
     or (select count(*) from intake_requests where created_at>now()-interval '10 minutes') >= 100 then
    raise exception 'Too many enquiries. Please try again in a few minutes.';
  end if;
  v_ref := submit_onboarding_unchecked(p);
  insert into intake_requests(contact_hash,payload_hash,reference) values(v_contact,v_payload,v_ref);
  return v_ref;
end $$;
revoke execute on function public.submit_onboarding(jsonb) from public;
grant execute on function public.submit_onboarding(jsonb) to anon,authenticated;
