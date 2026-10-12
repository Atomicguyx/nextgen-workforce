-- Job & site records: field work log for solar / IoT / security installations

create type public.job_service as enum ('survey','solar_install','iot_install','security_install','maintenance','repair','other');
create type public.job_status as enum ('scheduled','en_route','on_site','blocked','completed','signed_off','cancelled');

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  code text not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,7)),
  title text not null,
  service public.job_service not null default 'other',
  status public.job_status not null default 'scheduled',
  customer_name text not null,
  customer_phone text,
  customer_email text,
  site_address text not null,
  city text,
  state text,
  scheduled_date date,
  scheduled_time text,
  assigned_to uuid references public.profiles(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  notes text,
  parts_used text,
  signoff_name text,
  signoff_note text,
  signoff_at timestamp with time zone,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table public.job_updates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text,
  photo_path text,
  status public.job_status,
  created_at timestamp with time zone not null default now(),
  constraint job_update_has_content check (nullif(body,'') is not null or nullif(photo_path,'') is not null)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_updates TO authenticated;
GRANT ALL ON public.job_updates TO service_role;

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_updates ENABLE ROW LEVEL SECURITY;

create or replace function public.can_see_job(_job_id uuid)
 returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.jobs j
    where j.id = _job_id
      and (j.assigned_to = auth.uid() or j.created_by = auth.uid() or public.is_staff(auth.uid()))
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_see_job(uuid) TO authenticated;

create policy "visible jobs readable" on public.jobs for select to authenticated
  using (assigned_to = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()));
create policy "active staff create jobs" on public.jobs for insert to authenticated
  with check (created_by = auth.uid() and public.is_active(auth.uid()));
create policy "crew or staff update jobs" on public.jobs for update to authenticated
  using (assigned_to = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()))
  with check (assigned_to = auth.uid() or created_by = auth.uid() or public.is_staff(auth.uid()));
create policy "staff delete jobs" on public.jobs for delete to authenticated
  using (public.is_staff(auth.uid()));

create policy "read log of visible job" on public.job_updates for select to authenticated
  using (public.can_see_job(job_id));
create policy "log own updates" on public.job_updates for insert to authenticated
  with check (author_id = auth.uid() and public.is_active(auth.uid()) and public.can_see_job(job_id));
create policy "author or staff remove update" on public.job_updates for delete to authenticated
  using (author_id = auth.uid() or public.is_staff(auth.uid()));

create index jobs_assigned_idx on public.jobs(assigned_to);
create index jobs_status_idx on public.jobs(status);
create index jobs_scheduled_idx on public.jobs(scheduled_date);
create index job_updates_job_idx on public.job_updates(job_id, created_at);

create or replace function public.touch_updated_at()
 returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger trg_job_touch before update on public.jobs
  for each row execute function public.touch_updated_at();

create or replace function public.log_job_event()
 returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_logs(actor_id, action, target) values (auth.uid(), 'job_created', new.id::text);
  elsif new.status is distinct from old.status then
    insert into public.audit_logs(actor_id, action, target, details)
      values (auth.uid(), 'job_status', new.id::text, jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end $$;
create trigger trg_job_event after insert or update on public.jobs
  for each row execute function public.log_job_event();