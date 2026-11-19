"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, FileText, Loader2, Package, Send } from "lucide-react";
import { getAiStatus, tailorResume, writeCoverLetter, type LetterResult, type TailorResult } from "@/app/actions/ai";
import { buildKitForm, recordSubmission, startApplyKit, type KitForm, type KitStart } from "@/app/actions/apply-kit";
import type { KitAnswer } from "@/lib/apply-kit";
import { TAILORING_KEY, type StoredTailoring } from "@/lib/resume";
import { keys } from "@/lib/tracker-hooks";
import { useToast } from "@/components/ui/Toast";

const btn =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60";
const primary =
  "inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60";
const field =
  "w-full rounded-lg border border-slate-300 bg-surface px-2.5 py-1.5 text-sm text-slate-900 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

type Stage = { label: string; state: "waiting" | "running" | "done" | "skipped"; note?: string };
type Tab = "form" | "resume" | "letter";

const SOURCE_LABEL: Record<KitAnswer["source"], { text: string; cls: string }> = {
  profile: { text: "From your profile", cls: "text-emerald-700" },
  ai: { text: "AI draft, read it", cls: "text-amber-700" },
  empty: { text: "You answer", cls: "text-slate-500" },
};

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={!text}
      onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied"))}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden /> {label}
    </button>
  );
}

/**
 * Builds everything for one application (tracker entry, tailored bullets, cover letter, form
 * answers) so the user can fill the employer's form and press Submit themselves.
 */
