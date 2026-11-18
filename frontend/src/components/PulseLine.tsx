"use client";

import React, { useEffect, useState } from "react";
import type { FeedPulse } from "@/lib/feed";

function minutesAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

/** "● Live · updated 12 min ago · 24 new today …": tells the visitor the feed is fresh. */
export function PulseLine({ pulse }: { pulse: FeedPulse }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const parts = [
    pulse.lastRefresh && `Updated ${minutesAgo(pulse.lastRefresh, now)}`,
    pulse.newToday > 0 && `${pulse.newToday.toLocaleString()} new today`,
    // A handful of students reads as an empty room, so only show it once it's a crowd.
    pulse.trackersWeek >= 5 && `${pulse.trackersWeek.toLocaleString()} students tracked roles this week`,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      {parts.map((p) => (
        <React.Fragment key={String(p)}>
          <span aria-hidden className="text-slate-300">
            ·
          </span>
          <span>{p}</span>
        </React.Fragment>
      ))}
      {pulse.newSinceVisit != null && pulse.newSinceVisit > 0 && (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {pulse.newSinceVisit.toLocaleString()} new since your last visit
        </span>
      )}
    </div>
  );
}
