import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { LayoutDashboard, ListChecks, HardHat, Users, Megaphone, ShieldCheck, LogOut, Handshake, BarChart3, Wallet, WifiOff, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe, ROLE_LABEL } from "@/lib/me";
import { useOutbox, useAutoSync, flushOutbox } from "@/lib/offline";
import { Button } from "@/components/ui/button";

function SyncBar() {
  const qc = useQueryClient();
  const { items, offline } = useOutbox();
  const onSynced = useCallback((n: number) => {
    toast.success(`${n} saved update${n > 1 ? "s" : ""} sent`);
    qc.invalidateQueries({ queryKey: ["job"] });
    qc.invalidateQueries({ queryKey: ["job-log"] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }, [qc]);
  useAutoSync(onSynced);
  if (!offline && items.length === 0) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
      <span className="flex items-center gap-2">
        {offline && <WifiOff className="size-3.5" />}
        {offline ? "You're offline. Job notes, photos and progress are saved on this phone." : "Sending saved updates…"}
        {items.length > 0 && ` ${items.length} waiting.`}
      </span>
      {!offline && items.length > 0 && (
        <Button size="sm" variant="ghost" className="h-6" onClick={() => flushOutbox().then((n) => n && onSynced(n))}><RefreshCw className="size-3" /> Sync now</Button>
      )}
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

function Shell() {
  const me = useMe();
  const qc = useQueryClient();
  const nav = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  if (me.isLoading) return <div className="p-10 kicker">Loading workspace…</div>;
  if (me.error || !me.data) return <div className="p-10">Could not load your account. <Button variant="link" onClick={signOut}>Sign out</Button></div>;

  const { profile, roles, isStaff, isAdmin } = me.data;

  if (profile.status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-xl border bg-card p-8 text-center">
          <p className="kicker">Account {profile.status}</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {profile.status === "pending" ? "Waiting for approval" : "Access suspended"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {profile.status === "pending"
              ? "An admin needs to approve your account before you can start work. You'll get access as soon as they do."
              : "Your access has been paused. Please contact your manager."}
          </p>
          <Button variant="outline" className="mt-6" onClick={signOut}>Sign out</Button>
        </div>
      </div>
    );
  }

  const { isAuditor, isFinance } = me.data;
  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { to: "/tasks", label: "Tasks", icon: ListChecks, show: true },
    { to: "/jobs", label: "Jobs & sites", icon: HardHat, show: true },
    { to: "/sales", label: "Customers & sales", icon: Handshake, show: true },
    { to: "/finance", label: "Finance", icon: Wallet, show: isFinance || isAuditor },
    { to: "/announcements", label: "Announcements", icon: Megaphone, show: true },
    { to: "/team", label: "Team", icon: Users, show: isStaff || isAuditor },
    { to: "/reports", label: "Reports", icon: BarChart3, show: isStaff || isAuditor },
    { to: "/compliance", label: "Compliance", icon: ShieldCheck, show: isAdmin || isAuditor },
  ] as const;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="border-b bg-sidebar md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block md:p-6">
          <div>
            <p className="font-mono text-xs tracking-[0.25em] text-primary">NEXTGEN MATRIX</p>
            <p className="mt-1 text-xs text-muted-foreground">Workforce</p>
          </div>
          <Button size="icon" variant="ghost" className="md:hidden" onClick={signOut} aria-label="Sign out"><LogOut /></Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:px-3">
          {links.filter((l) => l.show).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground" }}
            >
              <l.icon className="size-4" /> {l.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 hidden w-[240px] border-t p-4 md:block">
          <p className="truncate text-sm font-medium">{profile.full_name}</p>
          <p className="text-xs text-muted-foreground">{roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
          <Button size="sm" variant="ghost" className="mt-2 px-0" onClick={signOut}><LogOut className="size-4" /> Sign out</Button>
        </div>
      </aside>
      <main className="p-4 md:p-10">
        <SyncBar />
        {isAuditor && <p className="mb-4 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">Auditor view — you can see everything but can't change anything.</p>}
        <Outlet />
      </main>
    </div>
  );
}
