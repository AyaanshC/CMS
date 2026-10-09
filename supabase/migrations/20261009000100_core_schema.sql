-- Enums -----------------------------------------------------------------
create type public.project_status as enum ('lead','consultation','design','boq_approval','execution','snag','handover','closed');
create type public.project_type as enum ('residential','commercial','office');
create type public.client_source as enum ('referral','instagram','website','walk-in','other');
create type public.boq_status as enum ('draft','submitted','approved','rejected');
create type public.snag_priority as enum ('critical','major','minor');
create type public.snag_status as enum ('raised','assigned','in_progress','fixed','verified','closed');
create type public.invoice_status as enum ('draft','sent','cancelled');
create type public.payment_mode as enum ('bank_transfer','upi','cheque','cash');
create type public.task_status as enum ('todo','in_progress','done');
create type public.task_priority as enum ('low','medium','high','urgent');
create type public.material_category as enum ('Flooring','Walls','Ceiling','Furniture','Lighting','Hardware');
create type public.activity_type as enum ('stage_change','boq_submit','boq_approve','snag_raised','snag_closed','payment_received','note');
create type public.profile_kind as enum ('staff','client','vendor');
create type public.app_role as enum ('owner','director','project_manager','architect','site_supervisor','finance','admin','procurement');

-- Helpers ---------------------------------------------------------------
create function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

create function public.financial_year(d date) returns text language sql immutable as $$
  select case when extract(month from d) >= 4
    then to_char(d, 'YY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YY') || '-' || to_char(d, 'YY') end
$$;

create sequence public.project_ref_seq;
create function public.next_project_reference() returns text language sql volatile as $$
  select 'PRJ-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.project_ref_seq')::text, 4, '0')
$$;

-- Firm --------------------------------------------------------------------
create table public.firm_settings (
  id boolean primary key default true check (id),           -- singleton row
  name text not null,
  tagline text not null default '',
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  gstin text,
  pan text,
  gst_rate numeric(5,2) not null default 18 check (gst_rate between 0 and 28),
  brand_color text not null default '#4F46E5',
  logo_url text not null default '',
  invoice_prefix text not null default 'INV',
  terms_and_conditions text,
  bank_details jsonb not null default '{}'::jsonb,
  alert_preferences jsonb not null default '{"whatsapp_digest":true,"payment_reminders":true,"snag_fix_alerts":true,"boq_ack":true}'::jsonb,
  updated_at timestamptz not null default now()
);

-- People ------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  email text,
  phone text not null,
  whatsapp text,
  address text,
  source public.client_source,
  tags text[] not null default '{}',
  style_preferences jsonb,
  budget_min numeric(14,2),
  budget_max numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  title text,
  kind public.profile_kind not null default 'staff',
  client_id uuid references public.clients(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((kind = 'client') = (client_id is not null))
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  primary key (user_id, role)
);

-- Projects ----------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  name text not null check (length(trim(name)) > 0),
  reference_number text not null unique default public.next_project_reference(),
  type public.project_type,
  property_type text,
  property_address text,
  area_sqft numeric(10,2) check (area_sqft is null or area_sqft > 0),
  status public.project_status not null default 'lead',
  progress_percent int not null default 0 check (progress_percent between 0 and 100),
  start_date date,
  estimated_end_date date,
  actual_end_date date,
  total_budget numeric(14,2),
  portal_token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  director_id uuid references public.profiles(id),
  manager_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create trigger projects_updated_at before update on public.projects for each row execute function public.set_updated_at();

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_on_project text,
  primary key (project_id, profile_id)
);

create table public.project_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  room_type text,
  area_sqft numeric(10,2),
  sort_order int not null default 0
);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  due_date date,
  completed_at timestamptz
);

-- BOQ ---------------------------------------------------------------------
create table public.boq_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  version_number int not null,
  version_label text,
  status public.boq_status not null default 'draft',
  is_active boolean not null default false,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  approval_note text,
  gst_percent numeric(5,2) not null default 18,
  discount_amount numeric(14,2) not null default 0 check (discount_amount >= 0),
  designer_fee numeric(14,2) not null default 0 check (designer_fee >= 0),
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (project_id, version_number)
);

create table public.boq_sections (
  id uuid primary key default gen_random_uuid(),
  boq_version_id uuid not null references public.boq_versions(id) on delete cascade,
  room_id uuid references public.project_rooms(id) on delete set null,
  name text,
  category text not null default 'General',
  sort_order int not null default 0
);

create table public.boq_line_items (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.boq_sections(id) on delete cascade,
  description text not null,
  specifications text,
  unit text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_rate numeric(14,2) not null check (unit_rate >= 0),
  remarks text,
  sort_order int not null default 0
);

