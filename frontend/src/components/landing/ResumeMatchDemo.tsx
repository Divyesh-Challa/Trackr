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
    <div className="grid gap-6 rounded-3xl border border-slate-200 bg-surface p-6 shadow-simplify-card md:grid-cols-2 md:p-8">
      <div className="space-y-3">
        <h2 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">See where you fit, before you sign up.</h2>
        <p className="text-slate-600">
          Paste your resume (or a few bullets). Trackr picks out your skills and checks them against roles posted today. Nothing is saved.
        </p>
        <label htmlFor="demo-resume" className="sr-only">Resume text</label>
        <textarea
          id="demo-resume"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder="e.g. Built a React app with a Node.js API and PostgreSQL…"
          className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-[15px] text-slate-900 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || text.trim().length < 20}
            onClick={() => run(text)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0052cc] disabled:opacity-50"
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
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Try a sample
          </button>
        </div>
      </div>

      <div aria-live="polite" className="min-h-[12rem] rounded-2xl bg-slate-50 p-4">
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {!result && !error && (
          <p className="flex h-full items-center justify-center text-center text-sm text-slate-500">Your skills and best-fit roles show up here.</p>
        )}
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
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
              <Link key={job.id} href={`/discover/${job.id}`} className="flex items-center gap-3 rounded-xl bg-surface p-3 shadow-sm transition hover:shadow-md">
                <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{job.role_title}</p>
                  <p className="truncate text-xs text-slate-500">{job.company_name} · has {have.slice(0, 3).join(", ")}</p>
                </div>
                <span className={`text-lg font-semibold ${percent >= 60 ? "text-emerald-600" : percent >= 30 ? "text-amber-600" : "text-slate-500"}`}>{percent}%</span>
              </Link>
            ))}
            {result.skills.length > 0 && !result.top.length && (
              <p className="text-sm text-slate-600">None of today&apos;s sample roles overlap yet. The full feed has many more.</p>
            )}
            <Link href="/login?next=/resume" className="inline-flex items-center gap-1 text-sm font-medium text-[#0066FF] hover:underline">
              Add your resume to see a match on every role <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
