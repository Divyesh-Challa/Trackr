import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getJob } from "@/lib/feed";
import { JobPage } from "../DiscoverView";

type Props = { params: Promise<{ id: string }> };

const loadJob = cache(async (id: string) => getJob(await createClient(), id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await loadJob((await params).id);
  if (!job) return { title: "Job not found | Trackr" };
  const place = job.locations[0] ?? "Canada";
  return {
    title: `${job.role_title} at ${job.company_name} | Trackr`,
    description: `${job.role_title} at ${job.company_name} in ${place}${job.salary ? `, ${job.salary}` : ""}. Apply on the employer's site and track it in Trackr.`,
    alternates: { canonical: `/discover/${job.id}` },
    openGraph: { title: `${job.role_title} at ${job.company_name}`, url: `/discover/${job.id}`, type: "website" },
    robots: job.is_active ? undefined : { index: false },
  };
}

/** Markdown to plain text: Google wants HTML or text in JobPosting.description, not markdown. */
function plainText(md?: string | null) {
  if (!md) return undefined;
  return md
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, "$1")
    .trim();
}

/** schema.org JobPosting, so the listing is eligible for Google's job search. */
function jobPostingLd(job: NonNullable<Awaited<ReturnType<typeof loadJob>>>) {
  const remote = job.work_model === "REMOTE";
  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.role_title,
    description: plainText(job.description),
    datePosted: job.posted_at ?? job.created_at,
    validThrough: job.deadline_at ?? undefined,
    employmentType: job.job_type === "new_grad" || job.job_type === "full_time" ? "FULL_TIME" : "INTERN",
    directApply: false,
    url: job.job_url,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company_name,
      sameAs: job.company_domain ? `https://${job.company_domain}` : undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: remote ? undefined : job.city || undefined,
        addressRegion: /^[A-Z]{2}$/.test(job.province) ? job.province : undefined,
        addressCountry: "CA",
      },
    },
    jobLocationType: remote ? "TELECOMMUTE" : undefined,
    applicantLocationRequirements: remote ? { "@type": "Country", name: "Canada" } : undefined,
  };
}

export default async function JobDetailPage({ params }: Props) {
  const job = await loadJob((await params).id);
  if (!job) notFound();

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: tracked } = auth.user
    ? await supabase.from("applications").select("id").eq("job_id", job.id).limit(1)
    : { data: null };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All jobs
      </Link>
      {!job.is_active && (
        <p role="status" className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
          This posting has closed or been filled. It&apos;s kept here for reference.
        </p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-surface p-6 shadow-simplify-card">
        <JobPage job={job} signedIn={Boolean(auth.user)} initiallyTracked={Boolean(tracked?.length)} />
      </div>
      {job.is_active && job.description && (
        // "<" is escaped so a description can't close the script tag.
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd(job)).replace(/</g, "\\u003c") }}
        />
      )}
    </div>
  );
}
