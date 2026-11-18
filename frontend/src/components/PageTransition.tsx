"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * Fades each page in on navigation, in CSS (.page-enter in globals.css): nothing to hydrate, content is
 * visible without script, and no transform is left behind to trap fixed-position drawers.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter w-full flex-1">
      {children}
    </div>
  );
}
