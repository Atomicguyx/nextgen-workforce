import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, CheckCircle2, MapPin, Phone, Mail, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/me";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  JOB_STATUS_LABEL,
  SERVICE_LABEL,
  statusTone,
  photoSrc,
  shrinkImage,
  fmtDay,
  fmtTime,
  type JobStatus,
} from "@/lib/jobs";
import { enqueue, isOffline } from "@/lib/offline";

export const Route = createFileRoute("/_authenticated/jobs/$jobId")({
  head: () => ({ meta: [{ title: "Job detail — NextGen Matrix Workforce" }] }),
  component: JobDetail,
});

const ADVANCE: JobStatus[] = ["en_route", "on_site", "blocked", "completed"];

function JobDetail() {
  const { jobId } = Route.useParams();
  const me = useMe().data!;
  const qc = useQueryClient();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sign, setSign] = useState({ name: "", note: "" });

  const job = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => (await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle()).data,
  });
  const log = useQuery({
    queryKey: ["job-log", jobId],
    queryFn: async () =>
      (await supabase.from("job_updates").select("*").eq("job_id", jobId).order("created_at", { ascending: false })).data ?? [],
  });
  const people = useQuery({
    queryKey: ["people", "active"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name").eq("status", "active").order("full_name")).data ?? [],
  });

  const j = job.data;
  const authorName = (id: string) =>
    people.data?.find((p) => p.id === id)?.full_name ?? (id === me.user.id ? "You" : "Someone");

  async function refresh() {
    qc.invalidateQueries({ queryKey: ["job", jobId] });
    qc.invalidateQueries({ queryKey: ["job-log", jobId] });
    qc.invalidateQueries({ queryKey: ["jobs"] });
  }

  async function setStatus(status: JobStatus) {
    if (isOffline()) {
      enqueue({ kind: "status", jobId, authorId: me.user.id, status, body: `Marked ${JOB_STATUS_LABEL[status].toLowerCase()}` });
      qc.setQueryData(["job", jobId], (old: typeof j) => (old ? { ...old, status } : old));
      toast.success("Saved on this phone — will send when you're back online");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.from("job_updates").insert({
      job_id: jobId,
      author_id: me.user.id,
      status,
      body: `Marked ${JOB_STATUS_LABEL[status].toLowerCase()}`,
    });
    setBusy(false);
    toast.success(`Marked ${JOB_STATUS_LABEL[status].toLowerCase()}`);
    refresh();
  }

  async function addUpdate(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!note.trim() && !file) {
      toast.error("Write a note or attach a photo first");
      return;
    }
    setBusy(true);

    let photoData: string | null = null;
    let photoMime: string | null = null;
    if (file) {
      try {
        photoData = await shrinkImage(file);
        photoMime = "image/jpeg";
      } catch (err) {
        setBusy(false);
        toast.error(err instanceof Error ? err.message : "Photo couldn't be prepared");
        return;
      }
    }

    if (isOffline()) {
      try {
        enqueue({ kind: "update", jobId, authorId: me.user.id, body: note.trim() || null, photoData });
      } catch (err) {
        setBusy(false);
        toast.error(err instanceof Error ? err.message : "Couldn't save offline");
        return;
      }
      setBusy(false);
      setNote("");
      if (fileRef.current) fileRef.current.value = "";
      toast.success("Saved on this phone — will send when you're back online");
      return;
    }

    const { error } = await supabase.from("job_updates").insert({
      job_id: jobId,
      author_id: me.user.id,
      body: note.trim() || null,
      photo_data: photoData,
      photo_mime: photoMime,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote("");
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Logged");
    refresh();
  }

  async function signOff(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const at = new Date().toISOString();
    const { error } = await supabase
      .from("jobs")
      .update({ status: "signed_off", signoff_name: sign.name, signoff_note: sign.note || null, signoff_at: at })
      .eq("id", jobId);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await supabase.from("job_updates").insert({
      job_id: jobId,
      author_id: me.user.id,
      status: "signed_off",
      body: `Customer sign-off: ${sign.name}`,
    });
    setBusy(false);
    toast.success("Signed off");
    refresh();
  }

  async function removeUpdate(id: string) {
    const { error } = await supabase.from("job_updates").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  }

  if (job.isLoading) return <p className="p-4 kicker">Loading job…</p>;
  if (!j)
    return (
      <div className="p-4">
        <p className="text-sm">This job isn’t visible to you, or it was removed.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to="/jobs">Back to jobs</Link>
        </Button>
      </div>
    );

  const assignedName =
    people.data?.find((p) => p.id === j.assigned_to)?.full_name ?? (j.assigned_to === me.user.id ? "Assigned to you" : "Unassigned");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => nav({ to: "/jobs" })}>
          <ArrowLeft className="size-4" /> Jobs
        </Button>
        <Badge variant={statusTone(j.status)}>{JOB_STATUS_LABEL[j.status]}</Badge>
      </div>

      <div>
        <p className="font-mono text-xs text-muted-foreground">
          JOB {j.code} · {SERVICE_LABEL[j.service]}
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{j.title}</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border bg-card p-6">
          <p className="kicker">Customer</p>
          <p className="mt-3 font-medium">{j.customer_name}</p>
          <div className="mt-3 space-y-2 text-sm">
            {j.customer_phone && (
              <a href={`tel:${j.customer_phone}`} className="flex items-center gap-2 text-primary">
                <Phone className="size-3.5" /> {j.customer_phone}
              </a>
            )}
            {j.customer_email && (
              <a href={`mailto:${j.customer_email}`} className="flex items-center gap-2 text-primary">
                <Mail className="size-3.5" /> {j.customer_email}
              </a>
            )}
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0" /> {j.site_address}
              {j.city ? `, ${j.city}` : ""}
              {j.state ? `, ${j.state}` : ""}
            </p>
          </div>
          <Separator className="my-4" />
          <p className="font-mono text-xs text-muted-foreground">
            {fmtDay(j.scheduled_date)}
            {j.scheduled_time ? ` · ${j.scheduled_time}` : ""}
          </p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{assignedName}</p>
          {me.isStaff && (
            <Select
              value={j.assigned_to ?? "none"}
              onValueChange={(v) =>
                supabase
                  .from("jobs")
                  .update({ assigned_to: v === "none" ? null : v })
                  .eq("id", jobId)
                  .then(() => refresh())
              }
            >
              <SelectTrigger className="mt-4 h-8 text-xs">
                <SelectValue placeholder="Reassign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {(people.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </section>

        <section className="rounded-xl border bg-card p-6 lg:col-span-2">
          <p className="kicker">On-site progress</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {ADVANCE.map((s) => (
              <Button key={s} size="sm" variant={j.status === s ? "default" : "outline"} disabled={busy} onClick={() => setStatus(s)}>
                {JOB_STATUS_LABEL[s]}
              </Button>
            ))}
          </div>
          {j.notes && <p className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">{j.notes}</p>}
          {j.parts_used && (
            <p className="mt-3 text-sm">
              <span className="kicker">Parts used</span>
              <br />
              {j.parts_used}
            </p>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <p className="kicker">Customer sign-off</p>
        {j.signoff_at ? (
          <div className="mt-3 flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{j.signoff_name} confirmed the work</p>
              <p className="font-mono text-xs text-muted-foreground">{fmtTime(j.signoff_at)}</p>
              {j.signoff_note && <p className="mt-2 text-sm text-muted-foreground">{j.signoff_note}</p>}
            </div>
          </div>
        ) : (
          <form onSubmit={signOff} className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Customer name on site"
              value={sign.name}
              onChange={(e) => setSign({ ...sign, name: e.target.value })}
              required
            />
            <Input placeholder="Anything the customer said (optional)" value={sign.note} onChange={(e) => setSign({ ...sign, note: e.target.value })} />
            <Button type="submit" disabled={busy}>
              <LogIn className="size-4" /> Record sign-off
            </Button>
          </form>
        )}
      </section>

      <section className="rounded-xl border bg-card p-6">
        <p className="kicker">Site log</p>
        <form onSubmit={addUpdate} className="mt-3 space-y-3">
          <Textarea
            placeholder="What happened on site? Access, meter readings, faults found, what's pending…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
              <Camera className="size-4" /> Add photo
              <input ref={fileRef} type="file" accept="image/*" className="hidden" />
            </label>
            <Button type="submit" disabled={busy} size="sm">
              {busy ? "Saving…" : "Log it"}
            </Button>
          </div>
        </form>

        <ul className="mt-6 space-y-4">
          {(log.data ?? []).map((u) => {
            const src = photoSrc(u);
            return (
              <li key={u.id} className="flex gap-3 border-t pt-4">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {authorName(u.author_id)} · {fmtTime(u.created_at)}
                    {u.status ? ` · ${JOB_STATUS_LABEL[u.status]}` : ""}
                  </p>
                  {u.body && <p className="mt-1 text-sm">{u.body}</p>}
                  {src && (
                    <a href={src} target="_blank" rel="noreferrer" className="mt-2 inline-block">
                      <img src={src} alt="Site photo" className="h-40 rounded-lg border object-cover" loading="lazy" />
                    </a>
                  )}
                </div>
                {(u.author_id === me.user.id || me.isStaff) && (
                  <button onClick={() => removeUpdate(u.id)} className="text-xs text-muted-foreground hover:text-destructive">
                    Remove
                  </button>
                )}
              </li>
            );
          })}
          {log.data?.length === 0 && <li className="pt-4 text-sm text-muted-foreground">Nothing logged yet.</li>}
        </ul>
      </section>
    </div>
  );
}
