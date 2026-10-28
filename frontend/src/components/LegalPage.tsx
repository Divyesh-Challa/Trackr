import React from "react";

/** Shared typography for long-form legal pages. */
export default function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl py-6 text-[15px] leading-relaxed text-slate-700 [&_a]:text-[#0066FF] [&_a]:underline [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:mb-1 [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}
