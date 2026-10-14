create function public.delivery_health() returns jsonb
language plpgsql security definer set search_path=public as $$
begin
 if not (has_role('owner') or has_role('finance')) then raise exception 'Not allowed';end if;
 return (select jsonb_build_object('pending',count(*) filter(where email_status='pending'),
   'failed',count(*) filter(where email_status='failed'),'sent',count(*) filter(where email_status='sent'),
   'exhausted',count(*) filter(where email_status='failed' and delivery_attempts>=5),
   'oldest_pending',min(created_at) filter(where email_status='pending')) from alerts);
end $$;
revoke execute on function public.delivery_health() from public,anon;
grant execute on function public.delivery_health() to authenticated;
