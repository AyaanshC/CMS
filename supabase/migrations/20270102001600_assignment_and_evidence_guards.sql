-- Project membership alone must not allow a person to promote themselves into
-- a billing role or expose a project by transferring its client association.
create function public.guard_project_assignments() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_change boolean;
begin
 if auth.uid() is null then return new;end if;
 if tg_op='UPDATE' then
   if new.client_id is distinct from old.client_id and not(has_role('owner') or has_role('admin')) then raise exception 'Only an owner or administrator can transfer a project to another client';end if;
   v_change:=new.director_id is distinct from old.director_id or new.manager_id is distinct from old.manager_id;
   if v_change and not(has_role('owner') or has_role('admin') or old.director_id=auth.uid() or old.manager_id=auth.uid()) then raise exception 'Only the owner or assigned project lead can change team assignments';end if;
 else v_change:=true;end if;
 if v_change then
   if new.director_id is not null and not exists(select 1 from profiles p join user_roles r on p.id=r.user_id where p.id=new.director_id and p.active and p.kind='staff' and r.role in('owner','director')) then raise exception 'Choose eligible active staff for the director';end if;
   if new.manager_id is not null and not exists(select 1 from profiles p join user_roles r on p.id=r.user_id where p.id=new.manager_id and p.active and p.kind='staff' and r.role in('owner','director','project_manager')) then raise exception 'Choose eligible active staff for the manager';end if;
 end if;return new;
end $$;
create trigger projects_assignments before insert or update on public.projects for each row execute function public.guard_project_assignments();

create function public.guard_snag_evidence() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then return new;end if;
 if (new.fixed_by,new.designer_verified_by,new.client_closed_by,new.fixed_at,new.designer_verified_at,new.client_closed_at)
   is distinct from (old.fixed_by,old.designer_verified_by,old.client_closed_by,old.fixed_at,old.designer_verified_at,old.client_closed_at) then
   raise exception 'Lifecycle evidence is written only by verified status transitions';
 end if;
 if old.status in('fixed','verified','closed') and new.after_photo_url is distinct from old.after_photo_url and new.status<>'raised' then raise exception 'Reopen the snag before replacing its fix evidence';end if;
 return new;
end $$;
-- This runs before lifecycle and timestamp triggers, protecting caller input
-- while permitting those triggers to stamp the actual actor and time.
create trigger snags_evidence before update on public.snags for each row execute function public.guard_snag_evidence();
