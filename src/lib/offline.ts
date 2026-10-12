import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type JobStatus = Database["public"]["Enums"]["job_status"];
export type OutboxItem =
  | { id: string; kind: "status"; jobId: string; authorId: string; status: JobStatus; body: string; at: string }
  | { id: string; kind: "update"; jobId: string; authorId: string; body: string | null; photoData: string | null; at: string };

const KEY = "nm-outbox-v1";
const listeners = new Set<() => void>();
let cache: OutboxItem[] | null = null;

function read(): OutboxItem[] {
  if (cache) return cache;
  try { cache = JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { cache = []; }
  return cache!;
}
function write(items: OutboxItem[]) {
  cache = items;
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { throw new Error("Phone storage is full — sync before adding more photos"); }
  listeners.forEach((l) => l());
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

type NewItem = OutboxItem extends infer T ? (T extends OutboxItem ? Omit<T, "id" | "at"> : never) : never;
export function enqueue(item: NewItem) {
  write([...read(), { ...item, id: crypto.randomUUID(), at: new Date().toISOString() } as OutboxItem]);
}

let flushing = false;
export async function flushOutbox(): Promise<number> {
  if (flushing || isOffline()) return 0;
  flushing = true;
  let done = 0;
  try {
    for (const item of [...read()]) {
      let error;
      if (item.kind === "status") {
        ({ error } = await supabase.from("jobs").update({ status: item.status }).eq("id", item.jobId));
        if (!error) ({ error } = await supabase.from("job_updates").insert({ job_id: item.jobId, author_id: item.authorId, status: item.status, body: item.body, created_at: item.at }));
      } else {
        ({ error } = await supabase.from("job_updates").insert({
          job_id: item.jobId, author_id: item.authorId, body: item.body,
          photo_data: item.photoData, photo_mime: item.photoData ? "image/jpeg" : null, created_at: item.at,
        }));
      }
      if (error && /fetch|network/i.test(error.message)) break; // still offline, keep it
      write(read().filter((x) => x.id !== item.id)); // sent, or rejected by the server
      if (!error) done++;
    }
  } finally {
    flushing = false;
  }
  return done;
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("online", l);
  window.addEventListener("offline", l);
  return () => { listeners.delete(l); window.removeEventListener("online", l); window.removeEventListener("offline", l); };
}

export function useOutbox() {
  const items = useSyncExternalStore(subscribe, read, () => [] as OutboxItem[]);
  const offline = useSyncExternalStore(subscribe, isOffline, () => false);
  return { items, offline };
}

export function useAutoSync(onSynced: (n: number) => void) {
  useEffect(() => {
    const run = () => flushOutbox().then((n) => n > 0 && onSynced(n));
    run();
    window.addEventListener("online", run);
    const t = setInterval(run, 30000);
    return () => { window.removeEventListener("online", run); clearInterval(t); };
  }, [onSynced]);
}
