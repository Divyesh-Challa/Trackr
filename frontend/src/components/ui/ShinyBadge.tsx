"use client";

import React from "react";

interface ShinyBadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "blue" | "emerald" | "amber" | "purple" | "slate";
}

const VARIANTS = {
  blue: "bg-blue-50 text-blue-700 border-blue-200/60",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
  amber: "bg-amber-50 text-amber-700 border-amber-200/60",
  purple: "bg-purple-50 text-purple-700 border-purple-200/60",
  slate: "bg-slate-100 text-slate-700 border-slate-200/80",
};

export default function ShinyBadge({
  children,
  className = "",
  variant = "blue",
}: ShinyBadgeProps) {
  return (
    <span
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border overflow-hidden transition-all shadow-sm ${VARIANTS[variant]} ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/50 to-transparent"
        style={{
          maskImage: "linear-gradient(to right, transparent, black, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black, transparent)",
        }}
      />
      <span className="relative z-10 flex items-center gap-1.5">{children}</span>
    </span>
  );
}
