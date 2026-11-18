"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { askAboutJob, getAiStatus, matchJob } from "@/app/actions/ai";
import { AiFreeTierNotice } from "@/components/tracker/AiTab";

const btn =
  "inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60";

/** AI help for one job in the feed: a resume match score and questions about the posting. */
export default function JobAi({ jobId }: { jobId: string }) {
  const { data: status, refetch: refetchStatus } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });
  // Runs only on click; the result stays cached, so coming back to a job doesn't spend another call.
  const match = useQuery({
    queryKey: ["job-match", jobId],
    queryFn: () => matchJob(jobId).finally(() => refetchStatus()),
    enabled: false,
    staleTime: Infinity,
  });
  const [question, setQuestion] = useState("");
  const ask = useMutation({ mutationFn: (q: string) => askAboutJob(jobId, q).finally(() => refetchStatus()) });

  if (!status?.enabled || !status.allowed) return null;
  const result = match.data;

  return (
    <section aria-label="AI tools" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btn} disabled={match.isFetching || status.remaining.job_match === 0} onClick={() => match.refetch()}>
          {match.isFetching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          {result?.ok ? "Re-check my match" : "Check my match"}
        </button>
        <span className="text-xs text-slate-500">{status.remaining.job_match} match checks left this month</span>
      </div>

      {result && !result.ok && <p role="alert" className="text-sm text-red-600">{result.error}</p>}
      {result?.ok && (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="text-2xl font-semibold text-slate-900">{result.data.score}</span>
            <span className="text-slate-500"> / 100</span> · {result.data.verdict}
          </p>
          {result.data.matched.length > 0 && (
            <p><span className="font-medium text-emerald-700">Your resume shows:</span> {result.data.matched.join(", ")}</p>
          )}
          {result.data.missing.length > 0 && (
            <p><span className="font-medium text-amber-700">Not on your resume:</span> {result.data.missing.join(", ")}</p>
          )}
          <p className="text-xs text-slate-500">An AI estimate from your resume bullets, not a prediction of the employer&apos;s decision.</p>
        </div>
      )}

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) ask.mutate(question);
        }}
      >
        <label htmlFor="job-question" className="sr-only">Ask about this job</label>
        <input
          id="job-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={500}
          placeholder="Ask about this job (e.g. what languages does it need?)"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
        />
        <button type="submit" className={btn} disabled={ask.isPending || !question.trim() || status.remaining.job_question === 0}>
          {ask.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Ask
        </button>
      </form>
      {ask.data && (
        <p role={ask.data.ok ? undefined : "alert"} className={`text-sm ${ask.data.ok ? "text-slate-700" : "text-red-600"}`}>
          {ask.data.ok ? ask.data.data.answer : ask.data.error}
        </p>
      )}
      {status.freeTier && <AiFreeTierNotice />}
    </section>
  );
}
