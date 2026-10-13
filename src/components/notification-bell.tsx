import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    refetchInterval: 30000, // checks for new alerts every 30 seconds
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });
  const unread = (list.data ?? []).filter((n) => !n.read).length;

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">{unread > 9 ? "9+" : unread}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && <button type="button" className="text-xs text-primary hover:underline" onClick={markAllRead}>Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {(list.data ?? []).length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing yet.</p>}
          {(list.data ?? []).map((n) => (
            <Link key={n.id} to="/tasks" onClick={markAllRead} className={`block border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50 ${n.read ? "text-muted-foreground" : "font-medium"}`}>
              {n.message}
              <span className="mt-0.5 block font-mono text-[10px] font-normal text-muted-foreground">{new Date(n.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</span>
            </Link>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
