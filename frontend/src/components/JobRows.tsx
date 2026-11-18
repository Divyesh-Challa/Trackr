import Link from "next/link";
import { MapPin } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { termLabel } from "@/lib/feed";
import type { DiscoveredJob } from "@/types";

function postedAgo(job: DiscoveredJob) {
  const days = Math.floor((Date.now() - new Date(job.posted_at ?? job.created_at).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : days < 30 ? `${days}d ago` : `${Math.floor(days / 30)}mo ago`;
}

/** Plain, crawlable rows that open each job's own page. */
export function JobRows({ jobs }: { jobs: DiscoveredJob[] }) {
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-simplify-card">
      {jobs.map((job) => (
        <li key={job.id}>
          <Link href={`/discover/${job.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
            <CompanyLogo name={job.company_name} domain={job.company_domain} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{job.role_title}</p>
              <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-slate-600">
                <span className="truncate">{job.company_name}</span>
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {job.locations[0] ?? "Canada"}
                </span>
                {job.terms.length > 0 && <span className="text-[#0066FF]">{job.terms.map(termLabel).join(" · ")}</span>}
              </p>
            </div>
            <div className="hidden shrink-0 text-right text-[13px] sm:block">
              {job.salary && <p className="font-medium text-emerald-700">{job.salary}</p>}
              <p className="text-slate-500">{postedAgo(job)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
