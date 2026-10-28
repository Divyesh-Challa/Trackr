"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface MagnetProps {
  children: React.ReactNode;
  className?: string;
  pullFactor?: number;
  radius?: number;
}

/**
 * Pulls its child gently toward the cursor. Listens only while the pointer is near
 * (inside the padded hit area), and does nothing on touch screens or with reduced motion.
 */
export default function Magnet({ children, className = "", pullFactor = 0.3, radius = 60 }: MagnetProps) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    const inner = innerRef.current;
    if (!zone || !inner) return;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const toX = gsap.quickTo(inner, "x", { duration: 0.3, ease: "power2.out" });
    const toY = gsap.quickTo(inner, "y", { duration: 0.3, ease: "power2.out" });

    const onMove = (e: PointerEvent) => {
      const rect = inner.getBoundingClientRect();
      toX((e.clientX - (rect.left + rect.width / 2)) * pullFactor);
      toY((e.clientY - (rect.top + rect.height / 2)) * pullFactor);
    };
    const onLeave = () => gsap.to(inner, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });

    zone.addEventListener("pointermove", onMove);
    zone.addEventListener("pointerleave", onLeave);
    return () => {
      zone.removeEventListener("pointermove", onMove);
      zone.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(inner);
    };
  }, [pullFactor]);

  // The zone is padded by `radius` (with matching negative margin) so the pull starts
  // just before the cursor reaches the button, without affecting layout.
  return (
    <div ref={zoneRef} className={`inline-block ${className}`} style={{ padding: radius / 2, margin: -radius / 2 }}>
      <div ref={innerRef} className="inline-block will-change-transform">
        {children}
      </div>
    </div>
  );
}
