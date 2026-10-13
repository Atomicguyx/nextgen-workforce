import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadBlob, fetchAll } from "@/lib/csv";
import { Button } from "@/components/ui/button";

// Photos are left out on purpose (they are large); everything else is included.
const TABLES: [string, string][] = [
  ["profiles", "*"], ["user_roles", "*"], ["invites", "*"], ["announcements", "*"],
  ["attendance", "*"], ["tasks", "*"], ["task_comments", "*"], ["jobs", "*"],
  ["job_updates", "author_id,body,created_at,id,job_id,status"], ["leads", "*"], ["invoices", "*"], ["audit_logs", "*"],
];

export function BackupButton() {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const data: Record<string, unknown> = { exported_at: new Date().toISOString() };
      for (const [table, cols] of TABLES) data[table] = await fetchAll(supabase, table, cols);
      downloadBlob(`nextgen-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json");
      toast.success("Backup downloaded. Keep the file somewhere safe.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBusy(false);
    }
  }
  return <Button variant="outline" onClick={run} disabled={busy}>{busy ? "Preparing backup…" : "Download full backup"}</Button>;
}
