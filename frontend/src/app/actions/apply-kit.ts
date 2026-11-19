"use server";

// The apply kit: everything a user needs to submit one application themselves. The client
// runs the steps one call at a time (start → tailor → letter → questions) so progress is real.
import { createClient } from "@/lib/supabase/server";
import { getAtsJson } from "@/lib/ats-fetch";
import { parseJobUrl } from "@/lib/job-url";
import { loadProfileFacts } from "@/lib/profile-facts";
import { saveReceipt, type ReceiptInput } from "@/lib/receipts";
import { answerScreeners } from "@/app/actions/ai";
import {
  COMMON_QUESTIONS,
  greenhouseQuestions,
  jobCountryOf,
  profileAnswer,
  type KitAnswer,
  type KitQuestion,
} from "@/lib/apply-kit";

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
export async function startApplyKit(jobId: string): Promise<KitStart | Fail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };

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
async function questionsFor(jobUrl: string): Promise<{ questions: KitQuestion[]; fromPosting: boolean }> {
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

export type KitForm = { ok: true; answers: KitAnswer[]; fromPosting: boolean; hasProfile: boolean; aiError?: string };

/**
 * The form, answered: facts from the profile, open-ended questions drafted by the AI from the
 * resume (when `draft`), and anything else left for the user.
 */
export async function buildKitForm(applicationId: string, jobUrl: string, draft: boolean): Promise<KitForm | Fail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };
  const { facts, hasProfile } = await loadProfileFacts(supabase, auth.user.id, auth.user.email);
  const { questions, fromPosting } = await questionsFor(jobUrl);
  const jobCountry = jobCountryOf(jobUrl, facts.country);

  const answers: KitAnswer[] = questions.map((q) => {
    const value = profileAnswer(q, facts, jobCountry);
    return { section: q.section, label: q.label, value, ...(q.options ? { options: q.options } : {}), source: value ? "profile" : "empty", required: q.required };
  });

  let aiError: string | undefined;
  const open = answers.map((a, i) => ({ a, i, q: questions[i] })).filter(({ a, q }) => !a.value && (q.kind === "textarea" || (q.kind === "text" && q.label.length > 40)));
  if (draft && open.length) {
    const drafted = await answerScreeners(applicationId, open.map(({ q }) => q.label));
    if (drafted.ok) {
      open.forEach(({ i }, n) => {
        const text = drafted.data.answers[n];
        if (text) answers[i] = { ...answers[i], value: text, source: "ai" };
      });
    } else aiError = drafted.error;
  }
  return { ok: true, answers, fromPosting, hasProfile, aiError };
}

export type SubmissionInput = Omit<ReceiptInput, "source">;

/** Saves the receipt and moves the application to Applied. The user has already submitted it themselves. */
export async function recordSubmission(input: SubmissionInput): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };
  const saved = await saveReceipt(supabase, auth.user.id, { ...input, source: "manual" });
  return saved ? { ok: true } : { ok: false, error: "Couldn't save the receipt. Try again." };
}

/** Keeps the reviewed kit so the extension fills the posting with the same answers. */
export async function saveKit(applicationId: string, answers: { section: string; label: string; value: string }[], coverLetter: string): Promise<void> {
  const supabase = await createClient();
  const kit = {
    answers: answers.slice(0, 200).map((a) => ({ section: String(a.section).slice(0, 120), label: String(a.label).slice(0, 500), value: String(a.value).slice(0, 5000) })),
    cover_letter: String(coverLetter).slice(0, 20000),
  };
  await supabase.from("applications").update({ kit }).eq("id", applicationId);
}

export type Receipt = {
  id: string;
  submitted_at: string;
  answers: { section: string; label: string; value: string }[];
  bullets: { bullet_id: string; text: string }[] | null;
  cover_letter: string | null;
  job_url: string | null;
  source: string;
};

export async function listReceipts(applicationId: string): Promise<Receipt[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("application_submissions")
    .select("id, submitted_at, answers, resume_snapshot, cover_letter, job_url, source")
    .eq("application_id", applicationId)
    .order("submitted_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    answers: (r.answers ?? []) as Receipt["answers"],
    bullets: ((r.resume_snapshot as { bullets?: Receipt["bullets"] } | null)?.bullets ?? null),
    cover_letter: r.cover_letter,
    job_url: r.job_url,
    source: r.source,
  }));
}
