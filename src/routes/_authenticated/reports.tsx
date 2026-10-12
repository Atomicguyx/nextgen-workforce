import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Performance reports — NextGen Matrix Workforce" }, { name: "description", content: "Hours, jobs, tasks and sales per person." }] }),
  component: Reports,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const naira = (n: number) => "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

type Row = { id: string; name: string; hours: number; days: number; jobsDone: number; jobsOpen: number; tasksDone: number; tasksLate: number; won: number; wonValue: number };

function Reports() {
  const me = useMe().data!;
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));

  const report = useQuery({
    enabled: me.isStaff,
    queryKey: ["report", from, to],
    queryFn: async () => {
      const start = new Date(from + "T00:00:00").toISOString();
      const end = new Date(to + "T23:59:59").toISOString();
      const [p, a, j, t, l] = await Promise.all([
        supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name"),
        supabase.from("attendance").select("user_id, clock_in, clock_out").gte("clock_in", start).lte("clock_in", end),
        supabase.from("jobs").select("assigned_to, status, updated_at, scheduled_date"),
        supabase.from("tasks").select("assignee_id, status, due_date, updated_at"),
        supabase.from("leads").select("owner_id, stage, value_ngn, closed_at").eq("stage", "won").gte("closed_at", start).lte("closed_at", end),
      ]);
      const inRange = (s: string) => s >= start && s <= end;
      return (p.data ?? []).map<Row>((u) => {
        const att = (a.data ?? []).filter((x) => x.user_id === u.id);
        const ms = att.reduce((s, x) => s + ((x.clock_out ? new Date(x.clock_out) : new Date()).getTime() - new Date(x.clock_in).getTime()), 0);
        const jobs = (j.data ?? []).filter((x) => x.assigned_to === u.id);
        const tasks = (t.data ?? []).filter((x) => x.assignee_id === u.id);
        const won = (l.data ?? []).filter((x) => x.owner_id === u.id);
        return {
          id: u.id, name: u.full_name,
          hours: Math.round((ms / 3600000) * 10) / 10,
          days: new Set(att.map((x) => x.clock_in.slice(0, 10))).size,
          jobsDone: jobs.filter((x) => (x.status === "completed" || x.status === "signed_off") && inRange(x.updated_at)).length,
          jobsOpen: jobs.filter((x) => !["completed", "signed_off", "cancelled"].includes(x.status)).length,
          tasksDone: tasks.filter((x) => x.status === "done" && inRange(x.updated_at)).length,
          tasksLate: tasks.filter((x) => x.status !== "done" && x.due_date && x.due_date < iso(new Date())).length,
          won: won.length,
          wonValue: won.reduce((s, x) => s + Number(x.value_ngn), 0),
        };
      });
    },
  });

  if (!me.isStaff) return <p className="text-muted-foreground">Reports are available to managers and admins.</p>;

  const rows = report.data ?? [];
  const headers = ["Name", "Hours", "Days worked", "Jobs completed", "Jobs open", "Tasks done", "Tasks overdue", "Sales won", "Sales value (NGN)"];
  const cells = (r: Row) => [r.name, r.hours, r.days, r.jobsDone, r.jobsOpen, r.tasksDone, r.tasksLate, r.won, r.wonValue];

  function exportExcel() {
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows.map(cells)].map((r) => r.map(esc).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `performance_${from}_to_${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const total = (k: keyof Row) => rows.reduce((s, r) => s + Number(r[k]), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Reports</p>
          <h1 className="mt-2 text-3xl font-semibold">Team performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">{from} to {to}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2 print:hidden">
          <label className="text-xs text-muted-foreground">From<Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="text-xs text-muted-foreground">To<Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          <Button variant="outline" onClick={exportExcel} disabled={!rows.length}>Export to Excel</Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!rows.length}>Save as PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Hours worked", String(Math.round(total("hours")))], ["Jobs completed", String(total("jobsDone"))], ["Tasks done", String(total("tasksDone"))], ["Sales won", naira(total("wonValue"))]].map(([l, v]) => (
          <div key={l} className="rounded-xl border bg-card p-4"><p className="kicker">{l}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left">{headers.map((h) => <th key={h} className="kicker p-3 font-normal">{h}</th>)}</tr></thead>
          <tbody>
            {report.isLoading && <tr><td className="p-3 text-muted-foreground" colSpan={9}>Loading…</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3">{r.hours}</td><td className="p-3">{r.days}</td>
                <td className="p-3">{r.jobsDone}</td><td className="p-3">{r.jobsOpen}</td>
                <td className="p-3">{r.tasksDone}</td>
                <td className={`p-3 ${r.tasksLate ? "text-destructive" : ""}`}>{r.tasksLate}</td>
                <td className="p-3">{r.won}</td><td className="p-3">{naira(r.wonValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
