"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface GSAPStaggerOptions {
  selector: string;
  triggerDeps?: any[];
  y?: number;
  opacity?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export function useGSAPStagger({
  selector,
  triggerDeps = [],
  y = 16,
  opacity = 0,
  duration = 0.45,
  stagger = 0.05,
  ease = "power2.out",
}: GSAPStaggerOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Respect user's reduced-motion preference
    if (typeof window !== "undefined") {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;
    }

    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll(selector);
    if (!elements || elements.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        elements,
        {
          y,
          opacity,
        },
        {
          y: 0,
          opacity: 1,
          duration,
          stagger,
          ease,
          clearProps: "transform",
        }
      );
    }, containerRef);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, triggerDeps);

  return containerRef;
}
