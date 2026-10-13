import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

type Stage = Database["public"]["Enums"]["lead_stage"];
type Service = Database["public"]["Enums"]["job_service"];
const STAGES: Stage[] = ["new", "contacted", "quoted", "won", "lost"];
const STAGE_LABEL: Record<Stage, string> = { new: "New enquiry", contacted: "Contacted", quoted: "Quote sent", won: "Won", lost: "Lost" };
const SERVICES: Record<Service, string> = {
  survey: "Site survey", solar_install: "Solar", iot_install: "IoT", security_install: "Security",
  maintenance: "Maintenance", repair: "Repair", other: "Other",
};
export const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Customers & sales — NextGen Matrix Workforce" }, { name: "description", content: "Track enquiries, quotes and won jobs." }] }),
  component: Sales,
});

const empty = { customer_name: "", company: "", phone: "", email: "", city: "", source: "", service: "solar_install" as Service, value_ngn: "", follow_up_date: "", notes: "", owner_id: "" };

function Sales() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const leads = useQuery({
    queryKey: ["leads"],
    queryFn: async () => (await supabase.from("leads").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const people = useQuery({
    queryKey: ["people", "active"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name")).data ?? [],
  });
  const nameOf = (id: string | null) => people.data?.find((p) => p.id === id)?.full_name ?? "Unassigned";
  const today = new Date().toISOString().slice(0, 10);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("leads").insert({
      customer_name: form.customer_name, company: form.company || null, phone: form.phone || null,
      email: form.email || null, city: form.city || null, source: form.source || null, service: form.service,
      value_ngn: Number(form.value_ngn) || 0, follow_up_date: form.follow_up_date || null, notes: form.notes || null,
      owner_id: form.owner_id || me.user.id, created_by: me.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Customer added");
    setForm(empty); setOpen(false);
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  async function update(id: string, patch: Database["public"]["Tables"]["leads"]["Update"]) {
    if (patch.stage) patch.closed_at = patch.stage === "won" || patch.stage === "lost" ? new Date().toISOString() : null;
    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["leads"] });
  }

  const all = (leads.data ?? []).filter((l) => !q || `${l.customer_name} ${l.company ?? ""} ${l.phone ?? ""} ${l.city ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const sum = (s: Stage) => all.filter((l) => l.stage === s).reduce((a, l) => a + Number(l.value_ngn), 0);
  const due = all.filter((l) => l.follow_up_date && l.follow_up_date <= today && l.stage !== "won" && l.stage !== "lost");

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">Sales</p>
          <h1 className="mt-2 text-3xl font-semibold">Customers & sales</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={!all.length} onClick={() => downloadCsv(`customers_${today}.csv`, all.map((l) => ({ Customer: l.customer_name, Company: l.company, Phone: l.phone, Email: l.email, City: l.city, Service: l.service, Stage: l.stage, "Value (NGN)": l.value_ngn, Owner: nameOf(l.owner_id), Source: l.source, "Follow-up": l.follow_up_date, Notes: l.notes, Created: l.created_at, Closed: l.closed_at })))}>Export to Excel</Button>
          <Button onClick={() => setOpen(!open)}>{open ? "Close" : "Add customer"}</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Tile label="In pipeline" value={naira(sum("new") + sum("contacted") + sum("quoted"))} />
        <Tile label="Quotes out" value={naira(sum("quoted"))} />
        <Tile label="Won" value={naira(sum("won"))} />
        <Tile label="Follow-ups due" value={String(due.length)} />
      </div>

      {open && (
        <form onSubmit={create} className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-3">
          <Input placeholder="Customer name" required value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <Input placeholder="Company (optional)" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <Input placeholder="How they found us (referral, Instagram…)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Select value={form.service} onValueChange={(v) => setForm({ ...form, service: v as Service })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(SERVICES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" min="0" placeholder="Estimated value (₦)" value={form.value_ngn} onChange={(e) => setForm({ ...form, value_ngn: e.target.value })} />
          <Input type="date" aria-label="Follow-up date" value={form.follow_up_date} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
          {me.isStaff && (
            <Select value={form.owner_id} onValueChange={(v) => setForm({ ...form, owner_id: v })}>
              <SelectTrigger><SelectValue placeholder="Owner (default: you)" /></SelectTrigger>
              <SelectContent>{(people.data ?? []).map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Textarea placeholder="Notes — what they need, roof size, budget…" className="md:col-span-3" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <Button type="submit" className="md:col-span-3">Save customer</Button>
        </form>
      )}

      <Input placeholder="Search name, company, phone, city…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <div className="grid gap-4 lg:grid-cols-5">
        {STAGES.map((s) => {
          const rows = all.filter((l) => l.stage === s);
          return (
            <div key={s} className="rounded-xl border bg-card/60 p-4">
              <p className="kicker mb-1">{STAGE_LABEL[s]} · {rows.length}</p>
              <p className="mb-3 font-mono text-xs text-muted-foreground">{naira(sum(s))}</p>
              <div className="space-y-3">
                {rows.map((l) => (
                  <div key={l.id} className="rounded-lg border bg-card p-3 text-sm">
                    <p className="font-medium">{l.customer_name}</p>
                    {l.company && <p className="text-xs text-muted-foreground">{l.company}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{SERVICES[l.service]} · {naira(Number(l.value_ngn))}{l.city ? ` · ${l.city}` : ""}</p>
                    {l.phone && <a href={`tel:${l.phone}`} className="block text-xs text-primary">{l.phone}</a>}
                    {l.notes && <p className="mt-1 line-clamp-3 text-xs">{l.notes}</p>}
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">{nameOf(l.owner_id)}</p>
                    {s !== "won" && s !== "lost" && (
                      <label className={`mt-2 block text-[11px] ${l.follow_up_date && l.follow_up_date <= today ? "text-destructive" : "text-muted-foreground"}`}>
                        Follow up
                        <Input type="date" className="mt-1 h-8 text-xs" defaultValue={l.follow_up_date ?? ""} onBlur={(e) => e.target.value !== (l.follow_up_date ?? "") && update(l.id, { follow_up_date: e.target.value || null })} />
                      </label>
                    )}
                    <Select value={l.stage} onValueChange={(v) => update(l.id, { stage: v as Stage })}>
                      <SelectTrigger className="mt-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STAGES.map((x) => <SelectItem key={x} value={x}>{STAGE_LABEL[x]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="kicker">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
