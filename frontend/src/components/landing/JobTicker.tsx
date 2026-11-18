import Link from "next/link";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { DiscoveredJob } from "@/types";

/** A slow, endless row of real, just-posted roles. Each chip opens the job. */
export function JobTicker({ jobs }: { jobs: DiscoveredJob[] }) {
  if (jobs.length < 4) return null;
  const chip = (job: DiscoveredJob, copy: number) => (
    <li key={`${copy}-${job.id}`} aria-hidden={copy === 1 || undefined}>
      <Link
        href={`/discover/${job.id}`}
        tabIndex={copy === 1 ? -1 : undefined}
        className="flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-surface/90 py-1.5 pl-1.5 pr-3.5 text-[13px] shadow-sm backdrop-blur transition hover:border-blue-300"
      >
        <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-6 w-6" />
        <span className="font-medium text-slate-900">{job.role_title.length > 48 ? `${job.role_title.slice(0, 46)}…` : job.role_title}</span>
        <span className="text-slate-500">{job.company_name} · {job.city || job.locations[0] || "Canada"}</span>
      </Link>
    </li>
  );
  return (
    <div className="ticker relative -mx-4 overflow-hidden py-1 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] sm:-mx-6">
      <ul aria-label="Recently posted roles" className="ticker-track flex w-max gap-3">
        {jobs.map((j) => chip(j, 0))}
        {jobs.map((j) => chip(j, 1))}
      </ul>
    </div>
  );
}
