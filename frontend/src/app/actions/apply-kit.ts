"use server";

// The apply kit: everything a user needs to submit one application themselves. The client
// runs the steps one call at a time (start → tailor → letter → questions) so progress is real.
import { createClient } from "@/lib/supabase/server";
import { saveReceipt, type ReceiptInput } from "@/lib/receipts";
import { answerScreeners } from "@/app/actions/ai";
import { profileKit, startKit, storeKit, type KitStart } from "@/lib/apply-kit-server";
import type { KitAnswer } from "@/lib/apply-kit";

type Fail = { ok: false; error: string };

export type { KitStart };

export async function startApplyKit(jobId: string): Promise<KitStart | Fail> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false, error: "Sign in first." };
  return startKit(supabase, jobId);
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
  const { questions, answers, fromPosting, hasProfile } = await profileKit(supabase, auth.user.id, auth.user.email, jobUrl);

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

export async function saveKit(applicationId: string, answers: { section: string; label: string; value: string }[], coverLetter: string): Promise<void> {
  await storeKit(await createClient(), applicationId, answers, coverLetter);
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
