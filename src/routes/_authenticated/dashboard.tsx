import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — NextGen Matrix Workforce" }] }),
  component: Dashboard,
});

function fmtDur(ms: number) {
  const m = Math.floor(ms / 60000);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function Dashboard() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const uid = me.user.id;

  const shift = useQuery({
    queryKey: ["shift", uid],
    queryFn: async () => {
      const since = new Date(); since.setHours(0, 0, 0, 0);
      const { data } = await supabase.from("attendance").select("*").eq("user_id", uid)
        .gte("clock_in", since.toISOString()).order("clock_in", { ascending: false });
      return data ?? [];
    },
  });
  const myTasks = useQuery({
    queryKey: ["tasks", "mine"],
    queryFn: async () => (await supabase.from("tasks").select("*").eq("assignee_id", uid).neq("status", "done").order("due_date")).data ?? [],
  });
  const news = useQuery({
    queryKey: ["announcements", "latest"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(3)).data ?? [],
  });
  const overview = useQuery({
    enabled: me.isStaff,
    queryKey: ["overview"],
    queryFn: async () => {
      const [online, pending, open, overdue, jobs] = await Promise.all([
        supabase.from("attendance").select("id", { count: "exact", head: true }).is("clock_out", null),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done"),
        supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "done").lt("due_date", new Date().toISOString().slice(0, 10)),
        supabase.from("jobs").select("id", { count: "exact", head: true }).neq("status", "signed_off").neq("status", "cancelled"),
      ]);
      return { online: online.count ?? 0, pending: pending.count ?? 0, open: open.count ?? 0, overdue: overdue.count ?? 0, jobs: jobs.count ?? 0 };
    },
  });

  const open = shift.data?.find((s) => !s.clock_out);
  const worked = (shift.data ?? []).reduce((t, s) => t + (new Date(s.clock_out ?? Date.now()).getTime() - new Date(s.clock_in).getTime()), 0);

  async function toggleClock() {
    const { error } = open
      ? await supabase.from("attendance").update({ clock_out: new Date().toISOString() }).eq("id", open.id)
      : await supabase.from("attendance").insert({ user_id: uid });
    if (error) { toast.error(error.message); return; }
    toast.success(open ? "Clocked out" : "Clocked in");
    qc.invalidateQueries({ queryKey: ["shift"] });
    qc.invalidateQueries({ queryKey: ["overview"] });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">{new Date().toDateString()}</p>
        <h1 className="mt-2 text-3xl font-semibold">Hello, {me.profile.full_name.split(" ")[0]}</h1>
      </div>

      {me.isStaff && overview.data && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {[
            ["Agents on shift", overview.data.online],
            ["Open jobs", overview.data.jobs],
            ["Awaiting approval", overview.data.pending],
            ["Open tasks", overview.data.open],
            ["Overdue tasks", overview.data.overdue],
          ].map(([l, v]) => (
            <div key={l} className="rounded-lg border bg-card p-4">
              <p className="kicker">{l}</p>
              <p className="mt-2 font-mono text-3xl">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`rounded-xl border bg-card p-6 ${open ? "glow" : ""}`}>
          <p className="kicker">Time clock</p>
          <p className="mt-3 font-mono text-4xl">{fmtDur(worked)}</p>
          <p className="text-sm text-muted-foreground">worked today</p>
          <Badge variant={open ? "default" : "secondary"} className="mt-4">{open ? `On shift since ${new Date(open.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Off shift"}</Badge>
          <Button className="mt-6 w-full" size="lg" variant={open ? "outline" : "default"} onClick={toggleClock}>
            {open ? "Clock out" : "Clock in"}
          </Button>
        </section>

        <section className="rounded-xl border bg-card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="kicker">My open tasks</p>
            <Link to="/tasks" className="text-xs text-primary">View all</Link>
          </div>
          <ul className="mt-4 divide-y">
            {(myTasks.data ?? []).slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                <span>{t.title}</span>
                <span className="font-mono text-xs text-muted-foreground">{t.due_date ?? "no due date"} · {t.priority}</span>
              </li>
            ))}
            {myTasks.data?.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nothing assigned. Enjoy the calm.</li>}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <p className="kicker">Latest announcements</p>
        <div className="mt-4 space-y-4">
          {(news.data ?? []).map((a) => (
            <article key={a.id}>
              <h3 className="font-medium">{a.title}</h3>
              <p className="text-sm text-muted-foreground">{a.body}</p>
            </article>
          ))}
          {news.data?.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
        </div>
      </section>
    </div>
  );
}
