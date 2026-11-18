"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Bell } from "lucide-react";
import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import Magnet from "@/components/ui/Magnet";
import { termLabel, upcomingTerms } from "@/lib/feed";
import { springs } from "@/lib/motion-tokens";
import type { DiscoveredJob } from "@/types";
import type { FeedPulse } from "@/lib/feed";
import { PulseLine } from "@/components/PulseLine";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ResumeMatchDemo } from "@/components/landing/ResumeMatchDemo";

const FAQ = [
  {
    q: "Where do the jobs come from?",
    a: "Straight from employers' own job boards (Greenhouse, Lever, Ashby, Workday and more) and community-kept internship lists, checked every 6 hours. You always apply on the employer's site.",
  },
  {
    q: "Are closed or fake postings filtered out?",
    a: "A role drops off once it disappears from the employer's board. Reposts of the same role are labelled, and pay is only shown when the posting states it.",
  },
  {
    q: "Is Trackr free?",
    a: "The feed, skill match and a tracker board for up to 50 active applications are free. Pro removes the application limit and raises the limits on AI tools like resume tailoring and cover letters.",
  },
  {
    q: "How does the match score work?",
    a: "Trackr tags each posting with the skills it asks for and compares them with the skills on your resume. It's a quick guide, not a verdict: a 40% match can still be worth applying to.",
  },
  {
    q: "Can I bring my existing spreadsheet?",
    a: "Yes. Import a CSV into your board and every application keeps its stage, dates and notes. You can export everything again at any time.",
  },
  {
    q: "Which roles are listed?",
    a: "Internships, co-ops and new grad roles in Canada across software, data and ML, hardware, IT and security, product, quant and more, including remote roles open to Canadians.",
  },
];

/** The board columns the pinned stage shows, and what the travelling card says in each. */
const STAGES = [
  { id: "WISHLIST", title: "Wishlist", note: "Deadline in 6 days" },
  { id: "APPLIED", title: "Applied", note: "Applied today" },
  { id: "INTERVIEWING", title: "Interviewing", note: "Interview Thursday, 2:30" },
  { id: "OFFER", title: "Offer", note: "Offer received" },
] as const;
type StageId = (typeof STAGES)[number]["id"];

const where = (job: DiscoveredJob) => job.city || job.locations[0] || "Canada";

function BoardCard({ job, note, travelling }: { job: DiscoveredJob; note?: string; travelling?: boolean }) {
  return (
    <div className={`rounded-md p-2.5 ${travelling ? "bg-stage-ink text-stage" : "bg-stage-raised text-stage-ink"}`}>
      <div className="flex items-center gap-2">
        <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-5 w-5" />
        <p className={`truncate text-xs ${travelling ? "opacity-80" : "text-stage-muted"}`}>{job.company_name}</p>
      </div>
      <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug">{job.role_title}</p>
      <p className={`mt-1 truncate text-xs ${travelling ? "opacity-80" : "text-stage-muted"}`}>{note ?? where(job)}</p>
    </div>
  );
}

