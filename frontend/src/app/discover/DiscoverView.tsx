"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  ExternalLink,
  EyeOff,
  Flag,
  Flame,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import { createApplication, hideJob, reportJob, unhideJob, type ReportReason } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  DISCIPLINES,
  JOB_TYPES,
  PAGE_SIZE,
  POSTED_WITHIN,
  PROVINCES,
  SEEN_COOKIE,
  SORTS,
  WORK_MODELS,
  feedSearchParams,
  termLabel,
  upcomingTerms,
  type FeedFilters,
  type FeedPulse,
} from "@/lib/feed";
import type { DiscoveredJob } from "@/types";
import Dialog from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import VantaBackground from "@/components/ui/VantaBackground";
import { useGSAPStagger } from "@/lib/useGSAPStagger";
import JobAi from "./JobAi";

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

const REPORT_REASONS: { code: ReportReason; label: string }[] = [
  { code: "expired", label: "The posting is closed or expired" },
  { code: "wrong_info", label: "Details are wrong (pay, term, location)" },
  { code: "not_canada", label: "It isn't in Canada" },
  { code: "not_student", label: "It isn't a student or new grad role" },
  { code: "duplicate", label: "It's a duplicate of another listing" },
  { code: "other", label: "Something else" },
];

function postedAgo(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function minutesAgo(iso: string, now: number) {
  const mins = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
}

const isNew = (iso: string | null) => Boolean(iso) && Date.now() - new Date(iso!).getTime() < 2 * 86_400_000;

function placeLabel(job: DiscoveredJob) {
  if (job.locations.length > 1) return `${job.locations[0]} +${job.locations.length - 1}`;
  return job.locations[0] ?? ([job.city, job.province].filter(Boolean).join(", ") || "Canada");
}

/** Eligibility limits worth seeing before clicking in. */
function eligibilityFlags(job: DiscoveredJob): string[] {
  return [
    job.citizenship_required && "Citizens / PR only",
    job.clearance_required && "Security clearance",
    job.min_gpa != null && `GPA ${job.min_gpa.toFixed(2).replace(/0$/, "")}+`,
  ].filter((f): f is string => Boolean(f));
}

/** "72% skill match" with a small ring; green, amber or grey by how much of the job's stack the resume covers. */
function MatchBadge({ percent }: { percent: number }) {
  const tone = percent >= 70 ? "text-emerald-700 bg-emerald-50" : percent >= 40 ? "text-amber-800 bg-amber-50" : "text-slate-600 bg-slate-100";
  const r = 5;
  const c = 2 * Math.PI * r;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`} title="Share of this job's skills that appear on your resume">
      <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 -rotate-90" aria-hidden>
        <circle cx="7" cy="7" r={r} fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.5" />
        <circle cx="7" cy="7" r={r} fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} strokeLinecap="round" />
      </svg>
      {percent}% skill match
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

/** A toolbar button that opens a small panel; closes on outside click and Escape. */
function Menu({
  label,
  count = 0,
  align = "left",
  icon,
  children,
}: {
  label: string;
  count?: number;
  align?: "left" | "right";
  icon?: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${
          count > 0 || open
            ? "border-[#0066FF]/60 bg-blue-50 text-[#0066FF]"
            : "border-slate-200 bg-surface text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        }`}
      >
        {icon}
        {label}
        {count > 0 && (
          <span className="rounded-full bg-[#0066FF] px-1.5 text-[11px] font-semibold leading-4 text-white">{count}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className={`absolute top-full z-30 mt-2 w-max min-w-52 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200 bg-surface p-3 shadow-lg ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            {children(() => setOpen(false))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "● Live · updated 12 min ago · 24 new today …": tells the visitor the feed is fresh. */
function PulseLine({ pulse }: { pulse: FeedPulse }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const parts = [
    pulse.lastRefresh && `Updated ${minutesAgo(pulse.lastRefresh, now)}`,
    pulse.newToday > 0 && `${pulse.newToday.toLocaleString()} new today`,
    // A handful of students reads as an empty room, so only show it once it's a crowd.
    pulse.trackersWeek >= 5 && `${pulse.trackersWeek.toLocaleString()} students tracked roles this week`,
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">
      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
      {parts.map((p) => (
        <React.Fragment key={String(p)}>
          <span aria-hidden className="text-slate-300">
            ·
          </span>
          <span>{p}</span>
        </React.Fragment>
      ))}
      {pulse.newSinceVisit != null && pulse.newSinceVisit > 0 && (
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          {pulse.newSinceVisit.toLocaleString()} new since your last visit
        </span>
      )}
    </div>
  );
}

function ReportDialog({ job, open, onClose }: { job: DiscoveredJob; open: boolean; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const report = useMutation({
    mutationFn: () => reportJob(job.id, reason!, note),
    onSuccess: () => {
      toast("Thanks, we'll take a look at this listing.", "success");
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} title="Report this listing" description={`${job.role_title} at ${job.company_name}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reason) report.mutate();
        }}
        className="space-y-4"
      >
        <fieldset className="space-y-1.5">
          <legend className="sr-only">What&apos;s wrong?</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r.code}
              className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition ${
                reason === r.code ? "border-[#0066FF] bg-blue-50 text-slate-900" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="report-reason"
                value={r.code}
                checked={reason === r.code}
                onChange={() => setReason(r.code)}
                className="accent-[#0066FF]"
              />
              {r.label}
            </label>
          ))}
        </fieldset>
        <label className="block text-sm text-slate-700">
          Anything else? <span className="text-slate-500">(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
          />
        </label>
        {report.isError && (
          <p role="alert" className="text-sm text-red-600">
            {report.error.message}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!reason || report.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-50"
          >
            {report.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Send report
          </button>
        </div>
      </form>
    </Dialog>
  );
}

const trackInput = (job: DiscoveredJob, status: "WISHLIST" | "APPLIED") => ({
  company_name: job.company_name,
  role_title: job.role_title,
  status,
  salary_range: job.salary,
  job_location: placeLabel(job),
  work_model: job.work_model,
  job_id: job.id,
  job_url: job.job_url,
});

/** A single job on its own page (/discover/[id]), with the same track buttons as the feed. */
export function JobPage({ job, signedIn, initiallyTracked }: { job: DiscoveredJob; signedIn: boolean; initiallyTracked: boolean }) {
  const [tracked, setTracked] = useState(initiallyTracked);
  const track = useMutation({
    mutationFn: (status: "WISHLIST" | "APPLIED") => createApplication(trackInput(job, status)),
    onSuccess: () => setTracked(true),
    onError: (err: Error) => {
      if (err.message.includes("duplicate key")) setTracked(true);
    },
  });
  return (
    <JobDetail
      job={job}
      signedIn={signedIn}
      tracked={tracked}
      tracking={track.isPending}
      trackError={track.isError && !track.error.message.includes("duplicate key") ? track.error.message : null}
      onTrack={(status) => track.mutate(status)}
    />
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
  const [reportOpen, setReportOpen] = useState(false);
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
    // The job page already has the description, so it renders on the server for search engines.
    initialData: job.description || undefined,
    staleTime: Infinity,
  });

  const facts = [
    { label: "Pay", value: job.salary ?? "Not listed" },
    { label: "Program", value: job.job_type ? PROGRAM_LABELS[job.job_type] : "Internship / Co-op" },
    { label: "Term", value: job.terms.length ? job.terms.map(termLabel).join(", ") : "Not stated" },
    { label: "Posted", value: postedAgo(job.posted_at) ?? "Unknown" },
  ];
  const flags = eligibilityFlags(job);

  return (
    <article className="space-y-5">
      <header className="space-y-3 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-11 w-11" />
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

        {(flags.length > 0 || job.is_repost) && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Eligibility">
            {flags.map((f) => (
              <li key={f} className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
                <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> {f}
              </li>
            ))}
            {job.is_repost && (
              <li className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reposted
              </li>
            )}
          </ul>
        )}

        {(job.skills?.length ?? 0) > 0 && (
          <div className="space-y-1.5">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Skills mentioned
              {job.match_percent != null && <MatchBadge percent={job.match_percent} />}
            </p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Skills mentioned">
              {job.skills!.map((sk) => (
                <li key={sk} className="rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{sk}</li>
              ))}
            </ul>
          </div>
        )}

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
            <dd className={`mt-0.5 text-sm font-medium ${f.label === "Pay" && job.salary ? "text-emerald-700" : "text-slate-900"}`}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>

      {signedIn && <JobAi jobId={job.id} />}

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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <p>
          Found via {SOURCE_LABELS[job.source] ?? job.source}. Details can change; the employer&apos;s posting is
          the source of truth.{" "}
          <Link href={`/discover/${job.id}`} className="underline">
            Link to this job
          </Link>
        </p>
        {signedIn ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden /> Report a problem
          </button>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
          >
            <Flag className="h-3.5 w-3.5" aria-hidden /> Sign in to report a problem
          </Link>
        )}
      </div>
      {signedIn && <ReportDialog job={job} open={reportOpen} onClose={() => setReportOpen(false)} />}
    </article>
  );
}

