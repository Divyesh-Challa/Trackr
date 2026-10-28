"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { motionTokens, springs } from "../lib/motion-tokens";

/**
 * Fades each page in on navigation. Entrance only: App Router swaps the page before an
 * exit animation could run, so exit animations would play on the new page's content.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: reduce ? 0 : motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.gentle}
      className="w-full flex-1"
    >
      {children}
    </motion.div>
  );
}
