import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  JOB_STATUSES,
  JOB_STATUS_LABEL,
  SERVICES,
  SERVICE_LABEL,
  OPEN_STATUSES,
  statusTone,
  fmtDay,
  type JobStatus,
  type JobService,
} from "@/lib/jobs";

export const Route = createFileRoute("/_authenticated/jobs/")({
  head: () => ({ meta: [{ title: "Jobs & Sites — NextGen Matrix Workforce" }] }),
  component: Jobs,
});

const EMPTY = {
  title: "",
  customer_name: "",
  site_address: "",
  city: "",
  state: "",
  customer_phone: "",
  service: "solar_install" as JobService,
  scheduled_date: "",
  scheduled_time: "",
  assigned_to: "",
  notes: "",
};

function Jobs() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [search, setSearch] = useState("");

  const jobs = useQuery({
    queryKey: ["jobs", "all"],
    queryFn: async () =>
      (await supabase.from("jobs").select("*").order("scheduled_date", { ascending: true }).order("created_at", { ascending: false }))
        .data ?? [],
  });
  const people = useQuery({
    queryKey: ["people", "active"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name")).data ?? [],
  });

  const nameOf = (id: string | null) =>
    people.data?.find((p) => p.id === id)?.full_name ?? (id === me.user.id ? "You" : "Unassigned");

  const shown = (jobs.data ?? []).filter((j) => {
    if (statusFilter === "open" && !OPEN_STATUSES.includes(j.status)) return false;
    if (statusFilter !== "open" && statusFilter !== "all" && j.status !== statusFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [j.title, j.customer_name, j.site_address, j.city, j.state, j.code].some((v) =>
      (v ?? "").toLowerCase().includes(q),
    );
  });

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("jobs").insert({
      title: form.title,
      customer_name: form.customer_name,
      site_address: form.site_address,
      city: form.city || null,
      state: form.state || null,
      customer_phone: form.customer_phone || null,
      service: form.service,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      assigned_to: form.assigned_to || null,
      notes: form.notes || null,
      created_by: me.user.id,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Job added");
    setForm(EMPTY);
    setShowForm(false);
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Field operations</p>
          <h1 className="mt-2 text-3xl font-semibold">Jobs &amp; sites</h1>
        </div>
        {me.isStaff && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" /> {showForm ? "Close" : "New job"}
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={create} className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-3">
          <Input placeholder="Job title (e.g. 5kVA inverter + 2 panels)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="md:col-span-2" />
          <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v as JobService })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{SERVICES.map((s) => <SelectItem key={s} value={s}>{SERVICE_LABEL[s]}</SelectItem>)}</SelectContent>
          </Select>

          <Input placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
          <Input placeholder="Phone (e.g. 0803...)" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />

          <Input placeholder="Site address / estate" value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} required className="md:col-span-2" />
          <Input placeholder="Time of day (e.g. 9am–12pm)" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />

          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
          {me.isStaff ? (
            <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
              <SelectTrigger><SelectValue placeholder="Assign to…" /></SelectTrigger>
              <SelectContent>{(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <div />
          )}

          <Textarea placeholder="Access notes, contact on arrival, what to bring…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="md:col-span-3" />
          <Button type="submit" disabled={busy} className="md:col-span-3">{busy ? "Saving…" : "Add job"}</Button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search customer, site, job number…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open jobs</SelectItem>
            <SelectItem value="all">All jobs</SelectItem>
            {JOB_STATUSES.map((s) => <SelectItem key={s} value={s}>{JOB_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="font-mono text-xs text-muted-foreground">{shown.length} shown</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {shown.map((j) => (
          <Link
            key={j.id}
            to="/jobs/$jobId"
            params={{ jobId: j.id }}
            className="rounded-xl border bg-card p-5 transition-colors hover:bg-card/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] text-muted-foreground">JOB {j.code}</p>
                <p className="mt-1 font-medium">{j.title}</p>
                <p className="text-sm text-muted-foreground">{j.customer_name}</p>
              </div>
              <Badge variant={statusTone(j.status)}>{JOB_STATUS_LABEL[j.status]}</Badge>
            </div>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><MapPin className="size-3.5 shrink-0" /> {j.site_address}{j.city ? `, ${j.city}` : ""}{j.state ? `, ${j.state}` : ""}</p>
              {j.customer_phone && <p className="flex items-center gap-2"><Phone className="size-3.5 shrink-0" /> {j.customer_phone}</p>}
            </div>
            <div className="mt-4 flex items-center justify-between border-t pt-3 font-mono text-[11px] text-muted-foreground">
              <span>{SERVICE_LABEL[j.service]}</span>
              <span>{nameOf(j.assigned_to)} · {fmtDay(j.scheduled_date)}{j.scheduled_time ? ` · ${j.scheduled_time}` : ""}</span>
            </div>
          </Link>
        ))}
        {shown.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground lg:col-span-2">
            {me.isStaff ? "No jobs here yet. Add one with “New job”." : "No jobs assigned to you yet."}
          </p>
        )}
      </div>
    </div>
  );
}
