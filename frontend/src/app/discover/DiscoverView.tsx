"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { Check, ExternalLink, Loader2, MapPin, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { createApplication } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  DISCIPLINES,
  PAGE_SIZE,
  POSTED_WITHIN,
  PROVINCES,
  feedSearchParams,
  termLabel,
  upcomingTerms,
  type FeedFilters,
} from "@/lib/feed";
import type { DiscoveredJob } from "@/types";
import VantaBackground from "@/components/ui/VantaBackground";
import { useGSAPStagger } from "@/lib/useGSAPStagger";

const PROGRAM_LABELS: Record<NonNullable<DiscoveredJob["job_type"]>, string> = {
  internship: "Internship",
  coop: "Co-op",
  new_grad: "New grad",
  full_time: "Full-time",
};

const SOURCE_LABELS: Record<string, string> = {
  greenhouse: "the company's Greenhouse board",
  lever: "the company's Lever board",
  ashby: "the company's Ashby board",
  workable: "the company's Workable board",
  smartrecruiters: "the company's SmartRecruiters board",
  recruitee: "the company's Recruitee board",
  simplify: "SimplifyJobs/Summer2027-Internships",
  "canadian-tech-internships": "negarprh/Canadian-Tech-Internships-2027",
  "canadian-internship-list": "Bobwillrule/Canadian-Internship-List",
};

