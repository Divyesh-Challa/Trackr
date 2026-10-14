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

    const allElements = Array.from(containerRef.current.querySelectorAll(selector));
    if (!allElements || allElements.length === 0) return;

    // Only stagger the first 10 elements to prevent lagging and 14-second hidden elements
    const staggerBatch = allElements.slice(0, 10);
    const rest = allElements.slice(10);

    const ctx = gsap.context(() => {
      if (rest.length > 0) {
        gsap.set(rest, { opacity: 1, y: 0 });
      }
      gsap.fromTo(
        staggerBatch,
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
