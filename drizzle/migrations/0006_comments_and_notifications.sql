-- Task comments + in-app notifications

create table public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null,
  author_name text not null default '',
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index task_comments_task_idx on public.task_comments (task_id, created_at);
alter table public.task_comments enable row level security;

-- You can read comments on any task you are allowed to see.
create policy "read task comments" on public.task_comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy "add task comments" on public.task_comments for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active(auth.uid())
    and not public.is_auditor(auth.uid())
    and exists (select 1 from public.tasks t where t.id = task_id)
  );
create policy "delete task comments" on public.task_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_staff(auth.uid()));
grant select, insert, delete on public.task_comments to authenticated;
grant all on public.task_comments to service_role;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notifications" on public.notifications for delete to authenticated
  using (user_id = auth.uid());
grant select, delete on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;  -- people may only mark as read
grant all on public.notifications to service_role;

-- Notify when a task is assigned, sent for review, or marked done
create or replace function public.notify_task_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assignee_id is not null
     and new.assignee_id is distinct from auth.uid()
     and (tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id) then
    insert into public.notifications (user_id, message, link)
    values (new.assignee_id, 'New task assigned: ' || new.title, '/tasks');
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'review' and new.created_by is distinct from auth.uid() then
      insert into public.notifications (user_id, message, link)
      values (new.created_by, 'Ready for review: ' || new.title, '/tasks');
    elsif new.status = 'done' and new.assignee_id is not null and new.assignee_id is distinct from auth.uid() then
      insert into public.notifications (user_id, message, link)
      values (new.assignee_id, 'Task marked done: ' || new.title, '/tasks');
    end if;
  end if;
  return new;
end $$;
create trigger tasks_notify after insert or update on public.tasks
  for each row execute function public.notify_task_change();

-- Notify the other people on a task when someone comments
create or replace function public.notify_task_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare t record;
begin
  select title, assignee_id, created_by into t from public.tasks where id = new.task_id;
  if t.created_by is not null and t.created_by <> new.author_id then
    insert into public.notifications (user_id, message, link)
    values (t.created_by, coalesce(nullif(new.author_name, ''), 'Someone') || ' commented on: ' || t.title, '/tasks');
  end if;
  if t.assignee_id is not null and t.assignee_id <> new.author_id and t.assignee_id is distinct from t.created_by then
    insert into public.notifications (user_id, message, link)
    values (t.assignee_id, coalesce(nullif(new.author_name, ''), 'Someone') || ' commented on: ' || t.title, '/tasks');
  end if;
  return new;
end $$;
create trigger task_comments_notify after insert on public.task_comments
  for each row execute function public.notify_task_comment();
