create type public.app_role as enum ('super_admin','admin','manager','finance','hr','agent');
create type public.agent_status as enum ('pending','active','suspended');
create type public.task_status as enum ('todo','in_progress','review','done');
create type public.task_priority as enum ('low','medium','high','urgent');

create table public.profiles (
  id uuid primary key,
  email text not null,
  full_name text not null default '',
  phone text,
  job_title text,
  department text,
  status public.agent_status not null default 'pending',
  policy_accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique(user_id, role)
);
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.app_role not null default 'agent',
  invited_by uuid,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  note text
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  due_date date,
  assignee_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.profiles, public.invites, public.attendance, public.tasks, public.announcements to authenticated;
grant select on public.user_roles, public.audit_logs to authenticated;
grant all on public.profiles, public.user_roles, public.invites, public.attendance, public.tasks, public.announcements, public.audit_logs to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.invites enable row level security;
alter table public.attendance enable row level security;
alter table public.tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;
create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('super_admin','admin','manager','hr'))
$$;
create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id=_user_id and role in ('super_admin','admin'))
$$;
create or replace function public.is_active(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id=_user_id and status='active')
$$;

-- Called after sign-in: creates profile; first user becomes super admin; invited emails auto-activate.
create or replace function public.bootstrap_profile(_full_name text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); em text; inv public.invites; first boolean;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.profiles where id=uid) then return; end if;
  select email into em from auth.users where id=uid;
  first := not exists (select 1 from public.profiles);
  select * into inv from public.invites where lower(email)=lower(em) and used_at is null;
  insert into public.profiles(id,email,full_name,status)
    values (uid, em, coalesce(nullif(_full_name,''), split_part(em,'@',1)),
      case when first or inv.id is not null then 'active'::agent_status else 'pending'::agent_status end);
  if first then
    insert into public.user_roles(user_id,role) values (uid,'super_admin');
  elsif inv.id is not null then
    insert into public.user_roles(user_id,role) values (uid,inv.role);
    update public.invites set used_at=now() where id=inv.id;
  else
    insert into public.user_roles(user_id,role) values (uid,'agent');
  end if;
  insert into public.audit_logs(actor_id,action,target) values (uid,'profile_created',em);
end $$;

create or replace function public.set_member_access(_user_id uuid, _status public.agent_status, _role public.app_role)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'forbidden'; end if;
  if _role = 'super_admin' and not public.has_role(auth.uid(),'super_admin') then raise exception 'forbidden'; end if;
  if _user_id = auth.uid() then raise exception 'cannot change your own access'; end if;
  update public.profiles set status=_status where id=_user_id;
  delete from public.user_roles where user_id=_user_id;
  insert into public.user_roles(user_id,role) values (_user_id,_role);
  insert into public.audit_logs(actor_id,action,target,details)
    values (auth.uid(),'access_changed',_user_id::text, jsonb_build_object('status',_status,'role',_role));
end $$;

create or replace function public.log_action(_action text, _target text)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs(actor_id,action,target) values (auth.uid(), left(_action,100), left(_target,200));
$$;

-- profiles
create policy "own or staff read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()) or (public.is_active(auth.uid()) and status='active'));
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
-- prevent self status escalation
create or replace function public.guard_profile_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status and current_setting('role',true)='authenticated' and not public.is_admin(auth.uid()) then
    new.status := old.status;
  end if;
  return new;
end $$;
create trigger trg_guard_profile before update on public.profiles for each row execute function public.guard_profile_status();

create policy "own or staff read roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy "admins manage invites" on public.invites for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "read attendance" on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "clock in" on public.attendance for insert to authenticated
  with check (user_id = auth.uid() and public.is_active(auth.uid()));
create policy "clock out" on public.attendance for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read tasks" on public.tasks for select to authenticated
  using (assignee_id = auth.uid() or public.is_staff(auth.uid()));
create policy "staff create tasks" on public.tasks for insert to authenticated
  with check (public.is_staff(auth.uid()) and created_by = auth.uid());
create policy "update tasks" on public.tasks for update to authenticated
  using (assignee_id = auth.uid() or public.is_staff(auth.uid()));
create policy "staff delete tasks" on public.tasks for delete to authenticated
  using (public.is_staff(auth.uid()));

create policy "active read announcements" on public.announcements for select to authenticated
  using (public.is_active(auth.uid()));
create policy "staff post announcements" on public.announcements for insert to authenticated
  with check (public.is_staff(auth.uid()) and created_by = auth.uid());
create policy "staff delete announcements" on public.announcements for delete to authenticated
  using (public.is_staff(auth.uid()));

create policy "admins read audit" on public.audit_logs for select to authenticated
  using (public.is_admin(auth.uid()));