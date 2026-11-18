"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, GripVertical, MapPin, RefreshCw, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import VantaBackground from "@/components/ui/VantaBackground";
import DecryptedText from "@/components/ui/DecryptedText";
import Magnet from "@/components/ui/Magnet";
import ShinyBadge from "@/components/ui/ShinyBadge";
import SpotlightCard from "@/components/ui/SpotlightCard";
import { useGSAPStagger } from "@/lib/useGSAPStagger";
import { termLabel } from "@/lib/feed";
import { springs } from "@/lib/motion-tokens";
import type { DiscoveredJob } from "@/types";
import type { FeedPulse } from "@/lib/feed";
import { PulseLine } from "@/components/PulseLine";
import { CompanyLogo } from "@/components/CompanyLogo";
import { JobTicker } from "@/components/landing/JobTicker";
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

function Rise({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springs.gentle, delay }}
      className={className}
    >
      {children}
    </motion.div>
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
  const listRef = useGSAPStagger({ selector: "[data-stagger]", triggerDeps: [latest.length], stagger: 0.06 });

  const features = [
    {
      icon: RefreshCw,
      title: "Real postings, refreshed every 6 hours",
      body: "Pulled straight from company job boards and the community internship lists. Closed roles drop off on their own, and pay is only shown when the posting states it.",
    },
    {
      icon: Building2,
      title: "The startups you'd otherwise miss",
      body: `${smallerCompanyRoles.toLocaleString()} open roles at startups and mid-size companies right now: the ones that never trend on LinkedIn but often reply fastest.`,
    },
    {
      icon: GripVertical,
      title: "A tracker that keeps up with you",
      body: "Drag applications through each stage, get nudged before deadlines and follow-ups, keep contacts and notes together, and import the spreadsheet you've been using.",
    },
  ];

  return (
    <div className="-mt-6 space-y-20 pb-16">
      <section className="relative -mx-4 overflow-hidden px-4 pb-16 pt-20 sm:-mx-6 sm:px-6 md:pt-28">
        <VantaBackground className="opacity-90" lines={5} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[radial-gradient(60%_50%_at_50%_0%,rgba(0,102,255,0.10),transparent)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <Rise>
            <ShinyBadge variant="blue" className="px-3 py-1 text-[13px]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {totalRoles.toLocaleString()} open roles at {companyCount.toLocaleString()} companies
            </ShinyBadge>
          </Rise>
          <Rise delay={0.05}>
            <h1 className="mt-6 font-serif text-5xl font-semibold leading-[1.05] tracking-tight text-slate-900 md:text-7xl">
              Every Canadian internship,{" "}
              <span className="italic text-[#0066FF]">
                <DecryptedText text="one tracker." speed={40} />
              </span>
            </h1>
          </Rise>
          <Rise delay={0.1}>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Find co-ops and internships for Winter, Summer and Fall terms across Canada, then follow every
              application from wishlist to offer.
            </p>
          </Rise>
          <Rise delay={0.15} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Magnet>
              <Link
                href="/discover"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#0066FF] px-6 py-3.5 text-base font-medium text-white shadow-[0_8px_24px_-8px_rgba(0,102,255,0.6)] transition hover:bg-[#0052cc]"
              >
                Browse internships <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Magnet>
            <Link
              href="/login?next=/board"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-surface/80 px-6 py-3.5 text-base font-medium text-slate-800 backdrop-blur transition hover:bg-surface"
            >
              Start tracking, free
            </Link>
          </Rise>
        </div>
        <Rise delay={0.2} className="relative mt-12">
          <JobTicker jobs={latest.slice(0, 16)} />
        </Rise>
      </section>

      <section aria-labelledby="latest-title" className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2 id="latest-title" className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
              Just posted
            </h2>
            <PulseLine pulse={pulse} />
          </div>
          <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-medium text-[#0066FF] hover:underline">
            See all roles <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div ref={listRef} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {latest.slice(0, 6).map((job) => (
            <Link key={job.id} href={`/discover/${job.id}`} data-stagger className="block">
              <SpotlightCard className="h-full p-4">
                <p className="truncate text-[13px] font-medium text-slate-600">{job.company_name}</p>
                <h3 className="mt-0.5 line-clamp-2 font-semibold leading-snug text-slate-900">{job.role_title}</h3>
                <p className="mt-2 flex items-center gap-1 text-[13px] text-slate-600">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {job.locations[0] ?? "Canada"}
                </p>
                {job.terms.length > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-[13px] text-[#0066FF]">
                    <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                    {job.terms.map(termLabel).join(" · ")}
                  </p>
                )}
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </section>

      {topCompanies.length > 0 && (
        <section aria-labelledby="companies-title" className="mx-auto max-w-5xl text-center">
          <h2 id="companies-title" className="text-sm font-medium text-slate-500">Pulled every 6 hours from the career pages of</h2>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-3">
            {topCompanies.map((c) => (
              <li key={c.name} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CompanyLogo name={c.name} domain={c.domain} className="h-7 w-7" />
                {c.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Features" className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <SpotlightCard key={title} className="p-6">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF]">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
          </SpotlightCard>
        ))}
      </section>

      <section aria-label="Try skill match" className="mx-auto max-w-5xl">
        <ResumeMatchDemo jobs={latest} />
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl">
        <h2 id="faq-title" className="text-center font-serif text-3xl font-semibold tracking-tight text-slate-900">Good to know</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group rounded-xl border border-slate-200 bg-surface px-4 py-3 transition open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900 marker:hidden">
                {q}
                <span aria-hidden className="text-slate-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#0b1220] px-6 py-12 ring-1 ring-white/5 text-center md:py-16">
        <VantaBackground rgb="147, 197, 253" className="opacity-70" lines={3} />
        <div className="relative">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Your next co-op is already posted.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#cbd5e1]">Save it before the deadline sneaks up on you.</p>
          <div className="mt-6">
            <Magnet>
              <Link href="/login?next=/board" className="inline-flex items-center gap-2 rounded-2xl bg-[#ffffff] px-6 py-3.5 font-medium text-[#0f172a] transition hover:bg-[#eff6ff]">
                Create your board <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Magnet>
          </div>
        </div>
      </section>
    </div>
  );
}
