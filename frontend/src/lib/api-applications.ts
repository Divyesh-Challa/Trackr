import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { jobCanonical } from "./job-url";

/** The user's tracker entry for a posting URL (by its feed job, else by its own link), and the feed job. */
export async function findApplication(db: SupabaseClient<Database>, userId: string, url: string) {
  const canonical = jobCanonical(url);
  const { data: job } = canonical
    ? await db.from("jobs").select("id, company_name, title, job_url, locations, work_model").eq("job_url_canonical", canonical).maybeSingle()
    : { data: null };
  const cols = "id, company_name, role_title, job_url, kit";
  let app = job ? (await db.from("applications").select(cols).eq("user_id", userId).eq("job_id", job.id).maybeSingle()).data : null;
  if (!app && canonical) {
    // shortcut: scans the 200 most recent entries with a link; enough for one person's tracker.
    const { data } = await db.from("applications").select(cols).eq("user_id", userId).not("job_url", "is", null).order("updated_at", { ascending: false }).limit(200);
    app = data?.find((a) => a.job_url && jobCanonical(a.job_url) === canonical) ?? null;
  }
  return { job, app };
}
