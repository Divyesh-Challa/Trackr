"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { DiscoveredJob } from "@/types";

const SAMPLE =
  "Software developer co-op. Built a React and TypeScript dashboard backed by a Node.js REST API and PostgreSQL. " +
  "Wrote Python scripts with Pandas, containerised services with Docker and set up GitHub Actions CI. Comfortable with Git and Linux.";

/** Paste a resume, see which live roles fit: the same skill tagging the feed uses, nothing saved. */
export function ResumeMatchDemo({ jobs }: { jobs: DiscoveredJob[] }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ skills: string[]; top: { job: DiscoveredJob; percent: number; have: string[] }[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (input: string) => {
    setBusy(true);
    setError("");
    const { data, error } = await createClient().rpc("extract_skills", { p_text: input.slice(0, 20_000) });
    setBusy(false);
    if (error) return setError("Couldn't read that just now. Try again in a moment.");
    const mine = new Set(data ?? []);
    const top = jobs
      .filter((j) => j.skills?.length)
      .map((job) => {
        const have = job.skills!.filter((s) => mine.has(s));
        return { job, have, percent: Math.round((100 * have.length) / job.skills!.length) };
      })
      .filter((r) => r.percent > 0)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 3);
    setResult({ skills: data ?? [], top });
  };

  return (
    <section aria-labelledby="match-title" className="grid lg:grid-cols-2">
      <div className="flex min-h-[62svh] flex-col bg-stage p-6 sm:p-10 lg:min-h-[90svh]">
        <p className="rise max-w-[40ch] text-lg text-stage-muted">
          Paste a resume, or a few bullets. Trackr picks out your skills and checks them against roles posted today.
          Nothing is saved.
        </p>
        <label htmlFor="demo-resume" className="sr-only">Resume text</label>
        <textarea
          id="demo-resume"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Built a React app with a Node.js API and PostgreSQL…"
          className="mt-8 w-full max-w-[34ch] resize-none bg-transparent font-serif text-xl leading-relaxed text-stage-ink placeholder:text-stage-muted focus:outline-none sm:text-2xl"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy || text.trim().length < 20}
            onClick={() => run(text)}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-3 font-medium text-accent-ink transition hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Check my matches
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setText(SAMPLE);
              run(SAMPLE);
            }}
            className="rounded-md border border-stage-line px-5 py-3 font-medium text-stage-ink transition hover:bg-stage-raised active:scale-[0.98]"
          >
            Try a sample
          </button>
        </div>
        <h2 id="match-title" className="mt-auto pt-12 font-serif text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-none text-stage-ink">
          Paste your resume
        </h2>
      </div>

      <div className="flex min-h-[62svh] flex-col bg-surface p-6 sm:p-10 lg:min-h-[90svh]">
        <div data-ui aria-live="polite" className="w-full max-w-[520px] space-y-3">
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {!result && !error && (
            <p className="text-lg text-slate-600">Your skills and the three closest roles from today&apos;s feed show up here.</p>
          )}
          {result && (
            <>
              <p className="text-slate-800">
                {result.skills.length ? (
                  <>
                    Found <strong>{result.skills.length}</strong> skills: {result.skills.slice(0, 10).join(", ")}
                    {result.skills.length > 10 && ` +${result.skills.length - 10} more`}
                  </>
                ) : (
                  "No tech skills found yet. Try pasting your skills section."
                )}
              </p>
              {result.top.map(({ job, percent, have }) => (
                <Link key={job.id} href={`/discover/${job.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition hover:border-slate-400">
                  <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">{job.role_title}</p>
                    <p className="truncate text-sm text-slate-600">{job.company_name} · has {have.slice(0, 3).join(", ")}</p>
                  </div>
                  <span className={`text-xl font-semibold tabular-nums ${percent >= 60 ? "text-emerald-700" : percent >= 30 ? "text-amber-700" : "text-slate-600"}`}>{percent}%</span>
                </Link>
              ))}
              {result.skills.length > 0 && !result.top.length && (
                <p className="text-slate-700">None of today&apos;s sample roles overlap yet. The full feed has many more.</p>
              )}
              <Link href="/login?next=/resume" className="inline-flex items-center gap-1 font-medium text-accent hover:underline">
                Add your resume to see a match on every role <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          )}
        </div>
        <p aria-hidden className="mt-auto pt-12 font-serif text-[clamp(2.5rem,5vw,5rem)] font-semibold leading-none text-slate-900">
          see where you fit
        </p>
      </div>
    </section>
  );
}