-- Snags & tasks -----------------------------------------------------------
create table public.snags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_id uuid references public.project_rooms(id) on delete set null,
  title text not null,
  description text,
  location_detail text,
  priority public.snag_priority not null default 'major',
  status public.snag_status not null default 'raised',
  raised_by uuid references public.profiles(id) default auth.uid(),
  assigned_to uuid references public.profiles(id),
  due_date date,
  before_photo_url text,
  after_photo_url text,
  fixed_at timestamptz,
  designer_verified_at timestamptz,
  client_closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger snags_updated_at before update on public.snags for each row execute function public.set_updated_at();

create table public.snag_comments (
  id uuid primary key default gen_random_uuid(),
  snag_id uuid not null references public.snags(id) on delete cascade,
  author_id uuid not null references public.profiles(id) default auth.uid(),
  content text,
  photo_url text,
  created_at timestamptz not null default now(),
  check (content is not null or photo_url is not null)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_id uuid references public.project_rooms(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assigned_to uuid references public.profiles(id),
  due_date date,
  is_internal boolean not null default true,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Finance -----------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  invoice_number text unique,
  status public.invoice_status not null default 'draft',
  issue_date date,
  due_date date,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  discount numeric(14,2) not null default 0 check (discount >= 0),
  gst_rate numeric(5,2) not null check (gst_rate between 0 and 28),
  gst_amount numeric(14,2) generated always as (round((subtotal - discount) * gst_rate / 100, 2)) stored,
  total_amount numeric(14,2) generated always as ((subtotal - discount) + round((subtotal - discount) * gst_rate / 100, 2)) stored,
  notes text,
  created_at timestamptz not null default now(),
  check (discount <= subtotal),
  check (status = 'draft' or due_date is not null)
);

create table public.invoice_counters (
  fy text primary key,
  last_no int not null
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_rate numeric(14,2) not null check (unit_rate >= 0),
  amount numeric(14,2) generated always as (round(quantity * unit_rate, 2)) stored
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null,
  mode public.payment_mode not null,
  reference text,
  notes text,
  recorded_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  category text not null,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  receipt_url text,
  expense_date date not null,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

-- Communication -------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) default auth.uid(),
  content text,
  file_url text,
  file_name text,
  created_at timestamptz not null default now(),
  check (content is not null or file_url is not null)
);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  posted_by uuid not null references public.profiles(id) default auth.uid(),
  title text,
  content text not null,
  photos text[] not null default '{}',
  milestone_id uuid references public.project_milestones(id) on delete set null,
  likes int not null default 0,
  loved int not null default 0,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- Libraries -----------------------------------------------------------------
create table public.item_library (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text not null,
  unit text not null,
  standard_rate numeric(14,2) not null default 0,
  description text,
  specifications text,
  created_at timestamptz not null default now()
);

create table public.boq_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text not null default '',
  sections jsonb not null default '[]'::jsonb
);

create table public.material_options (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_name text not null,
  category public.material_category not null,
  product_name text not null,
  brand text not null default '',
  approx_cost numeric(14,2) not null default 0,
  image_url text not null default '',
  description text,
  is_selected boolean not null default false
);

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_id uuid references public.project_rooms(id) on delete set null,
  folder text,
  category text not null default 'document',
  file_name text not null,
  storage_path text not null unique,
  file_type text not null,
  file_size_bytes bigint,
  uploaded_by uuid references public.profiles(id) default auth.uid(),
  is_client_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  title text not null,
  description text not null default '',
  type public.activity_type not null,
  created_at timestamptz not null default now()
);

-- Foreign-key indexes -------------------------------------------------------
create index on public.projects (client_id);
create index on public.project_members (profile_id);
create index on public.project_rooms (project_id);
create index on public.project_milestones (project_id);
create index on public.boq_versions (project_id);
create index on public.boq_sections (boq_version_id);
create index on public.boq_line_items (section_id);
create index on public.snags (project_id);
create index on public.snag_comments (snag_id);
create index on public.tasks (project_id);
create index on public.tasks (assigned_to);
create index on public.invoices (project_id);
create index on public.invoice_items (invoice_id);
create index on public.payments (invoice_id);
create index on public.expenses (project_id);
create index on public.messages (project_id);
create index on public.project_updates (project_id);
create index on public.notifications (user_id, is_read);
create index on public.material_options (project_id);
create index on public.project_files (project_id);
create index on public.activity_logs (project_id);
create index on public.activity_logs (client_id);

-- Default deny: RLS on every table; policies come in a later migration.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- New auth user -> profile. kind/client_id come from app_metadata, which only
-- the service role can set (sign-up is disabled).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, kind, client_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_app_meta_data->>'kind')::public.profile_kind, 'staff'),
    (new.raw_app_meta_data->>'client_id')::uuid
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
