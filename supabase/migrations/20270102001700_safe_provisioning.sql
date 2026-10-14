-- Only administrator-created identities receive an active studio profile.
-- Unexpected/self-created identities fail closed even if hosted signup settings
-- are accidentally enabled. Staff provisioning activates after role setup.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_kind profile_kind;v_active boolean;
begin
 v_kind:=case new.raw_app_meta_data->>'kind' when 'staff' then 'staff'::profile_kind when 'client' then 'client'::profile_kind else 'vendor'::profile_kind end;
 v_active:=v_kind in('staff','client') and not coalesce((new.raw_app_meta_data->>'provisioning_pending')::boolean,false);
 insert into profiles(id,full_name,email,kind,client_id,active)
 values(new.id,coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1)),new.email,v_kind,
   case when v_kind='client' then (new.raw_app_meta_data->>'client_id')::uuid end,v_active);
 return new;
end $$;

drop function public.configure_staff(uuid,public.app_role[],text);
create function public.configure_staff(p_user uuid,p_roles app_role[],p_title text default null,p_activate boolean default false) returns uuid
language plpgsql security definer set search_path=public as $$
begin
 if not has_role('owner') then raise exception 'Only an active owner can manage staff';end if;
 if coalesce(array_length(p_roles,1),0)=0 then raise exception 'Choose at least one role';end if;
 perform pg_advisory_xact_lock(hashtext('active-owners'));
 perform 1 from profiles where id=p_user and kind='staff' for update;
 if not found then raise exception 'Staff account not found';end if;
 if p_user=auth.uid() and not('owner'=any(p_roles)) then raise exception 'You cannot remove your own owner role';end if;
 if exists(select 1 from user_roles where user_id=p_user and role='owner') and not('owner'=any(p_roles))
   and not exists(select 1 from profiles p join user_roles r on p.id=r.user_id where p.active and r.role='owner' and p.id<>p_user) then raise exception 'At least one active owner must remain';end if;
 delete from user_roles where user_id=p_user and not(role=any(p_roles));
 insert into user_roles(user_id,role) select p_user,unnest(p_roles) on conflict do nothing;
 if p_title is not null then update profiles set title=p_title where id=p_user;end if;
 if p_activate then update profiles set active=true where id=p_user;end if;
 return p_user;
end $$;
revoke execute on function public.configure_staff(uuid,app_role[],text,boolean) from public,anon;
grant execute on function public.configure_staff(uuid,app_role[],text,boolean) to authenticated;
create or replace function public.my_client_id() returns uuid
language sql stable security definer set search_path=public as $$
 select client_id from profiles where id=auth.uid() and active and kind='client'
$$;
