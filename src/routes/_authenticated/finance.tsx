import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/csv";

type Status = Database["public"]["Enums"]["invoice_status"];
type Invoice = Database["public"]["Tables"]["invoices"]["Row"];

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance — NextGen Matrix Workforce" }, { name: "description", content: "Invoices, payments received and money outstanding." }] }),
  component: Finance,
});

const naira = (n: number) => "₦" + Math.round(n).toLocaleString("en-NG");
const LABEL: Record<Status, string> = { draft: "Draft", sent: "Sent", part_paid: "Part paid", paid: "Paid", cancelled: "Cancelled" };
const today = () => new Date().toISOString().slice(0, 10);
const isOverdue = (i: Invoice) => i.due_date && i.due_date < today() && (i.status === "sent" || i.status === "part_paid");

function Finance() {
  const me = useMe().data!;
  const canEdit = me.isFinance && !me.isAuditor;
  const qc = useQueryClient();
  const [f, setF] = useState({ customer_name: "", customer_phone: "", description: "", amount: "", due_date: "" });
  const [filter, setFilter] = useState<"all" | "open" | "overdue" | "paid">("open");

  const inv = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await supabase.from("invoices").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const all = inv.data ?? [];
  const live = all.filter((i) => i.status !== "cancelled" && i.status !== "draft");
  const billed = live.reduce((s, i) => s + Number(i.amount_ngn), 0);
  const received = live.reduce((s, i) => s + Number(i.paid_ngn), 0);
  const overdue = all.filter(isOverdue);
  const month = today().slice(0, 7);
  const thisMonth = all.filter((i) => i.paid_at?.startsWith(month)).reduce((s, i) => s + Number(i.paid_ngn), 0);

  const shown = all.filter((i) =>
    filter === "all" ? true : filter === "paid" ? i.status === "paid" : filter === "overdue" ? isOverdue(i) : ["draft", "sent", "part_paid"].includes(i.status),
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(f.amount);
    if (!(amount > 0)) { toast.error("Enter an amount"); return; }
    const { error } = await supabase.from("invoices").insert({
      customer_name: f.customer_name, customer_phone: f.customer_phone || null, description: f.description || null,
      amount_ngn: amount, due_date: f.due_date || null, created_by: me.user.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice created");
    setF({ customer_name: "", customer_phone: "", description: "", amount: "", due_date: "" });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  async function update(i: Invoice, patch: Partial<Invoice>) {
    const { error } = await supabase.from("invoices").update(patch).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["invoices"] });
  }

  function recordPayment(i: Invoice) {
    const left = Number(i.amount_ngn) - Number(i.paid_ngn);
    const v = window.prompt(`Amount received for ${i.number} (₦, up to ${left.toLocaleString()})`, String(left));
    const n = Number(v);
    if (!v || !(n > 0)) return;
    const paid = Math.min(Number(i.amount_ngn), Number(i.paid_ngn) + n);
    update(i, { paid_ngn: paid, status: paid >= Number(i.amount_ngn) ? "paid" : "part_paid", paid_at: new Date().toISOString() });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">Money</p>
        <h1 className="mt-2 text-3xl font-semibold">Finance</h1>
      </div>
      <div>
        <Button variant="outline" disabled={!all.length} onClick={() => downloadCsv(`invoices_${today()}.csv`, all.map((i) => ({ Number: i.number, Customer: i.customer_name, Phone: i.customer_phone, Email: i.customer_email, Description: i.description, "Amount (NGN)": i.amount_ngn, "Paid (NGN)": i.paid_ngn, "Balance (NGN)": Number(i.amount_ngn) - Number(i.paid_ngn), Status: i.status, "Issue date": i.issue_date, "Due date": i.due_date, "Paid on": i.paid_at })))}>Export invoices to Excel</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[["Billed", naira(billed)], ["Received", naira(received)], ["Outstanding", naira(billed - received)], ["Received this month", naira(thisMonth)]].map(([k, v]) => (
          <div key={k} className="rounded-xl border bg-card p-5"><p className="kicker">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>
        ))}
      </div>
      {overdue.length > 0 && <p className="text-sm text-destructive">{overdue.length} invoice{overdue.length > 1 ? "s are" : " is"} past due.</p>}

      {canEdit && (
        <form onSubmit={create} className="grid gap-3 rounded-xl border bg-card p-6 md:grid-cols-6">
          <Input className="md:col-span-2" placeholder="Customer name" value={f.customer_name} onChange={(e) => setF({ ...f, customer_name: e.target.value })} required />
          <Input placeholder="Phone" value={f.customer_phone} onChange={(e) => setF({ ...f, customer_phone: e.target.value })} />
          <Input type="number" min="1" placeholder="Amount ₦" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required />
          <Input type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} aria-label="Due date" />
          <Button type="submit">New invoice</Button>
          <Input className="md:col-span-6" placeholder="What it's for (e.g. 5kVA solar install, Lekki)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </form>
      )}

      <div className="flex gap-2">
        {(["open", "overdue", "paid", "all"] as const).map((k) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{k.charAt(0).toUpperCase() + k.slice(1)}</Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="kicker text-left"><tr className="border-b"><th className="p-4">Invoice</th><th className="p-4">Customer</th><th className="p-4">Amount</th><th className="p-4">Paid</th><th className="p-4">Due</th><th className="p-4">Status</th>{canEdit && <th className="p-4" />}</tr></thead>
          <tbody>
            {shown.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="p-4 font-mono text-xs">{i.number}</td>
                <td className="p-4"><p className="font-medium">{i.customer_name}</p><p className="text-xs text-muted-foreground">{i.description}</p></td>
                <td className="p-4">{naira(Number(i.amount_ngn))}</td>
                <td className="p-4">{naira(Number(i.paid_ngn))}</td>
                <td className={`p-4 font-mono text-xs ${isOverdue(i) ? "text-destructive" : ""}`}>{i.due_date ?? "—"}</td>
                <td className="p-4"><Badge variant={i.status === "paid" ? "default" : i.status === "cancelled" ? "destructive" : "secondary"}>{LABEL[i.status]}</Badge></td>
                {canEdit && (
                  <td className="space-x-2 whitespace-nowrap p-4">
                    {i.status === "draft" && <Button size="sm" variant="outline" onClick={() => update(i, { status: "sent" })}>Mark sent</Button>}
                    {(i.status === "sent" || i.status === "part_paid") && <Button size="sm" onClick={() => recordPayment(i)}>Record payment</Button>}
                    {i.status !== "paid" && i.status !== "cancelled" && <Button size="sm" variant="ghost" onClick={() => update(i, { status: "cancelled" })}>Cancel</Button>}
                  </td>
                )}
              </tr>
            ))}
            {shown.length === 0 && <tr><td className="p-6 text-muted-foreground" colSpan={7}>No invoices here.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
