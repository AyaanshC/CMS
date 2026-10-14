alter table public.firm_settings add column intake_options jsonb not null default '{"property_types":["Apartment (2BHK)","Apartment (3BHK)","Apartment (4BHK / Penthouse)","Independent Villa","Commercial / Boutique Office"],"rooms":["Living & Dining","Master Bedroom","Kids / Guest Bedroom","Modular Kitchen","Foyer & Entryway","Balcony / Deck","Pooja Room","Home Office / Study","Bathrooms & Vanity"],"styles":[{"id":"Japandi","name":"Japandi","desc":"Warm minimalism, light oak, organic textures, functional calm.","image":"https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=600&auto=format&fit=crop&q=60"},{"id":"Contemporary","name":"Modern Contemporary","desc":"Clean geometry, subtle metallic accents, fluted panels, layered lighting.","image":"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=60"},{"id":"NeoClassical","name":"Neo-Classical Luxury","desc":"Mouldings, wainscoting, marble inlays, rich brass trims, European elegance.","image":"https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=600&auto=format&fit=crop&q=60"},{"id":"Minimalist","name":"Warm Minimalist","desc":"Seamless joinery, concealed storage, neutral palettes, clutter-free.","image":"https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&auto=format&fit=crop&q=60"}],"budget_tiers":[{"tier":"Value (₹8L - ₹15L)","desc":"Essential storage and practical finishes","estimate":1200000},{"tier":"Premium (₹15L - ₹25L)","desc":"Premium finishes, hardware and lighting","estimate":2200000},{"tier":"Luxury (₹25L+)","desc":"Custom detailing and luxury materials","estimate":3000000}]}'::jsonb;
create function public.get_intake_options() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('name',name,'options',intake_options) from firm_settings
$$;
revoke execute on function public.get_intake_options() from public;
grant execute on function public.get_intake_options() to anon,authenticated;

create or replace function public.submit_onboarding(p jsonb) returns text
language plpgsql security definer set search_path=public as $$
declare v_contact text; v_payload text; v_ref text;
begin
  if coalesce(p->>'website','')<>'' then raise exception 'Unable to submit this enquiry'; end if;
  if length(regexp_replace(coalesce(p->>'phone',''),'[^0-9]','','g')) not between 7 and 15 then raise exception 'Enter a valid phone number'; end if;
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
