"use client";

import { useState } from "react";

/** A company's favicon, or its initials when there's no domain or no real icon. */
export function CompanyLogo({ name, domain, className = "h-9 w-9" }: { name: string; domain?: string | null; className?: string }) {
  const [failed, setFailed] = useState(false);
  // Unknown domains come back as a 16px globe rather than an error, so treat tiny icons as missing.
  const check = (img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth <= 16) setFailed(true);
  };
  if (domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={check} // server-rendered images can finish loading before onLoad is attached
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={(e) => check(e.currentTarget)}
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1.5`}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600`}
    >
      {initials}
    </span>
  );
}
