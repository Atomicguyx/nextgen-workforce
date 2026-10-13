import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Me = { userId: string; name: string; canComment: boolean; isStaff: boolean };

export function TaskComments({ taskId, me }: { taskId: string; me: Me }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const list = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: async () => {
      const { data, error } = await supabase.from("task_comments").select("*").eq("task_id", taskId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    const { error } = await supabase.from("task_comments").insert({ task_id: taskId, author_id: me.userId, author_name: me.name, body });
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("task_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["task-comments", taskId] });
  }

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      {list.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {list.data?.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      {list.data?.map((c) => (
        <div key={c.id} className="rounded-md bg-muted/50 px-2 py-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{c.author_name || "Someone"}</span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {new Date(c.created_at).toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}
              {(c.author_id === me.userId || me.isStaff) && (
                <button type="button" className="ml-2 text-destructive hover:underline" onClick={() => remove(c.id)}>delete</button>
              )}
            </span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words">{c.body}</p>
        </div>
      ))}
      {me.canComment && (
        <form onSubmit={send} className="flex gap-2">
          <Input className="h-8 text-xs" placeholder="Write a comment…" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
          <Button type="submit" size="sm" className="h-8" disabled={!text.trim()}>Send</Button>
        </form>
      )}
    </div>
  );
}
