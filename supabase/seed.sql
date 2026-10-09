-- Local development seed. Every user's password is "password123".

insert into public.firm_settings (name, tagline, address, phone, email, gstin, pan, gst_rate, invoice_prefix, terms_and_conditions, bank_details)
values ('Priya Designs Studio', 'Architecture & Interiors', '14, MG Road, Bangalore 560001', '+91 98765 43210',
        'hello@priyadesigns.test', '29AABCP1234A1Z5', 'AABCP1234A', 18, 'PDS',
        'Payment due within 14 days of invoice date.',
        '{"account_name":"Priya Designs Studio","bank_name":"HDFC Bank","account_number":"50200012345678","ifsc_code":"HDFC0000123","upi_id":"priyadesigns@hdfcbank"}');

insert into public.clients (id, full_name, email, phone, source, tags, budget_min, budget_max, notes) values
  ('c1000000-0000-4000-8000-000000000001', 'Arun & Meena Sharma', 'arun@client.test', '+91 98001 11234', 'referral', '{VIP,Residential}', 800000, 1500000, 'Prefers modern minimalist style.'),
  ('c1000000-0000-4000-8000-000000000002', 'Rohit Mehta', 'rohit@client.test', '+91 97002 22345', 'instagram', '{Commercial}', 2000000, 4000000, 'Premium office interior.'),
  ('c1000000-0000-4000-8000-000000000003', 'Kavitha Reddy', 'kavitha@client.test', '+91 96003 33456', 'website', '{Residential,New}', 400000, 700000, '2BHK, scandinavian.');

-- Users: auth.users insert fires handle_new_user(), which creates profiles.
do $$
declare
  u record;
begin
  for u in select * from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'priya@studio.test',  'Priya Sharma',  'staff',  null::uuid, 'Principal Architect'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'vikram@studio.test', 'Vikram Rao',    'staff',  null, 'Director'),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'ananya@studio.test', 'Ananya Iyer',   'staff',  null, 'Project Manager'),
    ('00000000-0000-4000-8000-000000000004'::uuid, 'neha@studio.test',   'Neha Verma',    'staff',  null, 'Architect'),
    ('00000000-0000-4000-8000-000000000005'::uuid, 'aarav@studio.test',  'Aarav Mehta',   'staff',  null, 'Site Supervisor'),
    ('00000000-0000-4000-8000-000000000006'::uuid, 'meera@studio.test',  'Meera Joshi',   'staff',  null, 'Finance Manager'),
    ('00000000-0000-4000-8000-000000000007'::uuid, 'sunil@studio.test',  'Sunil Das',     'staff',  null, 'Office Administrator'),
    ('00000000-0000-4000-8000-000000000008'::uuid, 'kunal@studio.test',  'Kunal Singhal', 'staff',  null, 'Procurement Lead'),
    ('00000000-0000-4000-8000-000000000011'::uuid, 'arun@client.test',   'Arun Sharma',   'client', 'c1000000-0000-4000-8000-000000000001'::uuid, null),
    ('00000000-0000-4000-8000-000000000012'::uuid, 'rohit@client.test',  'Rohit Mehta',   'client', 'c1000000-0000-4000-8000-000000000002'::uuid, null)
  ) as t(id, email, full_name, kind, client_id, title)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            extensions.crypt('password123', extensions.gen_salt('bf')), now(),
            jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'kind', u.kind)
              || case when u.client_id is null then '{}'::jsonb else jsonb_build_object('client_id', u.client_id) end,
            jsonb_build_object('full_name', u.full_name), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text, jsonb_build_object('sub', u.id::text, 'email', u.email), 'email', now(), now(), now());
    update public.profiles set title = u.title where id = u.id;
  end loop;
end $$;

insert into public.user_roles (user_id, role) values
  ('00000000-0000-4000-8000-000000000001', 'owner'),
  ('00000000-0000-4000-8000-000000000001', 'director'),
  ('00000000-0000-4000-8000-000000000002', 'director'),
  ('00000000-0000-4000-8000-000000000003', 'project_manager'),
  ('00000000-0000-4000-8000-000000000004', 'architect'),
  ('00000000-0000-4000-8000-000000000005', 'site_supervisor'),
  ('00000000-0000-4000-8000-000000000006', 'finance'),
  ('00000000-0000-4000-8000-000000000007', 'admin'),
  ('00000000-0000-4000-8000-000000000008', 'procurement');

