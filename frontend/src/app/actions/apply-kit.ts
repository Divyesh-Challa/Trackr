"use server";

// The apply kit: everything a user needs to submit one application themselves. The client
// runs the steps one call at a time (start → tailor → letter → questions) so progress is real.
import { createClient } from "@/lib/supabase/server";
import { getAtsJson } from "@/lib/ats-fetch";
import { parseJobUrl } from "@/lib/job-url";
import { termLabel } from "@/lib/feed";
import { answerScreeners } from "@/app/actions/ai";
import {
  COMMON_QUESTIONS,
  greenhouseQuestions,
  profileAnswer,
  type KitAnswer,
  type KitQuestion,
  type ProfileFacts,
} from "@/lib/apply-kit";
import type { Json } from "@/lib/supabase/database.types";

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

async function loadFacts(): Promise<{ facts: ProfileFacts; hasProfile: boolean } | null> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const [{ data: p }, { data: a }] = await Promise.all([
    supabase.from("profiles").select("full_name, email, phone, linkedin_url, github_url, website_url, school, grad_term").eq("id", auth.user.id).single(),
    supabase.from("application_profiles").select("*").maybeSingle(),
  ]);
  return {
    hasProfile: Boolean(a),
    facts: {
      full_name: p?.full_name ?? "",
      email: p?.email || auth.user.email || "",
      phone: p?.phone ?? "",
      linkedin_url: p?.linkedin_url ?? "",
      github_url: p?.github_url || p?.website_url || "",
      school: p?.school ?? "",
      grad_label: p?.grad_term ? termLabel(p.grad_term) : "",
      street: a?.street ?? "",
      city: a?.city ?? "",
      region: a?.region ?? "",
      postal_code: a?.postal_code ?? "",
      country: a?.country ?? "Canada",
      work_auth: (a?.work_auth ?? {}) as ProfileFacts["work_auth"],
      willing_to_relocate: a?.willing_to_relocate ?? null,
      in_person_ok: a?.in_person_ok ?? null,
      earliest_start: a?.earliest_start ?? "",
      eeo: { gender: a?.gender, race_ethnicity: a?.race_ethnicity, indigenous: a?.indigenous, veteran: a?.veteran, disability: a?.disability },
    },
  };
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
  const loaded = await loadFacts();
  if (!loaded) return { ok: false, error: "Sign in first." };
  const { facts, hasProfile } = loaded;
  const { questions, fromPosting } = await questionsFor(jobUrl);
  const jobCountry = /united states|\busa?\b/i.test(jobUrl) ? "United States" : facts.country || "Canada";

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

export type SubmissionInput = {
  applicationId: string;
  answers: { section: string; label: string; value: string; options?: string[] }[];
  resumeBullets: { bullet_id: string; text: string }[] | null;
  coverLetter: string | null;
  jobUrl: string | null;
};

/** Saves the receipt and moves the application to Applied. The user has already submitted it themselves. */
export async function recordSubmission(input: SubmissionInput): Promise<{ ok: true } | Fail> {
  const supabase = await createClient();
  const answers = input.answers.slice(0, 200).map((a) => ({
    section: String(a.section).slice(0, 120),
    label: String(a.label).slice(0, 500),
    value: String(a.value).slice(0, 5000),
    ...(Array.isArray(a.options) ? { options: a.options.slice(0, 100).map((o) => String(o).slice(0, 300)) } : {}),
  }));
  const bullets = input.resumeBullets?.slice(0, 40).map((b) => ({ bullet_id: String(b.bullet_id), text: String(b.text).slice(0, 600) })) ?? null;
  const jobUrl = input.jobUrl && /^https?:\/\//i.test(input.jobUrl) ? input.jobUrl.slice(0, 2048) : null;

  const { error } = await supabase.from("application_submissions").insert({
    application_id: input.applicationId,
    answers,
    resume_snapshot: bullets ? ({ bullets } as Json) : null,
    cover_letter: input.coverLetter?.slice(0, 20000) || null,
    job_url: jobUrl,
    ats: jobUrl ? (parseJobUrl(jobUrl)?.ats ?? null) : null,
    source: "manual",
  });
  if (error) return { ok: false, error: "Couldn't save the receipt. Try again." };

  const { data: app } = await supabase.from("applications").select("status, applied_at").eq("id", input.applicationId).single();
  if (app && (app.status === "wishlist" || !app.applied_at)) {
    await supabase
      .from("applications")
      .update({ ...(app.status === "wishlist" ? { status: "applied" as const } : {}), applied_at: app.applied_at ?? new Date().toISOString().slice(0, 10) })
      .eq("id", input.applicationId);
  }
  return { ok: true };
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
