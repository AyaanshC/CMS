alter table public.handover_acceptances add column snapshot jsonb not null default '{}'::jsonb,
  add column document_number text unique;
create or replace function public.accept_project_handover(p_project uuid,p_signer text,p_note text default '') returns uuid
language plpgsql security definer set search_path=public as $$
declare v_project projects;v_id uuid;v_snapshot jsonb;
begin
  if not is_project_client(p_project) then raise exception 'Only the project client can accept handover'; end if;
  select * into v_project from projects where id=p_project for update;
  if v_project.status<>'handover' then raise exception 'The studio must prepare handover first'; end if;
  if exists(select 1 from snags where project_id=p_project and status<>'closed') then raise exception 'Close all snags before accepting handover'; end if;
  select id into v_id from handover_acceptances where project_id=p_project
    and accepted_at>=coalesce((select max(updated_at) from snags where project_id=p_project),'-infinity'::timestamptz)
    order by accepted_at desc limit 1;
  if v_id is not null then return v_id; end if;
  v_snapshot:=jsonb_build_object(
    'project_name',v_project.name,'reference',v_project.reference_number,'address',v_project.property_address,
    'client_name',(select full_name from clients where id=v_project.client_id),
    'studio',(select jsonb_build_object('name',name,'address',address,'phone',phone,'email',email) from firm_settings),
    'rooms',(select coalesce(jsonb_agg(jsonb_build_object('name',name,'area_sqft',area_sqft) order by sort_order),'[]'::jsonb) from project_rooms where project_id=p_project),
    'snags',(select coalesce(jsonb_agg(jsonb_build_object('title',title,'priority',priority,'status',status,'fixed_at',fixed_at,'verified_at',designer_verified_at,'closed_at',client_closed_at) order by created_at),'[]'::jsonb) from snags where project_id=p_project));
  insert into handover_acceptances(project_id,accepted_by,signer,note,snapshot,document_number)
    values(p_project,auth.uid(),trim(p_signer),nullif(trim(p_note),''),v_snapshot,'HO-'||to_char(current_date,'YYYYMMDD')||'-'||substr(gen_random_uuid()::text,1,8)) returning id into v_id;
  perform log_activity(p_project,null,'Client accepted handover',trim(p_signer),'note');
  return v_id;
end $$;
