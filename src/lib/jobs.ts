import type { Database } from "@/integrations/supabase/types";

export type JobStatus = Database["public"]["Enums"]["job_status"];
export type JobService = Database["public"]["Enums"]["job_service"];
export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobUpdate = Database["public"]["Tables"]["job_updates"]["Row"];

export const JOB_STATUSES: JobStatus[] = [
  "scheduled",
  "en_route",
  "on_site",
  "blocked",
  "completed",
  "signed_off",
  "cancelled",
];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  en_route: "En route",
  on_site: "On site",
  blocked: "Blocked",
  completed: "Completed",
  signed_off: "Signed off",
  cancelled: "Cancelled",
};

export const SERVICES: JobService[] = [
  "survey",
  "solar_install",
  "iot_install",
  "security_install",
  "maintenance",
  "repair",
  "other",
];

export const SERVICE_LABEL: Record<JobService, string> = {
  survey: "Site survey",
  solar_install: "Solar install",
  iot_install: "IoT install",
  security_install: "Security install",
  maintenance: "Maintenance",
  repair: "Repair",
  other: "Other",
};

export const OPEN_STATUSES: JobStatus[] = ["scheduled", "en_route", "on_site", "blocked", "completed"];

/** Badge shade per stage, so a glance at the list tells you what needs attention. */
export function statusTone(status: JobStatus) {
  if (status === "blocked" || status === "cancelled") return "destructive" as const;
  if (status === "signed_off") return "default" as const;
  if (status === "on_site" || status === "en_route") return "secondary" as const;
  return "outline" as const;
}

/** Photos are stored on the row itself, so no separate photo location is needed. */
export function photoSrc(row: { photo_data: string | null; photo_mime: string | null }) {
  if (!row.photo_data) return null;
  return row.photo_data.startsWith("data:")
    ? row.photo_data
    : `data:${row.photo_mime ?? "image/jpeg"};base64,${row.photo_data}`;
}

/**
 * Phones hand over 5–10MB pictures. Shrinking to 1280px keeps a site photo sharp
 * on screen but small enough to store and send quickly on a weak connection.
 */
export function shrinkImage(file: File, max = 1280, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("Your browser can't prepare the photo"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a readable photo"));
    };
    img.src = url;
  });
}

export function fmtDay(d: string | null) {
  if (!d) return "no date";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
