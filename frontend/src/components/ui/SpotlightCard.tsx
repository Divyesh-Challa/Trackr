"use client";

import React, { useRef } from "react";

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  borderColor?: string;
}

/** Card with a soft glow that follows the cursor. Updates CSS variables, not React state. */
export default function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(59, 130, 246, 0.12)",
  borderColor = "rgba(59, 130, 246, 0.35)",
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      className={`group/spot relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition-shadow duration-200 hover:shadow-lg ${className}`}
      {...props}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100 group-focus-within/spot:opacity-100"
        style={{ background: `radial-gradient(600px circle at var(--spot-x, 50%) var(--spot-y, 0%), ${spotlightColor}, transparent 40%)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{
          border: `1px solid ${borderColor}`,
          maskImage: "radial-gradient(300px circle at var(--spot-x, 50%) var(--spot-y, 0%), black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(300px circle at var(--spot-x, 50%) var(--spot-y, 0%), black 30%, transparent 70%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
