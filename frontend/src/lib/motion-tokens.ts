"use client";

import { useReducedMotion, type Transition } from "framer-motion";

/**
 * Standard motion tokens conforming to motion-foundations and motion-patterns.
 * Centralizes durations, springs, easings, distances, and scales.
 */
export const motionTokens = {
  duration: {
    instant: 0.08,
    fast: 0.18,
    normal: 0.32,
    slow: 0.5,
    crawl: 0.8,
  },
  easing: {
    smooth: [0.22, 1, 0.36, 1] as const,
    sharp: [0.4, 0, 0.2, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
  },
  distance: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
  },
  scale: {
    subtle: 0.98,
    press: 0.96,
    pop: 1.02,
  },
};

/**
 * Shared spring presets.
 */
export const springs = {
  /** Snappy feedback for cards, buttons, tabs, selection indicators */
  snappy: { type: "spring", stiffness: 400, damping: 25 },
  /** Gentle landings for panels, modals, dialogs */
  gentle: { type: "spring", stiffness: 180, damping: 20 },
  /** Release physics for drag-and-drop */
  release: { type: "spring", stiffness: 260, damping: 22, restDelta: 0.001 },
  /** Fluid glides for shared element layoutId transitions */
  glide: { type: "spring", stiffness: 450, damping: 32 },
} as const satisfies Record<string, Transition>;

/**
 * Hook providing accessible motion variants that automatically disable
 * transforms when prefers-reduced-motion is enabled.
 */
export function useSafeMotion(fullY: number = 12) {
  const reduce = useReducedMotion();
  return {
    initial: { opacity: 0, y: reduce ? 0 : fullY },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: reduce ? 0 : -fullY },
  };
}