function JobCard({
  job,
  selected,
  tracked,
  onSelect,
}: {
  job: DiscoveredJob;
  selected: boolean;
  tracked: boolean;
  onSelect: () => void;
}) {
  const flags = eligibilityFlags(job);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={`w-full rounded-2xl border bg-surface p-4 text-left transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md motion-reduce:hover:translate-y-0 ${
        selected ? "border-[#0066FF] shadow-md ring-2 ring-[#0066FF]/15" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2 pr-7">
            <span className="truncate text-[13px] font-medium text-slate-600">{job.company_name}</span>
            <span className="shrink-0 text-xs text-slate-500">{postedAgo(job.posted_at)}</span>
          </div>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900">{job.role_title}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-600">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
              {placeLabel(job)}
            </span>
            {job.salary && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">{job.salary}</span>
            )}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {job.match_percent != null && <MatchBadge percent={job.match_percent} />}
            {isNew(job.posted_at) && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">New</span>
            )}
            {(job.trackers_week ?? 0) >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                <Flame className="h-3 w-3" aria-hidden /> {job.trackers_week} tracking
              </span>
            )}
            {job.terms.map((t) => (
              <span key={t} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                {termLabel(t)}
              </span>
            ))}
            {(job.job_type === "coop" || job.job_type === "new_grad") && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {PROGRAM_LABELS[job.job_type]}
              </span>
            )}
            {job.company_size && job.company_size !== "large" && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">Startup / mid-size</span>
            )}
            {flags.map((f) => (
              <span key={f} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                {f}
              </span>
            ))}
            {job.is_repost && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Reposted</span>
            )}
            {tracked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <Check className="h-3 w-3" aria-hidden /> Tracked
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function DiscoverView({
  jobs,
  total,
  filters,
  signedIn,
  trackedJobIds,
  pulse,
}: {
  jobs: DiscoveredJob[];
  total: number;
  filters: FeedFilters;
  signedIn: boolean;
  trackedJobIds: string[];
  pulse: FeedPulse;
}) {
  const router = useRouter();
  const toast = useToast();
  const reduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(filters.q);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [tracked, setTracked] = useState(() => new Set(trackedJobIds));
  // Cards hidden (or restored, in the Hidden view) since the server rendered this page.
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());
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
  useEffect(() => setRemoved(new Set()), [jobs]);

  // Remember this visit for "new since your last visit". Only roll it forward after an hour
  // away, so the count stays put while someone is browsing.
  useEffect(() => {
    const match = document.cookie.match(new RegExp(`(?:^|; )${SEEN_COOKIE}=([^;]*)`));
    const last = match ? Date.parse(decodeURIComponent(match[1])) : NaN;
    if (Number.isNaN(last) || Date.now() - last > 3_600_000) {
      document.cookie = `${SEEN_COOKIE}=${encodeURIComponent(new Date().toISOString())}; path=/discover; max-age=31536000; samesite=lax`;
    }
  }, []);

  const visible = jobs.filter((j) => !removed.has(j.id));
  const selected = visible.find((j) => j.id === selectedId) ?? visible[0] ?? null;

  const apply = (change: Partial<FeedFilters>) => {
    const next = feedSearchParams({ ...filters, page: 1, ...change }).toString();
    startTransition(() => router.push(next ? `/discover?${next}` : "/discover", { scroll: false }));
    setSelectedId(null);
  };
  const toggle = (key: "provinces" | "terms" | "disciplines" | "workModels" | "jobTypes", value: string) => {
    const current: string[] = filters[key];
    apply({ [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  };

  const trackMutation = useMutation({
    mutationFn: ({ job, status }: { job: DiscoveredJob; status: "WISHLIST" | "APPLIED" }) =>
      createApplication(trackInput(job, status)),
    onSuccess: (_data, { job }) => setTracked((prev) => new Set(prev).add(job.id)),
    onError: (err: Error, { job }) => {
      if (err.message.includes("duplicate key")) setTracked((prev) => new Set(prev).add(job.id));
    },
  });

  const setRemovedFlag = (id: string, on: boolean) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  // Hide in the feed, restore in the Hidden view. The card leaves right away; a failure puts it back.
  const hideMutation = useMutation({
    mutationFn: ({ job, restore }: { job: DiscoveredJob; restore: boolean }) =>
      restore ? unhideJob(job.id) : hideJob(job.id),
    onMutate: ({ job }) => setRemovedFlag(job.id, true),
    onError: (err: Error, { job }) => {
      setRemovedFlag(job.id, false);
      toast(err.message, "error");
    },
    onSuccess: (_data, { job, restore }) =>
      toast(restore ? "Back in your feed" : "Hidden from your feed", "success", {
        label: "Undo",
        run: () =>
          (restore ? hideJob(job.id) : unhideJob(job.id))
            .then(() => setRemovedFlag(job.id, false))
            .catch((e: Error) => toast(e.message, "error")),
      }),
  });

  const otherFilterCount =
    filters.provinces.length + filters.terms.length + filters.disciplines.length +
    filters.workModels.length + filters.jobTypes.length + Number(filters.smallCompanies) + Number(filters.bigTech) + Number(Boolean(filters.postedWithin));
  const hasFilters = Boolean(filters.q) || otherFilterCount > 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const sort = SORTS.find((s) => s.code === filters.sort)!;

  const activeChips: { key: string; label: string; remove: () => void }[] = [
    ...filters.terms.map((t) => ({ key: `t-${t}`, label: termLabel(t), remove: () => toggle("terms", t) })),
    ...filters.provinces.map((p) => ({
      key: `p-${p}`,
      label: PROVINCES.find((x) => x.code === p)?.label ?? p,
      remove: () => toggle("provinces", p),
    })),
    ...filters.workModels.map((m) => ({
      key: `m-${m}`,
      label: WORK_MODELS.find((x) => x.code === m)!.label,
      remove: () => toggle("workModels", m),
    })),
    ...filters.jobTypes.map((t) => ({
      key: `j-${t}`,
      label: JOB_TYPES.find((x) => x.code === t)!.label,
      remove: () => toggle("jobTypes", t),
    })),
    ...filters.disciplines.map((d) => ({
      key: `d-${d}`,
      label: DISCIPLINES.find((x) => x.code === d)?.label ?? d,
      remove: () => toggle("disciplines", d),
    })),
    ...(filters.bigTech ? [{ key: "big", label: "Big tech", remove: () => apply({ bigTech: false }) }] : []),
    ...(filters.smallCompanies ? [{ key: "small", label: "Startups & mid-size", remove: () => apply({ smallCompanies: false }) }] : []),
    ...(filters.postedWithin
      ? [{
          key: "posted",
          label: POSTED_WITHIN.find((p) => p.days === filters.postedWithin)!.label,
          remove: () => apply({ postedWithin: null }),
        }]
      : []),
    ...(filters.q ? [{ key: "q", label: `“${filters.q}”`, remove: () => { setQuery(""); apply({ q: "" }); } }] : []),
  ];

  return (
    <div className="space-y-4">
      <header className="relative overflow-hidden rounded-2xl border border-slate-200 bg-surface p-5 shadow-simplify-card">
        <VantaBackground className="opacity-50" lines={3} waveHeight={16} />
        <div className="relative space-y-2">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Internships, co-ops &amp; new grad roles in Canada
          </h1>
          <PulseLine pulse={pulse} />
        </div>
      </header>

      <section
        aria-label="Search and filters"
        className="sticky top-14 z-20 -mx-1 space-y-3 rounded-2xl border border-slate-200 bg-surface/90 p-3 shadow-simplify-card backdrop-blur-md"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q: query.trim() });
            }}
            className="relative flex-1"
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
          {signedIn && (
            <div role="group" aria-label="Which listings" className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-1 text-[13px] font-medium">
              {[
                { hidden: false, label: "Feed" },
                { hidden: true, label: "Hidden" },
              ].map((v) => (
                <button
                  key={v.label}
                  type="button"
                  aria-pressed={filters.hidden === v.hidden}
                  onClick={() => apply({ hidden: v.hidden })}
                  className={`flex-1 rounded-lg px-3 py-1.5 transition ${
                    filters.hidden === v.hidden ? "bg-surface text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Menu label="Term" count={filters.terms.length}>
            {() => (
              <div className="flex flex-wrap gap-2">
                {terms.map((t) => (
                  <Chip key={t} active={filters.terms.includes(t)} onClick={() => toggle("terms", t)}>
                    {termLabel(t)}
                  </Chip>
                ))}
              </div>
            )}
          </Menu>
          <Menu label="Location" count={filters.provinces.length}>
            {() => (
              <div className="grid grid-cols-2 gap-2">
                {PROVINCES.map((p) => (
                  <Chip key={p.code} active={filters.provinces.includes(p.code)} onClick={() => toggle("provinces", p.code)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
            )}
          </Menu>
          <Menu label="Work mode" count={filters.workModels.length}>
            {() => (
              <div className="flex flex-wrap gap-2">
                {WORK_MODELS.map((m) => (
                  <Chip key={m.code} active={filters.workModels.includes(m.code)} onClick={() => toggle("workModels", m.code)}>
                    {m.label}
                  </Chip>
                ))}
              </div>
            )}
          </Menu>
          <Menu label="Program" count={filters.jobTypes.length}>
            {() => (
              <div className="flex flex-wrap gap-2">
                {JOB_TYPES.map((t) => (
                  <Chip key={t.code} active={filters.jobTypes.includes(t.code)} onClick={() => toggle("jobTypes", t.code)}>
                    {t.label}
                  </Chip>
                ))}
              </div>
            )}
          </Menu>
          <Menu label="Field" count={filters.disciplines.length}>
            {() => (
              <div className="grid grid-cols-2 gap-2">
                {DISCIPLINES.map((d) => (
                  <Chip key={d.code} active={filters.disciplines.includes(d.code)} onClick={() => toggle("disciplines", d.code)}>
                    {d.label}
                  </Chip>
                ))}
              </div>
            )}
          </Menu>
          <Menu label="Company" count={Number(filters.bigTech) + Number(filters.smallCompanies)}>
            {() => (
              <div className="flex flex-wrap gap-2">
                <Chip active={filters.bigTech} onClick={() => apply({ bigTech: !filters.bigTech })}>
                  Big tech
                </Chip>
                <Chip active={filters.smallCompanies} onClick={() => apply({ smallCompanies: !filters.smallCompanies })}>
                  Startups &amp; mid-size
                </Chip>
              </div>
            )}
          </Menu>
          <Menu label="Posted" count={Number(Boolean(filters.postedWithin))}>
            {(close) => (
              <div className="flex flex-col gap-1">
                {[{ days: null, label: "Any time" }, ...POSTED_WITHIN].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    aria-pressed={filters.postedWithin === p.days}
                    onClick={() => {
                      apply({ postedWithin: p.days });
                      close();
                    }}
                    className={`flex items-center justify-between gap-6 rounded-lg px-2.5 py-1.5 text-left text-sm ${
                      filters.postedWithin === p.days ? "bg-blue-50 font-medium text-[#0066FF]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                    {filters.postedWithin === p.days && <Check className="h-4 w-4" aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </Menu>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-[13px] text-slate-600 sm:inline" aria-live="polite">
              {isPending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Updating
                </span>
              ) : (
                `${total.toLocaleString()} ${filters.hidden ? "hidden" : "open"} role${total === 1 ? "" : "s"}`
              )}
            </span>
            <Menu label={sort.label} align="right" icon={<ArrowUpDown className="h-3.5 w-3.5" aria-hidden />}>
              {(close) => (
                <div className="flex w-72 max-w-full flex-col gap-1">
                  {SORTS.filter((s) => signedIn || s.code !== "match").map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      aria-pressed={filters.sort === s.code}
                      onClick={() => {
                        apply({ sort: s.code });
                        close();
                      }}
                      className={`rounded-lg px-2.5 py-2 text-left ${
                        filters.sort === s.code ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex items-center justify-between text-sm font-medium ${filters.sort === s.code ? "text-[#0066FF]" : "text-slate-900"}`}>
                        {s.label}
                        {filters.sort === s.code && <Check className="h-4 w-4" aria-hidden />}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-slate-500">{s.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </Menu>
          </div>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
            {activeChips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={c.remove}
                aria-label={`Remove filter ${c.label}`}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#0066FF] transition hover:bg-blue-100"
              >
                {c.label} <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  apply({ q: "", provinces: [], terms: [], disciplines: [], workModels: [], jobTypes: [], smallCompanies: false, bigTech: false, postedWithin: null });
                }}
                className="ml-1 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </section>

      <p className="text-[13px] text-slate-600 sm:hidden" aria-live="polite">
        {isPending ? "Updating…" : `${total.toLocaleString()} ${filters.hidden ? "hidden" : "open"} role${total === 1 ? "" : "s"}`}
        {filters.page > 1 ? ` · page ${filters.page} of ${pages}` : ""}
      </p>

      {signedIn && !filters.hidden && visible.length > 0 && visible.every((j) => j.match_percent == null) && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-surface px-4 py-2.5 text-[13px] text-slate-600">
          Want skill match scores and a feed ranked for you? Add a skills line to your{" "}
          <Link href="/resume" className="font-medium text-[#0066FF] hover:underline">resume</Link> and set target roles and provinces in your{" "}
          <Link href="/profile" className="font-medium text-[#0066FF] hover:underline">profile</Link>.
        </p>
      )}

      <div className={`grid grid-cols-1 items-start gap-4 transition-opacity lg:grid-cols-12 ${isPending ? "opacity-60" : ""}`}>
        <ul ref={resultsRef} className="space-y-2.5 lg:col-span-5" aria-label="Job results">
          {visible.length === 0 && (
            <li className="rounded-2xl border border-slate-200 bg-surface p-8 text-center text-sm text-slate-600">
              {filters.hidden ? "You haven't hidden any listings." : "No open roles match these filters."}
            </li>
          )}
          <AnimatePresence initial={false}>
            {visible.map((job) => (
              <motion.li
                key={job.id}
                data-stagger
                className="group relative"
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, height: 0, marginTop: 0 }}
                transition={{ duration: 0.22 }}
              >
                <JobCard
                  job={job}
                  selected={selected?.id === job.id}
                  tracked={tracked.has(job.id)}
                  onSelect={() => {
                    setSelectedId(job.id);
                    setMobileDetailOpen(true);
                  }}
                />
                {signedIn && (
                  <button
                    type="button"
                    onClick={() => hideMutation.mutate({ job, restore: filters.hidden })}
                    aria-label={filters.hidden ? `Restore ${job.role_title} at ${job.company_name}` : `Hide ${job.role_title} at ${job.company_name}`}
                    title={filters.hidden ? "Restore to feed" : "Hide this job"}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 opacity-100 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    {filters.hidden ? <RotateCcw className="h-4 w-4" aria-hidden /> : <EyeOff className="h-4 w-4" aria-hidden />}
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>

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
              <span className="text-[13px] text-slate-500">
                Page {filters.page} of {pages}
              </span>
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
            className={`lg:col-span-7 lg:sticky lg:top-44 lg:block ${
              mobileDetailOpen ? "fixed inset-0 z-50 overflow-y-auto bg-surface p-4" : "hidden"
            } lg:inset-auto lg:z-auto lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-slate-200 lg:p-6 lg:shadow-simplify-card`}
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
        . Every listing links to the original posting. Listings refresh every 6 hours.
      </footer>
    </div>
  );
}
