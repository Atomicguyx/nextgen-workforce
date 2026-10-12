import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — NextGen Matrix Workforce" }] }),
  component: Announcements,
});

function Announcements() {
  const me = useMe().data!;
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const list = useQuery({
    queryKey: ["announcements", "all"],
    queryFn: async () => (await supabase.from("announcements").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("announcements").insert({ title, body, created_by: me.user.id });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setBody("");
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }
  async function remove(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["announcements"] });
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="kicker">Company news</p>
        <h1 className="mt-2 text-3xl font-semibold">Announcements</h1>
      </div>
      {me.isStaff && (
        <form onSubmit={post} className="space-y-3 rounded-xl border bg-card p-6">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Message to all agents" value={body} onChange={(e) => setBody(e.target.value)} required />
          <Button type="submit">Post announcement</Button>
        </form>
      )}
      <div className="space-y-4">
        {(list.data ?? []).map((a) => (
          <article key={a.id} className="rounded-xl border bg-card p-6">
            <p className="kicker">{new Date(a.created_at).toLocaleString()}</p>
            <h2 className="mt-2 text-lg font-medium">{a.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.body}</p>
            {me.isStaff && <Button size="sm" variant="ghost" className="mt-2 px-0 text-destructive" onClick={() => remove(a.id)}>Delete</Button>}
          </article>
        ))}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing posted yet.</p>}
      </div>
    </div>
  );
}
