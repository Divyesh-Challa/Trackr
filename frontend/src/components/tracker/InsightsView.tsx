"use client";

import React, { useMemo } from "react";
import { computeInsights } from "@/lib/insights";
import { useAllHistory } from "@/lib/tracker-hooks";
import type { Application } from "@/types";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-surface p-4">
      <p className="text-[13px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function InsightsView({ apps }: { apps: Application[] }) {
  const { data: history, isLoading, error } = useAllHistory();
  const insights = useMemo(() => (history ? computeInsights(apps, history) : null), [apps, history]);

  if (isLoading) return <p className="text-sm text-slate-500">Loading history…</p>;
  if (error || !insights)
    return <p role="alert" className="text-sm text-rose-700">Couldn&apos;t load your history: {(error as Error)?.message}</p>;

  const top = insights.funnel[0].count;
  const maxWeek = Math.max(1, ...insights.perWeek.map((w) => w.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applied" value={String(top)} />
        <Stat label="In progress" value={String(insights.open)} hint="Applied, OA or interviewing" />
        <Stat
          label="Heard back"
          value={insights.responseRate === null ? "—" : `${Math.round(insights.responseRate * 100)}%`}
          hint="Got an OA, interview, offer or rejection"
        />
        <Stat
          label="Typical wait"
          value={insights.medianDaysToResponse === null ? "—" : `${insights.medianDaysToResponse} days`}
          hint="Median, applied to first response"
        />
      </div>

      <section aria-labelledby="funnel-title" className="rounded-2xl border border-slate-200 bg-surface p-5">
        <h2 id="funnel-title" className="text-sm font-semibold text-slate-900">How far your applications got</h2>
        <ol className="mt-4 space-y-3">
          {insights.funnel.map((f) => {
            const pct = top ? f.count / top : 0;
            return (
              <li key={f.stage} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm">
                <span className="text-slate-700">{f.stage}</span>
                <span className="h-3 rounded-full bg-slate-100" aria-hidden>
                  <span className="block h-3 rounded-full bg-[#0066FF]" style={{ width: `${Math.max(pct * 100, f.count ? 2 : 0)}%` }} />
                </span>
                <span className="text-right tabular-nums text-slate-900">
                  {f.count}
                  {top && f.stage !== "Applied" ? <span className="text-slate-500"> · {Math.round(pct * 100)}%</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="weekly-title" className="rounded-2xl border border-slate-200 bg-surface p-5">
        <h2 id="weekly-title" className="text-sm font-semibold text-slate-900">Applications per week</h2>
        <div className="mt-4 flex h-36 items-end gap-2" role="list">
          {insights.perWeek.map((w) => (
            <div key={w.weekStart} role="listitem" className="flex flex-1 flex-col items-center gap-1" aria-label={`Week of ${w.weekStart}: ${w.count}`}>
              <span className="text-xs tabular-nums text-slate-600">{w.count || ""}</span>
              <span className="w-full rounded-t-md bg-[#0066FF]/80" style={{ height: `${(w.count / maxWeek) * 100}px` }} />
              <span className="text-[11px] text-slate-500">
                {new Date(`${w.weekStart}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