/** A real fragment of the board, filled with roles from today's feed. One card moves as the page scrolls. */
function Stage({ jobs, current, id }: { jobs: DiscoveredJob[]; current: StageId; id: string }) {
  const [traveller, ...rest] = jobs;
  const resting: Record<StageId, DiscoveredJob[]> = {
    WISHLIST: rest.slice(0, 2),
    APPLIED: rest.slice(2, 4),
    INTERVIEWING: rest.slice(4, 5),
    OFFER: [],
  };
  return (
    <div data-ui className="flex h-full flex-col justify-center bg-stage px-4 py-10 sm:px-8 lg:px-10">
      <div className="mb-5 flex items-baseline justify-between text-stage-muted">
        <p className="font-serif text-xl font-semibold text-stage-ink">Your board</p>
        <p className="text-xs">{termLabel(upcomingTerms()[0])} search</p>
      </div>
      <LayoutGroup id={id}>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {STAGES.map((s) => {
            const here = current === s.id;
            const count = resting[s.id].length + (here ? 1 : 0);
            return (
              <section key={s.id} aria-label={s.title} className="min-w-0 rounded-lg bg-stage-raised/50 p-1.5 sm:p-2">
                <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-medium text-stage-muted">
                  <span className="truncate">{s.title}</span>
                  <span className="tabular-nums">{count}</span>
                </h3>
                <div className="space-y-2">
                  {here && traveller && (
                    <motion.div layoutId="traveller" transition={springs.glide}>
                      <BoardCard job={traveller} note={s.note} travelling />
                    </motion.div>
                  )}
                  {resting[s.id].map((j) => (
                    <motion.div key={j.id} layout transition={springs.glide}>
                      <BoardCard job={j} />
                    </motion.div>
                  ))}
                  {count === 0 && <div className="h-16 rounded-md border border-dashed border-stage-line" />}
                </div>
              </section>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
}

/** The closing dialog: a real search that opens the feed with the visitor's words and term. */
function SearchDialog({ totalRoles }: { totalRoles: number }) {
  const router = useRouter();
  const terms = upcomingTerms(new Date(), 2);
  const [q, setQ] = useState("firmware");
  const [term, setTerm] = useState(terms[0]);
  return (
    <form
      data-ui
      onSubmit={(e) => {
        e.preventDefault();
        const p = new URLSearchParams({ term });
        if (q.trim()) p.set("q", q.trim());
        router.push(`/discover?${p}`);
      }}
      className="w-full max-w-[440px] rounded-lg bg-surface p-6 text-slate-900 shadow-2xl"
    >
      <h3 className="text-lg font-semibold">Search {totalRoles.toLocaleString()} roles</h3>
      <label htmlFor="cta-q" className="mt-5 block text-sm text-slate-600">Role, skill or company</label>
      <input
        id="cta-q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-slate-300 bg-surface px-3 py-2.5 text-base focus:border-accent focus:outline-none"
      />
      <fieldset className="mt-4">
        <legend className="text-sm text-slate-600">Term</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
          {terms.map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded px-3 py-2 text-center text-sm font-medium transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                term === t ? "bg-surface text-slate-900" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <input type="radio" name="term" value={t} checked={term === t} onChange={() => setTerm(t)} className="sr-only" />
              {termLabel(t)}
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent font-medium text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
      >
        Show roles <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}

export default function Landing({
  totalRoles,
  smallerCompanyRoles,
  companyCount,
  latest,
  topCompanies,
  pulse,
}: {
  totalRoles: number;
  smallerCompanyRoles: number;
  companyCount: number;
  latest: DiscoveredJob[];
  topCompanies: { name: string; domain: string | null; roles: number }[];
  pulse: FeedPulse;
}) {
  const [current, setCurrent] = useState<StageId>("WISHLIST");
  const column = useRef<HTMLDivElement>(null);

  // The section crossing the middle of the screen decides which column the travelling card sits in.
  useEffect(() => {
    const sections = column.current?.querySelectorAll<HTMLElement>("[data-stage]");
    if (!sections?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.getAttribute("data-stage") as StageId);
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const justPosted = latest.slice(6, 12);

  return (
    <MotionConfig reducedMotion="user">
      <div className="-mx-4 -mb-[7.5rem] -mt-6 sm:-mx-6">
        {/* The split stage: the board stays pinned on the left while the argument scrolls on the right. */}
        <div className="lg:grid lg:grid-cols-[47fr_53fr]">
          <div className="hidden lg:sticky lg:top-14 lg:block lg:h-[calc(100svh-3.5rem)]">
            <Stage id="pinned" jobs={latest.slice(0, 6)} current={current} />
          </div>

          <div ref={column} className="px-4 sm:px-10 lg:px-16 xl:px-20">
            <section data-stage="WISHLIST" className="flex flex-col justify-center pb-16 pt-12 lg:min-h-[calc(100svh-3.5rem)] lg:py-16">
              <h1 className="enter max-w-[14ch] font-serif text-[clamp(2.75rem,4.6vw,4.5rem)] font-semibold leading-[1.0] text-slate-900">
                Every Canadian co‑op, tracked.
              </h1>
              <p className="enter mt-8 max-w-[46ch] text-lg leading-relaxed text-slate-800 [--d:80ms] md:text-xl">
                Tech internships, co-ops and new grad roles from {companyCount.toLocaleString()} company job boards, refreshed
                every six hours. Save one, then follow it all the way to the offer.
              </p>
              <div className="enter mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 [--d:160ms]">
                <Magnet>
                  <Link
                    href="/discover"
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 text-base font-medium text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
                  >
                    Browse {totalRoles.toLocaleString()} roles <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Magnet>
                <Link href="/login?next=/board" className="text-base font-medium text-slate-900 underline-offset-4 hover:underline">
                  Start your board, free
                </Link>
              </div>
              <div className="enter mt-10 [--d:240ms]">
                <PulseLine pulse={pulse} />
              </div>
              <div className="-mx-4 mt-14 sm:-mx-10 lg:hidden">
                <Stage id="inline" jobs={latest.slice(0, 6)} current="APPLIED" />
              </div>
            </section>

            <section data-stage="WISHLIST" aria-labelledby="fresh-title" className="py-20">
              <h2 id="fresh-title" className="rise font-serif text-4xl font-semibold leading-tight text-slate-900">
                Fresh every six hours
              </h2>
              <p className="rise rise-2 mt-6 max-w-[46ch] text-lg leading-relaxed text-slate-800">
                Trackr reads company job boards directly, so a role shows up here hours after it goes live, and
                drops off when the company takes it down. These went up most recently:
              </p>
              <ul data-ui className="rise rise-3 mt-10 max-w-[600px] divide-y divide-slate-200 rounded-lg border border-slate-200 bg-surface">
                {justPosted.map((job) => (
                  <li key={job.id}>
                    <Link href={`/discover/${job.id}`} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50">
                      <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-8 w-8" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900 group-hover:text-accent">{job.role_title}</span>
                        <span className="block truncate text-sm text-slate-600">
                          {job.company_name} · {where(job)}
                          {job.terms.length > 0 && ` · ${job.terms.map(termLabel).join(", ")}`}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href="/discover?sort=recent" className="rise mt-8 inline-flex items-center gap-1.5 font-medium text-accent hover:underline">
                Everything posted today <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>

            <section data-stage="APPLIED" aria-labelledby="source-title" className="py-20">
              <h2 id="source-title" className="rise font-serif text-4xl font-semibold leading-tight text-slate-900">
                Apply where the company hires
              </h2>
              <p className="rise rise-2 mt-6 max-w-[46ch] text-lg leading-relaxed text-slate-800">
                Every listing links to the employer&apos;s own posting. {smallerCompanyRoles.toLocaleString()} of the open roles
                are at startups and mid-size companies, the ones that never trend but often reply fastest.
              </p>
              {topCompanies.length > 0 && (
                <ul aria-label="Some of the companies hiring" className="rise rise-3 mt-10 grid max-w-[560px] grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  {topCompanies.map((c) => (
                    <li key={c.name} className="flex min-w-0 items-center gap-2.5 text-[15px] text-slate-900">
                      <CompanyLogo name={c.name} domain={c.domain} className="h-7 w-7" />
                      <span className="truncate">{c.name}</span>
                      <span className="ml-auto text-sm tabular-nums text-slate-600">{c.roles}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section data-stage="INTERVIEWING" aria-labelledby="slip-title" className="py-20">
              <h2 id="slip-title" className="rise font-serif text-4xl font-semibold leading-tight text-slate-900">
                Nothing slips past a deadline
              </h2>
              <p className="rise rise-2 mt-6 max-w-[46ch] text-lg leading-relaxed text-slate-800">
                Drag each application through its stages. Trackr nudges you before deadlines and follow-ups, keeps
                contacts and notes beside the role, and takes the spreadsheet you&apos;ve been using as a CSV.
              </p>
              {latest[1] && (
                <div data-ui className="rise rise-3 mt-10 flex max-w-[560px] items-center gap-4 rounded-lg bg-surface p-4">
                  <Bell className="h-5 w-5 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-900">Follow up with {latest[1].company_name}</p>
                    <p className="truncate text-sm text-slate-600">{latest[1].role_title}</p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-amber-700">Tomorrow</span>
                </div>
              )}
            </section>

            <section data-stage="OFFER" aria-labelledby="offer-title" className="py-20 lg:pb-[30svh]">
              <h2 id="offer-title" className="rise font-serif text-4xl font-semibold leading-tight text-slate-900">
                From wishlist to offer
              </h2>
              <p className="rise rise-2 mt-6 max-w-[46ch] text-lg leading-relaxed text-slate-800">
                See how your search is going by stage and by week, and export everything whenever you like. The
                board is free for your first 50 active applications.
              </p>
              <Link
                href="/login?next=/board"
                className="rise rise-3 mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3.5 font-medium text-accent-ink transition hover:bg-accent-hover active:scale-[0.98]"
              >
                Start your board <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </section>
          </div>
        </div>

        <ResumeMatchDemo jobs={latest} />

        {/* Pricing: two plans as two fields; the wider one is the one that matters more. */}
        <section aria-labelledby="pricing-title" className="grid lg:grid-cols-[5fr_7fr]">
          <h2 id="pricing-title" className="sr-only">Pricing</h2>
          <div className="flex min-h-[70svh] flex-col bg-surface p-6 sm:p-10">
            <h3 className="rise font-serif text-5xl font-semibold text-slate-900">Free</h3>
            <p className="rise rise-2 mt-4 max-w-[30ch] text-lg leading-relaxed text-slate-800">
              The whole feed, skill match on every role, and a board for up to 50 active applications.
            </p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-16">
              <p className="font-serif text-[clamp(4.5rem,9vw,8rem)] font-semibold leading-none text-slate-900">$0</p>
              <Link
                href="/login?next=/board"
                className="rounded-md border border-slate-900 px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-900 hover:text-background"
              >
                Start free
              </Link>
            </div>
          </div>
          <div className="flex min-h-[70svh] flex-col bg-accent p-6 pt-16 text-accent-ink sm:p-10">
            <h3 className="rise font-serif text-5xl font-semibold">Pro</h3>
            <p className="rise rise-2 mt-4 max-w-[34ch] text-lg leading-relaxed">
              Unlimited applications, plus AI resume tailoring, cover letters, job match and interview practice at the
              highest limits.
            </p>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-16">
              <p className="font-serif text-[clamp(4.5rem,9vw,8rem)] font-semibold leading-none">
                $15<span className="ml-2 text-xl font-normal">CAD a month</span>
              </p>
              <Link href="/pricing" className="rounded-md bg-accent-ink px-6 py-3 font-medium text-accent transition hover:opacity-90">
                See Pro
              </Link>
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="mx-auto grid max-w-[1400px] gap-10 px-4 py-28 sm:px-10 lg:grid-cols-12">
          <h2 id="faq-title" className="rise font-serif text-4xl font-semibold leading-tight text-slate-900 lg:col-span-3">
            Good to know
          </h2>
          <div className="text-[17px] leading-[1.6] text-slate-800 lg:col-span-8 lg:col-start-5 lg:columns-2 lg:gap-14">
            {FAQ.map(({ q, a }) => (
              <p key={q} className="rise mb-6 break-inside-avoid">
                <strong className="font-semibold text-slate-900">{q}</strong> {a}
              </p>
            ))}
          </div>
        </section>

        <section aria-labelledby="cta-title" className="grid min-h-[80svh] items-center gap-12 bg-stage px-4 py-20 sm:px-10 lg:grid-cols-12">
          <div className="lg:col-span-5 lg:self-end">
            <h2 id="cta-title" className="rise font-serif text-[clamp(3rem,6.5vw,6.5rem)] font-semibold leading-[0.95] text-stage-ink">
              Find your co&#8209;op.
            </h2>
            <p className="rise rise-2 mt-6 max-w-[40ch] text-lg text-stage-muted">
              Pick a term and a few words. The feed opens on the roles that match, and you can save any of them to your
              board.
            </p>
          </div>
          <div className="rise flex lg:col-span-5 lg:col-start-8">
            <SearchDialog totalRoles={totalRoles} />
          </div>
        </section>
      </div>
    </MotionConfig>
  );
}
