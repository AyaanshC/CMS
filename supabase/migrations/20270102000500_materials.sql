alter table public.material_options add column selected_by uuid references public.profiles(id),
  add column selected_at timestamptz,add column locked_at timestamptz,add column locked_by uuid references public.profiles(id);
create function public.select_material(p_material uuid,p_selected boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare v material_options;
begin
  select * into v from material_options where id=p_material;
  if v.id is null or not (can_manage_project(v.project_id) or is_project_client(v.project_id)) then raise exception 'Not allowed'; end if;
  perform 1 from projects where id=v.project_id for update;
  select * into v from material_options where id=p_material for update;
  if exists(select 1 from material_options where project_id=v.project_id and room_name=v.room_name and category=v.category and locked_at is not null) then raise exception 'This selection has been finalized by the studio'; end if;
  if p_selected then update material_options set is_selected=false,selected_by=null,selected_at=null where project_id=v.project_id and room_name=v.room_name and category=v.category; end if;
  update material_options set is_selected=p_selected,selected_by=case when p_selected then auth.uid() end,selected_at=case when p_selected then now() end where id=p_material;
  perform log_activity(v.project_id,null,'Material selection: '||v.product_name,case when p_selected then 'Selected' else 'Selection removed' end,'note');
  return p_material;
end $$;
create function public.finalize_material(p_material uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v material_options;
begin
  select * into v from material_options where id=p_material;
  if v.id is null or not can_manage_project(v.project_id) then raise exception 'Not allowed'; end if;
  perform 1 from projects where id=v.project_id for update;
  if not v.is_selected then raise exception 'Select an option first'; end if;
  update material_options set locked_at=now(),locked_by=auth.uid() where project_id=v.project_id and room_name=v.room_name and category=v.category;
  perform log_activity(v.project_id,null,'Material finalized: '||v.product_name,v.room_name||' · '||v.category,'note');
  return p_material;
end $$;
create function public.guard_material_lock() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.locked_at is not null then raise exception 'Finalized material options cannot be edited or removed'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
create trigger material_lock before update or delete on public.material_options for each row execute function public.guard_material_lock();
revoke execute on function public.select_material(uuid,boolean),public.finalize_material(uuid) from public,anon;
grant execute on function public.select_material(uuid,boolean),public.finalize_material(uuid) to authenticated;
