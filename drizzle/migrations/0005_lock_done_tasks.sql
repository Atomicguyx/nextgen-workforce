-- Once a task is marked Done, only staff can change it.
-- Agents can still update their own tasks until then, but can never set "done" themselves.
drop policy if exists "update tasks" on public.tasks;
create policy "update tasks" on public.tasks for update to authenticated
  using (
    public.is_staff(auth.uid())
    or (assignee_id = auth.uid() and status <> 'done')
  )
  with check (
    public.is_staff(auth.uid())
    or (assignee_id = auth.uid() and status <> 'done')
  );
