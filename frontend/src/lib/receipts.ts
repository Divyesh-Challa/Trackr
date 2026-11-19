import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "./supabase/database.types";
import { parseJobUrl } from "./job-url";

export type ReceiptInput = {
  applicationId: string;
  answers: { section: string; label: string; value: string; options?: string[] }[];
  resumeBullets: { bullet_id: string; text: string }[] | null;
  coverLetter: string | null;
  jobUrl: string | null;
  source: "manual" | "extension";
};

/**
 * Saves a receipt and moves the application to Applied. The user has already submitted it
 * themselves. Input is untrusted (it can come from a scraped page), so everything is clamped.
 */
export async function saveReceipt(supabase: SupabaseClient<Database>, userId: string, input: ReceiptInput): Promise<boolean> {
  const answers = (Array.isArray(input.answers) ? input.answers : []).slice(0, 200).map((a) => ({
    section: String(a?.section ?? "").slice(0, 120),
    label: String(a?.label ?? "").slice(0, 500),
    value: String(a?.value ?? "").slice(0, 5000),
    ...(Array.isArray(a?.options) ? { options: a.options.slice(0, 100).map((o) => String(o).slice(0, 300)) } : {}),
  }));
  const bullets = input.resumeBullets?.slice(0, 40).map((b) => ({ bullet_id: String(b.bullet_id), text: String(b.text).slice(0, 600) })) ?? null;
  const jobUrl = input.jobUrl && /^https?:\/\//i.test(input.jobUrl) ? input.jobUrl.slice(0, 2048) : null;

  const { error } = await supabase.from("application_submissions").insert({
    user_id: userId,
    application_id: input.applicationId,
    answers,
    resume_snapshot: bullets ? ({ bullets } as Json) : null,
    cover_letter: typeof input.coverLetter === "string" ? input.coverLetter.slice(0, 20000) || null : null,
    job_url: jobUrl,
    ats: jobUrl ? (parseJobUrl(jobUrl)?.ats ?? null) : null,
    source: input.source,
  });
  if (error) return false;

  const { data: app } = await supabase.from("applications").select("status, applied_at").eq("id", input.applicationId).eq("user_id", userId).single();
  if (app && (app.status === "wishlist" || !app.applied_at)) {
    await supabase
      .from("applications")
      .update({ ...(app.status === "wishlist" ? { status: "applied" as const } : {}), applied_at: app.applied_at ?? new Date().toISOString().slice(0, 10) })
      .eq("id", input.applicationId)
      .eq("user_id", userId);
  }
  return true;
}
