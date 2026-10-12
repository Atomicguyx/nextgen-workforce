import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ROLE_LABEL, type AppRole } from "@/lib/me";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Status = Database["public"]["Enums"]["agent_status"];
const ROLES = Object.keys(ROLE_LABEL) as AppRole[];

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — NextGen Matrix Workforce" }] }),
  component: Team,
});

function Team() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("agent");

  const people = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: p }, { data: r }, { data: a }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("attendance").select("user_id").is("clock_out", null),
      ]);
      const online = new Set((a ?? []).map((x) => x.user_id));
      return (p ?? []).map((x) => ({ ...x, role: (r ?? []).find((y) => y.user_id === x.id)?.role as AppRole, online: online.has(x.id) }));
    },
  });
  const invites = useQuery({
    enabled: me.isAdmin,
    queryKey: ["invites"],
    queryFn: async () => (await supabase.from("invites").select("*").is("used_at", null).order("created_at", { ascending: false })).data ?? [],
  });

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("invites").insert({ email: email.toLowerCase().trim(), role, invited_by: me.user.id });
    if (error) { toast.error(error.message); return; }
    await supabase.rpc("log_action", { _action: "invite_created", _target: email });
    toast.success(`Invite saved. Ask ${email} to create an account at this app's sign-in page.`);
    setEmail("");
    qc.invalidateQueries({ queryKey: ["invites"] });
  }

  async function setAccess(id: string, status: Status, r: AppRole) {
    const { error } = await supabase.rpc("set_member_access", { _user_id: id, _status: status, _role: r });
    if (error) { toast.error(error.message); return; }
    toast.success("Access updated");
    qc.invalidateQueries({ queryKey: ["team"] });
  }

  const assignable = ROLES.filter((r) => r !== "super_admin" || me.roles.includes("super_admin"));

  return (
    <div className="space-y-8">
      <div>
        <p className="kicker">People</p>
        <h1 className="mt-2 text-3xl font-semibold">Team</h1>
      </div>

      {me.isAdmin && (
        <form onSubmit={invite} className="flex flex-col gap-3 rounded-xl border bg-card p-6 md:flex-row">
          <Input type="email" placeholder="agent@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger className="md:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>{assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="submit">Invite</Button>
        </form>
      )}
      {invites.data && invites.data.length > 0 && (
        <p className="text-xs text-muted-foreground">Pending invites: {invites.data.map((i) => `${i.email} (${ROLE_LABEL[i.role]})`).join(", ")}</p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="kicker text-left">
            <tr className="border-b"><th className="p-4">Name</th><th className="p-4">Status</th><th className="p-4">Role</th><th className="p-4">Shift</th>{me.isAdmin && <th className="p-4">Actions</th>}</tr>
          </thead>
          <tbody>
            {(people.data ?? []).map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="p-4"><p className="font-medium">{p.full_name}</p><p className="text-xs text-muted-foreground">{p.email}</p></td>
                <td className="p-4"><Badge variant={p.status === "active" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>{p.status}</Badge></td>
                <td className="p-4">
                  {me.isAdmin && p.id !== me.user.id ? (
                    <Select value={p.role} onValueChange={(v) => setAccess(p.id, p.status, v as AppRole)}>
                      <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>{assignable.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : ROLE_LABEL[p.role]}
                </td>
                <td className="p-4 font-mono text-xs">{p.online ? <span className="text-success">● on shift</span> : <span className="text-muted-foreground">off</span>}</td>
                {me.isAdmin && (
                  <td className="p-4">
                    {p.id === me.user.id ? <span className="text-xs text-muted-foreground">you</span> : p.status === "active" ? (
                      <Button size="sm" variant="outline" onClick={() => setAccess(p.id, "suspended", p.role)}>Suspend</Button>
                    ) : (
                      <Button size="sm" onClick={() => setAccess(p.id, "active", p.role)}>{p.status === "pending" ? "Approve" : "Reactivate"}</Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
