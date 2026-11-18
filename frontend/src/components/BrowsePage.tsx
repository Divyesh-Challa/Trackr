import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { feedSearchParams, parseFeedParams, queryFeed } from "@/lib/feed";
import { CITIES, ROLES, type Collection } from "@/lib/collections";
import { JobRows } from "@/components/JobRows";

const faq = (c: Collection, total: number) => [
  {
    q: `How many ${c.name === "Remote" ? "remote" : c.name} roles are open right now?`,
    a: `${total.toLocaleString()} open ${total === 1 ? "posting" : "postings"} as of the last refresh. Trackr re-checks every employer's job board every 6 hours and drops roles once they close.`,
  },
  {
    q: "Where do these listings come from?",
    a: "Straight from each company's own careers page (Greenhouse, Lever, Ashby, Workday and others) and community-kept internship lists. Every listing links to the original posting, and you apply on the employer's site.",
  },
  {
    q: "Do I need an account?",
    a: "No account is needed to browse. A free account lets you save roles to a tracker board, hide ones you're not interested in, and see how well a role matches the skills on your resume.",
  },
];

/** A browse page (/internships/<city> or /roles/<role>): live jobs for one slice of the feed. */
export async function BrowsePage({ collection }: { collection: Collection }) {
  const supabase = await createClient();
  const filters = parseFeedParams({ ...collection.params, sort: "recent" });
  const { jobs, total } = await queryFeed(supabase, filters);
  const companies = [...new Set(jobs.map((j) => j.company_name))].slice(0, 16);
  const discoverHref = `/discover?${feedSearchParams(filters)}`;
  const questions = faq(collection, total);
  const others = [...CITIES, ...ROLES].filter((c) => c.slug !== collection.slug);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <p className="text-sm font-medium text-accent">{total.toLocaleString()} open roles · updated every 6 hours</p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-slate-900">{collection.title}</h1>
        <p className="max-w-2xl text-lg text-slate-600">{collection.intro}</p>
      </header>

      {companies.length > 0 && (
        <section aria-labelledby="hiring">
          <h2 id="hiring" className="mb-2 text-sm font-semibold text-slate-900">Companies hiring here</h2>
          <ul className="flex flex-wrap gap-2">
            {companies.map((name) => (
              <li key={name} className="rounded-full border border-slate-200 bg-surface px-3 py-1 text-[13px] text-slate-700">{name}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="roles" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <h2 id="roles" className="text-xl font-semibold text-slate-900">Newest roles</h2>
          <Link href={discoverHref} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Filter and sort all {total.toLocaleString()} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {jobs.length ? (
          <JobRows jobs={jobs.slice(0, 25)} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-slate-600">
            Nothing open here right now. New roles land every few hours, or <Link href="/discover" className="text-accent hover:underline">browse every role</Link>.
          </p>
        )}
      </section>

      <section aria-labelledby="faq" className="space-y-3">
        <h2 id="faq" className="text-xl font-semibold text-slate-900">Questions</h2>
        {questions.map(({ q, a }) => (
          <details key={q} className="group rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <summary className="cursor-pointer list-none font-medium text-slate-900 marker:hidden">{q}</summary>
            <p className="mt-2 text-[15px] text-slate-600">{a}</p>
          </details>
        ))}
      </section>

      <nav aria-label="More ways to browse" className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">Browse more</h2>
        <ul className="flex flex-wrap gap-2">
          {others.map((c) => (
            <li key={c.slug}>
              <Link
                href={CITIES.includes(c) ? `/internships/${c.slug}` : `/roles/${c.slug}`}
                className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[13px] text-slate-700 transition hover:bg-blue-50 hover:text-accent"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: questions.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
          }).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