export default function ApplyKit({ jobId }: { jobId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: status, refetch: refetchStatus } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });
  const [stages, setStages] = useState<Stage[] | null>(null);
  const [start, setStart] = useState<KitStart | null>(null);
  const [tailor, setTailor] = useState<TailorResult | null>(null);
  const [useOriginal, setUseOriginal] = useState(false);
  const [letter, setLetter] = useState("");
  const [form, setForm] = useState<KitForm | null>(null);
  const [answers, setAnswers] = useState<KitAnswer[]>([]);
  const [tab, setTab] = useState<Tab>("form");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ai = Boolean(status?.enabled && status.allowed);
  const running = stages?.some((s) => s.state === "running") ?? false;

  async function build() {
    setError(null);
    setSubmitted(false);
    const plan: Stage[] = [
      { label: "Adding it to your tracker", state: "waiting" },
      { label: "Tailoring your resume bullets", state: ai ? "waiting" : "skipped", note: ai ? undefined : "AI tools are off" },
      { label: "Writing a cover letter", state: ai ? "waiting" : "skipped", note: ai ? undefined : "AI tools are off" },
      { label: "Answering the application form", state: "waiting" },
    ];
    const set = (i: number, s: Partial<Stage>) => {
      plan[i] = { ...plan[i], ...s };
      setStages([...plan]);
    };
    setStages([...plan]);

    set(0, { state: "running" });
    const started = await startApplyKit(jobId).catch(() => ({ ok: false as const, error: "Couldn't reach Trackr. Try again." }));
    if (!started.ok) {
      setError(started.error);
      setStages(null);
      return;
    }
    setStart(started);
    set(0, { state: "done" });
    queryClient.invalidateQueries({ queryKey: keys.applications });

    if (ai) {
      set(1, { state: "running" });
      const t = await tailorResume(started.applicationId).catch(() => null);
      if (t?.ok) setTailor(t.data);
      set(1, { state: t?.ok ? "done" : "skipped", note: t && !t.ok ? t.error : t ? undefined : "Couldn't reach the AI tools" });

      set(2, { state: "running" });
      const l: Awaited<ReturnType<typeof writeCoverLetter>> | null = await writeCoverLetter(started.applicationId, "").catch(() => null);
      if (l?.ok) setLetter(letterText(l.data));
      set(2, { state: l?.ok ? "done" : "skipped", note: l && !l.ok ? l.error : l ? undefined : "Couldn't reach the AI tools" });
    }

    set(3, { state: "running" });
    const f = await buildKitForm(started.applicationId, started.jobUrl, ai).catch(() => null);
    if (f?.ok) {
      setForm(f);
      setAnswers(f.answers);
    }
    set(3, { state: f?.ok ? "done" : "skipped", note: f && !f.ok ? f.error : f?.ok ? f.aiError : "Couldn't build the form" });
    refetchStatus();
  }

  async function markSubmitted() {
    if (!start) return;
    setSaving(true);
    const res = await recordSubmission({
      applicationId: start.applicationId,
      answers: answers.map(({ section, label, value, options }) => ({ section, label, value, options })),
      resumeBullets: tailor && !useOriginal ? tailor.bullets.map((b) => ({ bullet_id: b.bullet_id, text: b.text })) : null,
      coverLetter: letter.trim() || null,
      jobUrl: start.jobUrl,
    }).catch(() => ({ ok: false as const, error: "Couldn't reach Trackr. Try again." }));
    setSaving(false);
    if (!res.ok) return setError(res.error);
    setSubmitted(true);
    queryClient.invalidateQueries({ queryKey: keys.applications });
  }

  if (!stages) {
    return (
      <section aria-label="Apply kit" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <button type="button" className={primary} onClick={build}>
          <Package className="h-4 w-4" aria-hidden /> Build my apply kit
        </button>
        <span className="text-sm text-slate-600">
          {ai ? "Tailored bullets, a cover letter and your form answers, ready to paste." : "Your form answers from your profile, ready to paste."} You still press Submit.
        </span>
        {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
      </section>
    );
  }

  const covered = tailor ? tailor.matched_keywords.length : 0;
  const total = tailor ? covered + tailor.gaps.length : 0;
  const sections = [...new Set(answers.map((a) => a.section))];
  const needYou = answers.filter((a) => a.required && !a.value.trim()).length;

  return (
    <section aria-label="Apply kit" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <ol aria-label="Progress" className="grid gap-1.5 text-sm sm:grid-cols-2">
        {stages.map((s) => (
          <li key={s.label} className="flex items-start gap-2">
            {s.state === "running" ? (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
            ) : s.state === "done" ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            ) : (
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-hidden />
            )}
            <span className={s.state === "waiting" ? "text-slate-500" : "text-slate-800"}>
              {s.label}
              {s.note && <span className="block text-[13px] text-slate-500">{s.note}</span>}
            </span>
          </li>
        ))}
      </ol>

      {start && start.recentAtCompany > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          You&apos;ve applied to {start.recentAtCompany} other {start.recentAtCompany === 1 ? "role" : "roles"} at {start.company} in the last 30 days. Recruiters notice; pick the ones that fit best.
        </p>
      )}

      {!running && (
        <>
          <div role="tablist" aria-label="Apply kit" className="flex gap-1 border-b border-slate-200">
            {(
              [
                ["form", `Form${needYou ? ` (${needYou} need you)` : ""}`],
                ["resume", "Resume"],
                ["letter", "Cover letter"],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${tab === id ? "border-accent text-slate-900" : "border-transparent text-slate-600 hover:text-slate-900"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "form" && (
            <div role="tabpanel" aria-label="Form" className="space-y-4">
              {form && (
                <p className="text-[13px] text-slate-600">
                  {form.fromPosting ? "These are this posting's own questions." : "This board doesn't publish its questions, so these are the ones most forms ask."}
                  {!form.hasProfile && " Finish your application profile to fill more of them."}
                </p>
              )}
              {sections.map((section) => (
                <fieldset key={section} className="space-y-2">
                  <legend className="mb-1 text-[13px] font-semibold uppercase tracking-wide text-slate-500">{section}</legend>
                  {answers.map((a, i) =>
                    a.section !== section ? null : (
                      <div key={`${a.label}-${i}`} className="rounded-lg border border-slate-200 bg-surface p-2.5">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <label htmlFor={`kit-${i}`} className="text-sm font-medium text-slate-800">
                            {a.label}
                            {a.required && <span className="text-red-600"> *</span>}
                          </label>
                          <span className={`shrink-0 text-[12px] ${SOURCE_LABEL[a.source].cls}`}>{SOURCE_LABEL[a.source].text}</span>
                        </div>
                        <div className="flex items-start gap-1">
                          {a.options ? (
                            <select
                              id={`kit-${i}`}
                              value={a.value}
                              onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                              className={field}
                            >
                              <option value="">Choose…</option>
                              {a.options.map((o) => (
                                <option key={o}>{o}</option>
                              ))}
                            </select>
                          ) : (
                            <textarea
                              id={`kit-${i}`}
                              rows={a.value.length > 80 ? 4 : 1}
                              value={a.value}
                              onChange={(e) => setAnswers(answers.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                              className={field}
                            />
                          )}
                          <CopyButton text={a.value} />
                        </div>
                      </div>
                    )
                  )}
                </fieldset>
              ))}
            </div>
          )}

          {tab === "resume" && (
            <div role="tabpanel" aria-label="Resume" className="space-y-3 text-sm text-slate-700">
              {tailor ? (
                <>
                  <p>
                    <span className="text-lg font-semibold text-slate-900">{covered}/{total}</span> of the job&apos;s requirements are covered by your bullets.
                    {tailor.gaps.length > 0 && <span className="block text-[13px] text-amber-700">Not on your resume: {tailor.gaps.join(", ")}</span>}
                  </p>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={useOriginal} onChange={(e) => setUseOriginal(e.target.checked)} />
                    Use my original resume instead
                  </label>
                  {!useOriginal && (
                    <ol className="list-disc space-y-1.5 pl-5">
                      {tailor.bullets.map((b) => (
                        <li key={b.bullet_id}>{b.text}</li>
                      ))}
                    </ol>
                  )}
                </>
              ) : (
                <p>No tailoring this time, so your resume goes as written.</p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btn}
                  onClick={() => {
                    if (tailor && !useOriginal && start) {
                      const stored: StoredTailoring = { label: `${start.role} at ${start.company}`, bullets: tailor.bullets.map((b) => ({ bullet_id: b.bullet_id, text: b.text })) };
                      try {
                        sessionStorage.setItem(TAILORING_KEY, JSON.stringify(stored));
                      } catch {}
                      router.push("/resume?tailored=1");
                    } else router.push("/resume");
                  }}
                >
                  <FileText className="h-4 w-4" aria-hidden /> Open resume to save as PDF
                </button>
                {tailor && !useOriginal && <CopyButton label="Copy bullets" text={tailor.bullets.map((b) => `• ${b.text}`).join("\n")} />}
              </div>
            </div>
          )}

          {tab === "letter" && (
            <div role="tabpanel" aria-label="Cover letter" className="space-y-2">
              <label htmlFor="kit-letter" className="sr-only">Cover letter</label>
              <textarea
                id="kit-letter"
                rows={12}
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                placeholder="No letter this time. Write one here if the form asks."
                className={field}
              />
              <CopyButton text={letter} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
            {start && (
              <a href={start.jobUrl} target="_blank" rel="noopener noreferrer" className={btn}>
                Open the posting <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
            {submitted ? (
              <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                <Check className="h-4 w-4" aria-hidden /> Saved to your tracker as Applied, with a receipt
              </span>
            ) : (
              <button type="button" className={primary} disabled={saving || !start} onClick={markSubmitted}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />} I submitted it
              </button>
            )}
            <button type="button" className="ml-auto text-[13px] text-slate-500 hover:text-slate-800" onClick={build}>
              Rebuild
            </button>
          </div>
        </>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

function letterText(l: LetterResult): string {
  return l.paragraphs.map((p) => p.text).join("\n\n");
}
