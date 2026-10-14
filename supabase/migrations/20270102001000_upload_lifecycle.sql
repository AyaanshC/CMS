update storage.buckets set file_size_limit=52428800 where id='project-files';
create table public.file_uploads(
  path text primary key,project_id uuid not null references projects(id),uploaded_by uuid not null references profiles(id),
  state text not null default 'pending' check(state in('pending','linked','cleaning')),
  expires_at timestamptz not null default now()+interval '7 days',created_at timestamptz not null default now(),claimed_at timestamptz
);
alter table public.file_uploads enable row level security;
create policy upload_read on file_uploads for select to authenticated using(account_active() and uploaded_by=auth.uid());
create function public.register_project_upload(p_project uuid,p_path text) returns text
language plpgsql security definer set search_path=public as $$
begin
  if not can_see_project(p_project) or storage_project_id(p_path) is distinct from p_project or length(p_path)>500 then raise exception 'Not allowed'; end if;
  insert into file_uploads(path,project_id,uploaded_by) values(p_path,p_project,auth.uid());
  return p_path;
end $$;
revoke execute on function public.register_project_upload(uuid,text) from public,anon;
grant execute on function public.register_project_upload(uuid,text) to authenticated;

-- A client may attach their own upload or an already-visible object, never an
-- internal object owned by someone else. Linking consumes the cleanup lease.
create function public.guard_attachment_path() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_new jsonb:=to_jsonb(new);v_old jsonb;v_project uuid;v_path text;v_key text;v_state text;
begin
  if tg_op='UPDATE' then v_old:=to_jsonb(old); end if;
  v_project:=nullif(v_new->>'project_id','')::uuid;
  if tg_table_name='snag_comments' then select project_id into v_project from snags where id=(v_new->>'snag_id')::uuid; end if;
  if tg_table_name='goods_receipts' then select project_id into v_project from purchase_orders where id=(v_new->>'po_id')::uuid; end if;
  for v_key in select unnest(array['storage_path','file_url','image_url','photo_url','before_photo_url','after_photo_url','file_path','receipt_url']) loop
    v_path:=v_new->>v_key;
    continue when coalesce(v_path,'')='' or (tg_op='UPDATE' and v_path is not distinct from v_old->>v_key);
    if auth.uid() is not null then
      if storage_project_id(v_path) is distinct from v_project then raise exception 'Attach an uploaded file from this project'; end if;
      if not can_manage_project(v_project) and not (
        exists(select 1 from storage.objects where bucket_id='project-files' and name=v_path and owner_id=auth.uid()::text)
        or can_read_project_object(v_path)) then raise exception 'You cannot attach an internal or unavailable file'; end if;
    end if;
    select state into v_state from file_uploads where path=v_path for update;
    if v_state='cleaning' then raise exception 'This abandoned upload expired. Please upload the file again'; end if;
    update file_uploads set state='linked' where path=v_path;
  end loop;
  return new;
end $$;
do $$ declare t text;begin
  foreach t in array array['project_files','messages','material_options','snags','snag_comments','goods_receipts','vendor_bills','expenses','vendor_quotes'] loop
    execute format('create trigger attachment_paths before insert or update on public.%I for each row execute function public.guard_attachment_path()',t);
  end loop;
end $$;

create function public.upload_is_referenced(p_path text) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from project_files where storage_path=p_path)
 or exists(select 1 from messages where file_url=p_path)
 or exists(select 1 from material_options where image_url=p_path)
 or exists(select 1 from snags where before_photo_url=p_path or after_photo_url=p_path)
 or exists(select 1 from snag_comments where photo_url=p_path)
 or exists(select 1 from project_updates where p_path=any(photos))
 or exists(select 1 from goods_receipts where photo_url=p_path)
 or exists(select 1 from vendor_bills where file_path=p_path)
 or exists(select 1 from expenses where receipt_url=p_path)
$$;
create function public.claim_abandoned_uploads() returns setof public.file_uploads
language plpgsql security definer set search_path=public as $$
begin
 insert into file_uploads(path,project_id,uploaded_by,expires_at,created_at)
 select o.name,p.id,pr.id,o.created_at+interval '7 days',o.created_at
 from storage.objects o join profiles pr on pr.id::text=o.owner_id join projects p on p.id=storage_project_id(o.name)
 where o.bucket_id='project-files' and o.created_at<now()-interval '7 days' and not upload_is_referenced(o.name)
 on conflict do nothing;
 return query update file_uploads u set state='cleaning',claimed_at=now()
 where u.path in(select f.path from file_uploads f where f.expires_at<now() and
   (f.state<>'cleaning' or f.claimed_at<now()-interval '10 minutes') and
   not upload_is_referenced(f.path) order by f.expires_at for update skip locked limit 50)
 returning u.*;
end $$;
select cron.schedule('cleanup-uploads','15 * * * *',$job$
 select net.http_post(
   url:=(select decrypted_secret from vault.decrypted_secrets where name='project_url')||'/functions/v1/cleanup-uploads',
   headers:=jsonb_build_object('Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='service_role_key'),'Content-Type','application/json'),
   body:='{}'::jsonb)
 where exists(select 1 from vault.decrypted_secrets where name='project_url') and exists(select 1 from vault.decrypted_secrets where name='service_role_key')
$job$);
revoke execute on function public.upload_is_referenced(text),public.claim_abandoned_uploads() from public,anon,authenticated;
grant execute on function public.upload_is_referenced(text),public.claim_abandoned_uploads() to service_role;

-- Material decisions and handover changes should refresh both staff and clients.
do $$ declare t text;begin
  foreach t in array array['material_options','handover_acceptances','project_rooms','project_milestones','projects','vendor_bills','vendor_payments','purchase_orders','goods_receipts'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