insert into public.projects (id, client_id, name, type, property_type, property_address, area_sqft, status, progress_percent, start_date, estimated_end_date, total_budget, director_id, manager_id) values
  ('a1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Sharma Villa', 'residential', '4BHK Villa', 'Indiranagar, Bangalore', 3200, 'execution', 65, current_date - 90, current_date + 45, 1850000, '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000002', 'TechCorp HQ Office', 'office', 'Office Floor', 'Whitefield, Bangalore', 6200, 'design', 25, current_date - 40, current_date + 150, 3200000, '00000000-0000-4000-8000-000000000001', null),
  ('a1000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000003', 'Reddy Apartment', 'residential', '2BHK Apartment', 'HSR Layout, Bangalore', 980, 'consultation', 5, current_date - 5, current_date + 120, 550000, '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003');

insert into public.project_members (project_id, profile_id, role_on_project) values
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000004', 'Lead Architect'),
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000005', 'Site Supervisor');

insert into public.project_rooms (id, project_id, name, area_sqft, sort_order) values
  ('d1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Living & Dining', 420, 1),
  ('d1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Master Bedroom', 220, 2),
  ('d1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'Open Workstations', 3800, 1);

insert into public.project_milestones (project_id, title, due_date, completed_at) values
  ('a1000000-0000-4000-8000-000000000001', 'Design sign-off', current_date - 70, now() - interval '72 days'),
  ('a1000000-0000-4000-8000-000000000001', 'Carpentry complete', current_date + 20, null),
  ('a1000000-0000-4000-8000-000000000002', 'Concept presentation', current_date - 10, now() - interval '8 days');

insert into public.boq_versions (id, project_id, version_number, version_label, status, submitted_at, gst_percent, discount_amount, designer_fee, created_by) values
  ('b0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 1, 'Initial estimate', 'submitted', now() - interval '2 days', 18, 5000, 35000, '00000000-0000-4000-8000-000000000003'),
  ('b0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 1, 'Draft', 'draft', null, 18, 0, 0, '00000000-0000-4000-8000-000000000001');

insert into public.boq_sections (id, boq_version_id, room_id, name, category, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Living & Dining', 'Civil & Ceiling', 1),
  ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', null, 'Workstations', 'Furniture', 1);

insert into public.boq_line_items (section_id, description, unit, quantity, unit_rate, sort_order) values
  ('b1000000-0000-4000-8000-000000000001', 'Gypsum false ceiling with cove', 'sqft', 240, 95, 1),
  ('b1000000-0000-4000-8000-000000000001', 'Wall putty with primer (2 coats)', 'sqft', 450, 25, 2),
  ('b1000000-0000-4000-8000-000000000002', 'Linear workstation 1200mm', 'nos', 40, 18500, 1);

insert into public.snags (project_id, room_id, title, priority, status, raised_by, assigned_to, created_at) values
  ('a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001', 'Cove light gap near window', 'major', 'raised', '00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000005', now() - interval '3 days'),
  ('a1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'Wardrobe shutter misaligned', 'critical', 'in_progress', '00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000005', now() - interval '1 day');

insert into public.tasks (project_id, title, status, priority, assigned_to, due_date, is_internal, created_by) values
  ('a1000000-0000-4000-8000-000000000001', 'Finalise kitchen hardware', 'in_progress', 'high', '00000000-0000-4000-8000-000000000004', current_date, true, '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000001', 'Client to confirm laminate shade', 'todo', 'medium', null, current_date + 3, false, '00000000-0000-4000-8000-000000000003'),
  ('a1000000-0000-4000-8000-000000000002', 'Prepare concept moodboard', 'todo', 'medium', '00000000-0000-4000-8000-000000000004', current_date + 5, true, '00000000-0000-4000-8000-000000000001');

insert into public.invoices (id, project_id, status, issue_date, due_date, subtotal, gst_rate, notes) values
  ('e1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'sent', current_date - 4, current_date + 10, 250000, 18, 'Execution milestone 1'),
  ('e1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000002', 'sent', current_date - 34, current_date - 20, 400000, 18, 'Concept design fee'),
  ('e1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001', 'draft', null, null, 150000, 18, 'Carpentry milestone');

insert into public.payments (invoice_id, amount, payment_date, mode, reference, recorded_by) values
  ('e1000000-0000-4000-8000-000000000001', 100000, current_date - 2, 'bank_transfer', 'HDFC-REF-8921', '00000000-0000-4000-8000-000000000006');

insert into public.expenses (project_id, category, description, amount, expense_date, created_by) values
  ('a1000000-0000-4000-8000-000000000001', 'Materials', 'Gypsum boards and channels', 42000, current_date - 20, '00000000-0000-4000-8000-000000000005'),
  ('a1000000-0000-4000-8000-000000000001', 'Labour', 'Ceiling crew, week 1', 28000, current_date - 14, '00000000-0000-4000-8000-000000000005');

insert into public.messages (project_id, sender_id, content, created_at) values
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000011', 'Can we see the laminate samples on Saturday?', now() - interval '1 day'),
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Yes, 11am at site works.', now() - interval '20 hours');

insert into public.project_updates (project_id, posted_by, title, content) values
  ('a1000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003', 'Ceiling framing done', 'Gypsum framing for living and dining is complete. Boarding starts Monday.');

insert into public.item_library (item_name, category, unit, standard_rate, description) values
  ('Gypsum false ceiling (plain)', 'Civil & Ceiling', 'sqft', 85, 'Saint-Gobain board on GI frame'),
  ('Modular kitchen base unit (BWP ply)', 'Carpentry', 'rft', 2400, '18mm BWP ply, laminate finish'),
  ('Wardrobe with laminate shutters', 'Carpentry', 'sqft', 1450, 'Hinged shutters, Hettich hardware');

insert into public.boq_templates (name, category, description, sections) values
  ('Standard 3BHK', 'residential', 'Typical scope for a 3BHK apartment',
   '[{"name":"Living & Dining","category":"Civil & Ceiling","items":[{"description":"Gypsum false ceiling","unit":"sqft","default_qty":300,"default_rate":85}]}]');

insert into public.material_options (project_id, room_name, category, product_name, brand, approx_cost, image_url, description) values
  ('a1000000-0000-4000-8000-000000000001', 'Living & Dining', 'Flooring', 'Italian marble, Botticino', 'Classic Marble Co', 450, 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600', 'Per sqft, polished');

insert into public.fee_templates (name, discipline, kind, stages) values
('Architecture (standard)', 'architecture', 'design_fee', '[
  {"name":"Concept","percent":10,"checklist":["Concept presentation shared","Client sign-off on concept"]},
  {"name":"Schematic Design","percent":15,"checklist":["Schematic drawings issued","Client sign-off"]},
  {"name":"Design Development","percent":20,"checklist":["DD drawing set issued","Consultant coordination done"]},
  {"name":"Working Drawings & Tender","percent":25,"checklist":["GFC drawings issued","Tender documents issued"]},
  {"name":"Statutory Approvals","percent":10,"checklist":["Applications submitted","Approvals received"]},
  {"name":"Site Supervision","percent":20,"checklist":["Final site inspection done","Completion certificate issued"]}]'),
('Interiors (standard)', 'interiors', 'design_fee', '[
  {"name":"Concept & Moodboard","percent":15,"checklist":["Moodboard presented","Client sign-off"]},
  {"name":"Design & 3D","percent":25,"checklist":["3D views shared","Client sign-off on design"]},
  {"name":"BOQ & Specifications","percent":15,"checklist":["BOQ submitted","Specifications issued"]},
  {"name":"Execution Supervision","percent":35,"checklist":["Site work complete","Snag list closed"]},
  {"name":"Handover","percent":10,"checklist":["Handover walkthrough done","Handover document signed"]}]'),
('Execution (standard)', 'both', 'execution', '[
  {"name":"Advance on BOQ approval","percent":40,"checklist":["BOQ approved by client"]},
  {"name":"Carcass / structure complete","percent":40,"checklist":["Carcass work inspected"]},
  {"name":"Handover","percent":20,"checklist":["Handover signed"]}]');

update public.projects set engagement_type = 'design_and_execution', discipline = 'interiors', fee_basis = 'lump_sum', fee_amount = 300000
  where id = 'a1000000-0000-4000-8000-000000000001';
update public.projects set engagement_type = 'design_only', discipline = 'architecture', fee_basis = 'percent_of_cost', fee_rate = 6, estimated_construction_cost = 15000000
  where id = 'a1000000-0000-4000-8000-000000000002';

insert into public.project_fee_stages (project_id, kind, name, percent, sort_order, status, percent_complete, completed_at, checklist)
select 'a1000000-0000-4000-8000-000000000001', 'design_fee', s->>'name', (s->>'percent')::numeric, ord::int,
       case when ord <= 2 then 'complete'::fee_stage_status when ord = 3 then 'in_progress' else 'not_started' end,
       case when ord <= 2 then 100 when ord = 3 then 50 else 0 end,
       case when ord <= 2 then now() - interval '30 days' end,
       (select coalesce(jsonb_agg(jsonb_build_object('label', c, 'done', ord <= 2)), '[]') from jsonb_array_elements_text(s->'checklist') c)
from public.fee_templates t, jsonb_array_elements(t.stages) with ordinality as x(s, ord)
where t.name = 'Interiors (standard)';
