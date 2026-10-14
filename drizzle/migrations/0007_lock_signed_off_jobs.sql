-- 1. Only managers/admins can create jobs
drop policy if exists "active staff create jobs" on public.jobs;
create policy "active staff create jobs" on public.jobs for insert to authenticated
  with check (created_by = auth.uid() and public.is_active(auth.uid()) and public.is_staff(auth.uid()));

-- 2. Helper: is this job signed off?
create or replace function public.job_is_locked(_job_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.jobs where id = _job_id and status = 'signed_off')
$$;
grant execute on function public.job_is_locked(uuid) to authenticated;

-- 3. Agents cannot change a signed-off job, or reassign / re-own any job
create or replace function public.guard_job_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_staff(auth.uid()) then
    if old.status = 'signed_off' then
      raise exception 'This job is signed off and can no longer be changed.';
    end if;
    if new.assigned_to is distinct from old.assigned_to
       or new.created_by is distinct from old.created_by
       or new.code is distinct from old.code then
      raise exception 'Only a manager can reassign a job.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_job_guard on public.jobs;
create trigger trg_job_guard before update on public.jobs
  for each row execute function public.guard_job_update();

-- 4. The "customer sign-off" log line is now written by the database itself
create or replace function public.log_job_signoff()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'signed_off' and old.status is distinct from 'signed_off' then
    insert into public.job_updates (job_id, author_id, status, body)
    values (new.id, coalesce(auth.uid(), new.created_by), 'signed_off',
            'Customer sign-off: ' || coalesce(new.signoff_name, ''));
  end if;
  return new;
end $$;
drop trigger if exists trg_job_signoff_log on public.jobs;
create trigger trg_job_signoff_log after update on public.jobs
  for each row execute function public.log_job_signoff();

-- 5. No new site-log entries, and no deleting entries, once signed off (agents only)
drop policy if exists "log own updates" on public.job_updates;
create policy "log own updates" on public.job_updates for insert to authenticated
  with check (
    author_id = auth.uid() and public.is_active(auth.uid()) and public.can_see_job(job_id)
    and (public.is_staff(auth.uid()) or not public.job_is_locked(job_id))
  );
drop policy if exists "author or staff remove update" on public.job_updates;
create policy "author or staff remove update" on public.job_updates for delete to authenticated
  using (
    public.is_staff(auth.uid())
    or (author_id = auth.uid() and not public.job_is_locked(job_id))
  );
