import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const ROLE_LABEL: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
  finance: "Finance",
  hr: "HR / Compliance",
  agent: "Agent",
  auditor: "Auditor (read-only)",
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const meta = (u.user.user_metadata ?? {}) as { full_name?: string };
      await supabase.rpc("bootstrap_profile", { _full_name: meta.full_name ?? "" });
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", u.user.id),
      ]);
      const r = (roles ?? []).map((x) => x.role as AppRole);
      const isAdmin = r.includes("super_admin") || r.includes("admin");
      const isStaff = isAdmin || r.includes("manager") || r.includes("hr");
      const isAuditor = r.includes("auditor");
      const isFinance = isAdmin || r.includes("finance");
      return { user: u.user, profile: profile as Profile, roles: r, isAdmin, isStaff, isAuditor, isFinance };
    },
  });
}