function postedAgo(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function placeLabel(job: DiscoveredJob) {
  if (job.locations.length > 1) return `${job.locations[0]} +${job.locations.length - 1}`;
  return job.locations[0] ?? ([job.city, job.province].filter(Boolean).join(", ") || "Canada");
}

function CompanyMark({ job, size = "h-9 w-9" }: { job: DiscoveredJob; size?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = job.company_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  if (job.company_domain && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(job.company_domain)}&sz=64`}
        alt=""
        onError={() => setFailed(true)}
        className={`${size} shrink-0 rounded-xl border border-slate-200 bg-surface object-contain p-1`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-semibold text-slate-600`}
    >
      {initials}
    </span>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-xl border px-3 py-1.5 text-[13px] font-medium transition ${
        active
          ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
          : "border-slate-200 bg-surface text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function JobDetail({
  job,
  signedIn,
  tracked,
  onTrack,
  tracking,
  trackError,
}: {
  job: DiscoveredJob;
  signedIn: boolean;
  tracked: boolean;
  onTrack: (status: "WISHLIST" | "APPLIED") => void;
  tracking: boolean;
  trackError: string | null;
}) {
  const pathname = usePathname();
  const { data: description, isLoading } = useQuery({
    queryKey: ["job-description", job.id],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("jobs")
        .select("description_md")
        .eq("id", job.id)
        .single();
      if (error) throw new Error(error.message);
      return data.description_md;
    },
    staleTime: Infinity,
  });

  const facts = [
    { label: "Pay", value: job.salary ?? "Not listed" },
    { label: "Program", value: job.job_type ? PROGRAM_LABELS[job.job_type] : "Internship / Co-op" },
    { label: "Term", value: job.terms.length ? job.terms.map(termLabel).join(", ") : "Not stated" },
    { label: "Posted", value: postedAgo(job.posted_at) ?? "Unknown" },
  ];

  return (
    <article className="space-y-5">
      <header className="space-y-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <CompanyMark job={job} size="h-11 w-11" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{job.company_name}</p>
            <p className="flex items-center gap-1 text-[13px] text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>
                {job.locations.join(" · ") || "Canada"}
                {job.work_model ? ` · ${job.work_model.toLowerCase()}` : ""}
              </span>
            </p>
          </div>
        </div>
        <h2 className="font-serif text-2xl font-semibold leading-tight text-slate-900">{job.role_title}</h2>

        <div className="flex flex-wrap items-center gap-2">
          {tracked ? (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3.5 py-2 text-sm font-medium text-emerald-700">
              <Check className="h-4 w-4" aria-hidden /> In your tracker
            </span>
          ) : signedIn ? (
            <>
              <button
                type="button"
                disabled={tracking}
                onClick={() => onTrack("WISHLIST")}
                className="rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Save to wishlist
              </button>
              <button
                type="button"
                disabled={tracking}
                onClick={() => onTrack("APPLIED")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60"
              >
                {tracking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
                I applied
              </button>
            </>
          ) : (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Sign in to track this
            </Link>
          )}
          <a
            href={job.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Apply on {job.company_name}&apos;s site <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        </div>
        {trackError && (
          <p role="alert" className="text-sm text-red-600">
            {trackError}
          </p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{f.label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Job description" className="text-sm leading-relaxed text-slate-700">
        {isLoading ? (
          <p className="text-slate-500">Loading description…</p>
        ) : description ? (
          <ReactMarkdown
            components={{
              h1: (p) => <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900" {...p} />,
              h2: (p) => <h3 className="mb-2 mt-5 text-base font-semibold text-slate-900" {...p} />,
              h3: (p) => <h4 className="mb-1.5 mt-4 font-semibold text-slate-900" {...p} />,
              h4: (p) => <h4 className="mb-1.5 mt-4 font-semibold text-slate-900" {...p} />,
              p: (p) => <p className="mb-3" {...p} />,
              ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5" {...p} />,
              ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...p} />,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="text-[#0066FF] underline">
                  {children}
                </a>
              ),
            }}
          >
            {description}
          </ReactMarkdown>
        ) : (
          <p className="text-slate-600">
            This listing doesn&apos;t include a description. See the full posting on the employer&apos;s site.
          </p>
        )}
      </section>

      <p className="border-t border-slate-100 pt-4 text-xs text-slate-500">
        Found via {SOURCE_LABELS[job.source] ?? job.source}. Details can change; the employer&apos;s posting is
        the source of truth.
      </p>
    </article>
  );
}

export default function DiscoverView({
  jobs,
  total,
  filters,
  signedIn,
  trackedJobIds,
}: {
  jobs: DiscoveredJob[];
  total: number;
  filters: FeedFilters;
  signedIn: boolean;
  trackedJobIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tracked, setTracked] = useState(() => new Set(trackedJobIds));
  const terms = useMemo(() => upcomingTerms(), []);
  const resultsRef = useGSAPStagger<HTMLUListElement>({
    selector: "[data-stagger]",
    triggerDeps: [jobs.map((j) => j.id).join()],
    y: 10,
    duration: 0.35,
    stagger: 0.035,
  });

  useEffect(() => setQuery(filters.q), [filters.q]);
  useEffect(() => setTracked(new Set(trackedJobIds)), [trackedJobIds]);

  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null;

  const apply = (change: Partial<FeedFilters>) => {
    const next = feedSearchParams({ ...filters, page: 1, ...change }).toString();
    startTransition(() => router.push(next ? `/discover?${next}` : "/discover", { scroll: false }));
    setSelectedId(null);
  };
  const toggle = (key: "provinces" | "terms" | "disciplines", value: string) =>
    apply({
      [key]: filters[key].includes(value) ? filters[key].filter((v) => v !== value) : [...filters[key], value],
    });

  const trackMutation = useMutation({
    mutationFn: ({ job, status }: { job: DiscoveredJob; status: "WISHLIST" | "APPLIED" }) =>
      createApplication({
        company_name: job.company_name,
        role_title: job.role_title,
        status,
        salary_range: job.salary,
        job_location: placeLabel(job),
        work_model: job.work_model,
        job_id: job.id,
        job_url: job.job_url,
      }),
    onSuccess: (_data, { job }) => setTracked((prev) => new Set(prev).add(job.id)),
    onError: (err: Error, { job }) => {
      if (err.message.includes("duplicate key")) setTracked((prev) => new Set(prev).add(job.id));
    },
  });

  const hasFilters =
    filters.q || filters.provinces.length || filters.terms.length || filters.disciplines.length ||
    filters.remote || filters.smallCompanies || filters.postedWithin;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeFilterCount =
    filters.provinces.length + filters.terms.length + filters.disciplines.length +
    Number(filters.remote) + Number(filters.smallCompanies) + Number(Boolean(filters.postedWithin));

  return (
    <div className="space-y-4">
      <header className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-surface p-5 shadow-simplify-card md:flex-row md:items-end md:justify-between">
        <VantaBackground className="opacity-50" lines={3} waveHeight={16} />
        <div className="relative">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Internships &amp; co-ops in Canada
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            From company career sites and community lists, refreshed every 6 hours.
          </p>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            apply({ q: query.trim() });
          }}
          className="relative w-full md:w-96"
        >
          <label htmlFor="feed-search" className="sr-only">
            Search jobs
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="feed-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles or companies (e.g. firmware, Shopify)"
            className="w-full rounded-xl border border-slate-300 bg-surface py-2.5 pl-9 pr-3 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
          />
        </form>
      </header>

      <button
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
        aria-controls="feed-filters"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-surface px-3.5 py-2.5 text-sm font-medium text-slate-800 md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {filtersOpen ? "Hide filters" : "Filters"}
        {activeFilterCount > 0 && (
          <span className="rounded-full bg-[#0066FF] px-2 py-0.5 text-xs font-semibold text-white">{activeFilterCount}</span>
        )}
      </button>

      <section
        id="feed-filters"
        aria-label="Filters"
        className={`${filtersOpen ? "block" : "hidden"} space-y-3 rounded-2xl border border-slate-200 bg-surface p-4 shadow-simplify-card md:block`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-[13px] font-medium text-slate-500 sm:w-20">Term</span>
          {terms.map((t) => (
            <Chip key={t} active={filters.terms.includes(t)} onClick={() => toggle("terms", t)}>
              {termLabel(t)}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-[13px] font-medium text-slate-500 sm:w-20">Where</span>
          {PROVINCES.slice(0, 4).map((p) => (
            <Chip key={p.code} active={filters.provinces.includes(p.code)} onClick={() => toggle("provinces", p.code)}>
              {p.label}
            </Chip>
          ))}
          <label className="sr-only" htmlFor="more-provinces">
            Other provinces
          </label>
          <select
            id="more-provinces"
            value=""
            onChange={(e) => e.target.value && toggle("provinces", e.target.value)}
            className="rounded-xl border border-slate-200 bg-surface px-2.5 py-1.5 text-[13px] text-slate-700"
          >
            <option value="">More…</option>
            {PROVINCES.slice(4).map((p) => (
              <option key={p.code} value={p.code}>
                {filters.provinces.includes(p.code) ? `✓ ${p.label}` : p.label}
              </option>
            ))}
          </select>
          <Chip active={filters.remote} onClick={() => apply({ remote: !filters.remote })}>
            Remote only
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-[13px] font-medium text-slate-500 sm:w-20">Field</span>
          {DISCIPLINES.map((d) => (
            <Chip key={d.code} active={filters.disciplines.includes(d.code)} onClick={() => toggle("disciplines", d.code)}>
              {d.label}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-full text-[13px] font-medium text-slate-500 sm:w-20">Company</span>
          <Chip active={filters.smallCompanies} onClick={() => apply({ smallCompanies: !filters.smallCompanies })}>
            Startups &amp; mid-size
          </Chip>
          <label className="sr-only" htmlFor="posted-within">
            Posted within
          </label>
          <select
            id="posted-within"
            value={filters.postedWithin ?? ""}
            onChange={(e) => apply({ postedWithin: e.target.value ? Number(e.target.value) : null })}
            className="rounded-xl border border-slate-200 bg-surface px-2.5 py-1.5 text-[13px] text-slate-700"
          >
            <option value="">Any time</option>
            {POSTED_WITHIN.map((p) => (
              <option key={p.days} value={p.days}>
                {p.label}
              </option>
            ))}
          </select>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                startTransition(() => router.push("/discover", { scroll: false }));
              }}
              className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-slate-900"
            >
              <X className="h-3.5 w-3.5" aria-hidden /> Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <p className="text-[13px] text-slate-600" aria-live="polite">
        {isPending ? "Updating…" : `${total.toLocaleString()} open role${total === 1 ? "" : "s"}`}
        {filters.page > 1 ? ` · page ${filters.page} of ${pages}` : ""}
      </p>

      <div className={`grid grid-cols-1 items-start gap-4 lg:grid-cols-12 ${isPending ? "opacity-60" : ""}`}>
        <ul ref={resultsRef} className="space-y-2 lg:col-span-5" aria-label="Job results">
          {jobs.length === 0 && (
            <li className="rounded-2xl border border-slate-200 bg-surface p-8 text-center text-sm text-slate-600">
              No open roles match these filters.
            </li>
          )}
          {jobs.map((job) => {
            const isSelected = selected?.id === job.id;
            return (
              <li key={job.id} data-stagger>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(job.id);
                    setMobileDetailOpen(true);
                  }}
                  aria-current={isSelected ? "true" : undefined}
                  className={`w-full rounded-2xl border bg-surface p-4 text-left transition hover:border-slate-300 ${
                    isSelected ? "border-[#0066FF] ring-2 ring-[#0066FF]/15" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CompanyMark job={job} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-slate-600">{job.company_name}</span>
                        <span className="shrink-0 text-xs text-slate-500">{postedAgo(job.posted_at)}</span>
                      </div>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
                        {job.role_title}
                      </h3>
                      <p className="mt-1 text-[13px] text-slate-600">
                        {placeLabel(job)}
                        {job.salary ? <span className="text-emerald-700"> · {job.salary}</span> : null}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {job.terms.map((t) => (
                          <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {termLabel(t)}
                          </span>
                        ))}
                        {job.job_type === "coop" && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">Co-op</span>
                        )}
                        {job.company_size && job.company_size !== "large" && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Startup / mid-size
                          </span>
                        )}
                        {tracked.has(job.id) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                            <Check className="h-3 w-3" aria-hidden /> Tracked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}

          {pages > 1 && (
            <li className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={filters.page <= 1}
                onClick={() => apply({ page: filters.page - 1 })}
                className="rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={filters.page >= pages}
                onClick={() => apply({ page: filters.page + 1 })}
                className="rounded-xl border border-slate-300 bg-surface px-3.5 py-2 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </li>
          )}
        </ul>

        {selected && (
          <div
            data-lenis-prevent
            className={`lg:col-span-7 lg:sticky lg:top-20 lg:block ${
              mobileDetailOpen ? "fixed inset-0 z-50 overflow-y-auto bg-surface p-4" : "hidden"
            } lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:p-6 lg:shadow-simplify-card`}
          >
            <button
              type="button"
              onClick={() => setMobileDetailOpen(false)}
              className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-600 lg:hidden"
            >
              <X className="h-4 w-4" aria-hidden /> Back to results
            </button>
            <JobDetail
              key={selected.id}
              job={selected}
              signedIn={signedIn}
              tracked={tracked.has(selected.id)}
              tracking={trackMutation.isPending}
              trackError={
                trackMutation.isError && trackMutation.variables?.job.id === selected.id &&
                !trackMutation.error.message.includes("duplicate key")
                  ? trackMutation.error.message
                  : null
              }
              onTrack={(status) => trackMutation.mutate({ job: selected, status })}
            />
          </div>
        )}
      </div>

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
        Listings come from public company job boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters,
        Recruitee) and the community lists{" "}
        <a className="underline" href="https://github.com/SimplifyJobs/Summer2027-Internships" target="_blank" rel="noopener noreferrer">
          SimplifyJobs/Summer2027-Internships
        </a>
        ,{" "}
        <a className="underline" href="https://github.com/negarprh/Canadian-Tech-Internships-2027" target="_blank" rel="noopener noreferrer">
          negarprh/Canadian-Tech-Internships-2027
        </a>{" "}
        and{" "}
        <a className="underline" href="https://github.com/Bobwillrule/Canadian-Internship-List" target="_blank" rel="noopener noreferrer">
          Bobwillrule/Canadian-Internship-List
        </a>
        . Every listing links to the original posting.
      </footer>
    </div>
  );
}
