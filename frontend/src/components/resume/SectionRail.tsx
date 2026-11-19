"use client";

import React, { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { springs } from "@/lib/motion-tokens";

/** `anchor` is the section's element id; `progress` (0–1) fills its ring. */
export type RailItem = { anchor: string; label: string; count?: number; progress: number };

function Ring({ progress }: { progress: number }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 -rotate-90" aria-hidden>
      <circle cx="8" cy="8" r={r} fill="none" strokeWidth="2" className="stroke-slate-200" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, progress))}
        className={`transition-[stroke-dashoffset] duration-500 ease-out ${progress >= 1 ? "stroke-emerald-500" : "stroke-accent"}`}
      />
    </svg>
  );
}

/**
 * Jumps between the editor's sections and highlights the one in view: a sticky column on
 * wide screens, a scrolling strip of pills above the editor otherwise.
 */
export default function SectionRail({ items, variant }: { items: RailItem[]; variant: "column" | "strip" }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(items[0]?.anchor);
  const anchors = items.map((i) => i.anchor).join(",");

  useEffect(() => {
    const ids = anchors.split(",");
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-120px 0px -55% 0px" }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [anchors]);

  const go = (anchor: string) => {
    setActive(anchor);
    document.getElementById(anchor)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const button = (it: RailItem, layoutId: string, wide: boolean) => (
    <button
      key={it.anchor}
      type="button"
      onClick={() => go(it.anchor)}
      aria-current={active === it.anchor ? "true" : undefined}
      className={`relative isolate flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
        wide ? "w-full" : ""
      } ${active === it.anchor ? "text-slate-900" : "text-slate-600 hover:text-slate-900"}`}
    >
      {active === it.anchor && <motion.span layoutId={layoutId} transition={springs.glide} className="absolute inset-0 -z-10 rounded-full bg-surface shadow-sm" />}
      <Ring progress={it.progress} />
      <span className="flex-1 text-left">{it.label}</span>
      {it.count !== undefined && <span className="text-[12px] tabular-nums text-slate-500">{it.count}</span>}
    </button>
  );

  return variant === "column" ? (
    <nav aria-label="Resume sections" data-print-hidden="true" className="sticky top-20 hidden self-start xl:block">
      <p className="mb-2 px-3 text-[12px] font-medium text-slate-500">Sections</p>
      <div className="space-y-0.5">{items.map((it) => button(it, "rail-pill", true))}</div>
    </nav>
  ) : (
    <nav
      aria-label="Resume sections"
      data-print-hidden="true"
      className="no-scrollbar sticky top-14 z-20 -mx-4 mb-4 flex gap-1 overflow-x-auto bg-background/80 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 xl:hidden"
    >
      {items.map((it) => button(it, "rail-strip-pill", false))}
    </nav>
  );
}
