import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseFeedParams, queryFeed } from "@/lib/feed";
import { JobRows } from "@/components/JobRows";

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The top of the board: new matches to apply to, and applications waiting on the user. */
export default async function Today() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const now = Date.now();
  const [{ jobs }, { data: tracked }, { data: deadlines }, { data: quiet }] = await Promise.all([
    queryFeed(supabase, parseFeedParams({})),
    supabase.from("applications").select("job_id").not("job_id", "is", null),
    supabase
      .from("applications")
      .select("id, company_name, role_title, deadline_at")
      .eq("status", "wishlist")
      .gte("deadline_at", isoDay(now))
      .lte("deadline_at", isoDay(now + 7 * DAY))
      .order("deadline_at")
      .limit(3),
    supabase
      .from("applications")
      .select("id, company_name, role_title, applied_at")
      .eq("status", "applied")
      .lte("applied_at", isoDay(now - 14 * DAY))
      .order("applied_at")
      .limit(3),
  ]);

  const seen = new Set((tracked ?? []).map((a) => a.job_id));
  const matches = jobs.filter((j) => !seen.has(j.id)).slice(0, 5);
  const needYou = [
    ...(deadlines ?? []).map((a) => ({ id: a.id, title: `${a.role_title} at ${a.company_name}`, why: `Closes ${a.deadline_at}` })),
    ...(quiet ?? []).map((a) => ({ id: a.id, title: `${a.role_title} at ${a.company_name}`, why: `No reply since ${a.applied_at}; worth a follow-up` })),
  ];
  if (!matches.length && !needYou.length) return null;

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pt-6 sm:px-6 lg:grid-cols-[2fr_1fr]">
      {matches.length > 0 && (
        <section aria-labelledby="top-matches" className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h2 id="top-matches" className="text-base font-semibold text-slate-900">Top matches for you</h2>
            <Link href="/discover" className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
              All jobs <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          <JobRows jobs={matches} />
          <p className="text-[13px] text-slate-500">Open one to build an apply kit: tailored bullets, a cover letter and your form answers.</p>
        </section>
      )}
      {needYou.length > 0 && (
        <section aria-labelledby="needs-you" className="space-y-2">
          <h2 id="needs-you" className="text-base font-semibold text-slate-900">Needs you</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-surface">
            {needYou.map((n) => (
              <li key={n.id}>
                <Link href={`/board?open=${n.id}`} className="flex items-start gap-3 px-4 py-3 transition hover:bg-slate-50">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{n.title}</span>
                    <span className="block text-[13px] text-slate-600">{n.why}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
