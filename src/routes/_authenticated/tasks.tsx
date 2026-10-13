import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TaskComments } from "@/components/task-comments";

type Status = Database["public"]["Enums"]["task_status"];
type Priority = Database["public"]["Enums"]["task_priority"];
const STATUSES: Status[] = ["todo", "in_progress", "review", "done"];
const STATUS_LABEL: Record<Status, string> = { todo: "To do", in_progress: "In progress", review: "In review", done: "Done" };

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tasks — NextGen Matrix Workforce" }] }),
  component: Tasks,
});

function Tasks() {
  const me = useMe().data!;
  const [openTask, setOpenTask] = useState<string | null>(null);
  const qc = useQueryClient();
  const tasks = useQuery({
    queryKey: ["tasks", "all"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const people = useQuery({
    enabled: me.isStaff,
    queryKey: ["people", "active"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name")).data ?? [],
  });
  const nameOf = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name ?? (id === me.user.id ? "You" : "Unassigned");

  const [form, setForm] = useState({ title: "", description: "", assignee_id: "", priority: "medium" as Priority, due_date: "" });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("tasks").insert({
      title: form.title, description: form.description || null, priority: form.priority,
      assignee_id: form.assignee_id || null, due_date: form.due_date || null, created_by: me.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Task created");
    setForm({ title: "", description: "", assignee_id: "", priority: "medium", due_date: "" });
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  async function setStatus(id: string, status: Status) {
    const { error } = await supabase.from("tasks").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Work</p>
        <h1 className="mt-2 text-3xl font-semibold">{me.isStaff ? "All tasks" : "My tasks"}</h1>
      </div>

      {me.isStaff && (
        <form onSubmit={create} className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-2">
          <Input placeholder="Task title (e.g. Install 5kVA inverter — Lekki site)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="md:col-span-2" />
          <Textarea placeholder="Details, checklist, site address…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2" />
          <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
            <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
            <SelectContent>{(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Priority })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(["low", "medium", "high", "urgent"] as Priority[]).map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          <Button type="submit">Create task</Button>
        </form>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl border bg-card/60 p-4">
            <p className="kicker mb-3">{STATUS_LABEL[s]} · {(tasks.data ?? []).filter((t) => t.status === s).length}</p>
            <div className="space-y-3">
              {(tasks.data ?? []).filter((t) => t.status === s).map((t) => (
                <div key={t.id} className="rounded-lg border bg-card p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{t.title}</p>
                    <Badge variant={t.priority === "urgent" || t.priority === "high" ? "destructive" : "secondary"}>{t.priority}</Badge>
                  </div>
                  {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">{nameOf(t.assignee_id)} · {t.due_date ?? "—"}</p>
                  <Select value={t.status} disabled={!me.isStaff && t.status === "done"} onValueChange={(v) => setStatus(t.id, v as Status)}>
                    <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.filter((x) => me.isStaff || x !== "done" || t.status === "done").map((x) => <SelectItem key={x} value={x}>{STATUS_LABEL[x]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="sm" className="mt-1 h-7 px-1 text-xs" onClick={() => setOpenTask(openTask === t.id ? null : t.id)}>
                    {openTask === t.id ? "Hide comments" : "Comments"}
                  </Button>
                  {openTask === t.id && <TaskComments taskId={t.id} me={{ userId: me.user.id, name: me.profile.full_name, canComment: !me.isAuditor, isStaff: me.isStaff }} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {!me.isStaff && <p className="text-xs text-muted-foreground">Move work to “In review” when finished — a manager will mark it done.</p>}
    </div>
  );
}
