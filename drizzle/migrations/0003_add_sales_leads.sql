create type public.lead_stage as enum ('new','contacted','quoted','won','lost');
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (length(customer_name) between 1 and 200),
  company text,
  phone text,
  email text,
  city text,
  source text,
  service public.job_service not null default 'other',
  stage public.lead_stage not null default 'new',
  value_ngn numeric(14,2) not null default 0 check (value_ngn >= 0),
  follow_up_date date,
  notes text check (notes is null or length(notes) <= 4000),
  owner_id uuid references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leads to authenticated;
grant all on public.leads to service_role;
alter table public.leads enable row level security;
create policy "read leads" on public.leads for select to authenticated
  using (owner_id = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()));
create policy "create leads" on public.leads for insert to authenticated
  with check (created_by = auth.uid() and public.is_active(auth.uid()));
create policy "update leads" on public.leads for update to authenticated
  using (owner_id = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()))
  with check (owner_id = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()));
create policy "staff delete leads" on public.leads for delete to authenticated using (public.is_staff(auth.uid()));
create index leads_owner_idx on public.leads(owner_id);
create index leads_stage_idx on public.leads(stage);
create trigger trg_leads_touch before update on public.leads for each row execute function public.touch_updated_at();