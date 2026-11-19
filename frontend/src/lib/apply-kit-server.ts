import "server-only";
// The apply kit's server half, shared by the app's server actions and the MCP server. Each
// function takes a client that acts as the user, so RLS scopes every query.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { getAtsJson } from "./ats-fetch";
import { parseJobUrl } from "./job-url";
import { loadProfileFacts } from "./profile-facts";
import { COMMON_QUESTIONS, greenhouseQuestions, jobCountryOf, profileAnswer, type KitAnswer, type KitQuestion } from "./apply-kit";

type Fail = { ok: false; error: string };

export type KitStart = {
  ok: true;
  applicationId: string;
  company: string;
  role: string;
  jobUrl: string;
  /** Other applications to this company in the last 30 days. */
  recentAtCompany: number;
};

/** Finds or creates the tracker entry for a feed job, with the posting's description copied in. */
export async function startKit(supabase: SupabaseClient<Database>, jobId: string): Promise<KitStart | Fail> {

  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_name, title, job_url, locations, work_model, description_md")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return { ok: false, error: "That job is no longer listed." };

  let { data: app } = await supabase.from("applications").select("id, description").eq("job_id", jobId).maybeSingle();
  if (!app) {
    const { data, error } = await supabase
      .from("applications")
      .insert({
        company_name: job.company_name.slice(0, 200),
        role_title: job.title.slice(0, 200),
        job_id: job.id,
        job_url: job.job_url,
        location: job.locations[0]?.slice(0, 200) ?? null,
        work_model: job.work_model,
        description: job.description_md?.slice(0, 100000) ?? null,
      })
      .select("id, description")
      .single();
    if (error) return { ok: false, error: "Couldn't add this job to your tracker. Try again." };
    app = data;
  } else if (!app.description?.trim() && job.description_md) {
    await supabase.from("applications").update({ description: job.description_md.slice(0, 100000) }).eq("id", app.id);
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const { count } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .ilike("company_name", job.company_name.replace(/[%_\\]/g, "\\$&"))
    .neq("id", app.id)
    .gte("applied_at", since);

  return { ok: true, applicationId: app.id, company: job.company_name, role: job.title, jobUrl: job.job_url, recentAtCompany: count ?? 0 };
}


/** The posting's own form questions when its ATS publishes them, else the questions most forms ask. */
export async function questionsFor(jobUrl: string): Promise<{ questions: KitQuestion[]; fromPosting: boolean }> {
  const ref = parseJobUrl(jobUrl);
  if (ref?.ats === "greenhouse" && ref.slug) {
    try {
      const json = await getAtsJson(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.slug)}/jobs/${ref.id}?questions=true`
      );
      const questions = greenhouseQuestions(json);
      if (questions.length) return { questions, fromPosting: true };
    } catch {
      // Fall through to the common questions; the kit still helps.
    }
  }
  return { questions: COMMON_QUESTIONS, fromPosting: false };
}

/** Every question on the form, answered from the profile where it can be ("" otherwise). */
export async function profileKit(supabase: SupabaseClient<Database>, userId: string, email: string | undefined, jobUrl: string) {
  const { facts, hasProfile } = await loadProfileFacts(supabase, userId, email);
  const { questions, fromPosting } = await questionsFor(jobUrl);
  const jobCountry = jobCountryOf(jobUrl, facts.country);
  const answers: KitAnswer[] = questions.map((q) => {
    const value = profileAnswer(q, facts, jobCountry);
    return { section: q.section, label: q.label, value, ...(q.options ? { options: q.options } : {}), source: value ? "profile" : "empty", required: q.required };
  });
  return { questions, answers, fromPosting, hasProfile };
}

/** Keeps the reviewed kit so the extension fills the posting with the same answers. */
export async function storeKit(
  supabase: SupabaseClient<Database>,
  applicationId: string,
  answers: { section: string; label: string; value: string }[],
  coverLetter: string
): Promise<void> {
  const kit = {
    answers: answers.slice(0, 200).map((a) => ({ section: String(a.section).slice(0, 120), label: String(a.label).slice(0, 500), value: String(a.value).slice(0, 5000) })),
    cover_letter: String(coverLetter).slice(0, 20000),
  };
  await supabase.from("applications").update({ kit }).eq("id", applicationId);
}
