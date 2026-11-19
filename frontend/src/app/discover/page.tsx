import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { feedPulse, feedSearchParams, parseFeedParams, queryFeed, SEEN_COOKIE } from "@/lib/feed";
import DiscoverView from "./DiscoverView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Canadian internships, co-ops & new grad jobs | Trackr",
  description:
    "Tech internships, co-ops and new grad roles across Canada, pulled from company career sites and community lists, refreshed every hour.",
  alternates: { canonical: "/discover" },
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFeedParams(await searchParams);
  const supabase = await createClient();
  const seenAt = (await cookies()).get(SEEN_COOKIE)?.value ?? null;
  const [{ jobs, total }, { data: auth }, pulse] = await Promise.all([
    queryFeed(supabase, filters),
    supabase.auth.getUser(),
    feedPulse(supabase, seenAt),
  ]);

  if (!jobs.length && filters.page > 1) redirect(`/discover?${feedSearchParams({ ...filters, page: 1 })}`);

  let trackedJobIds: string[] = [];
  if (auth.user && jobs.length) {
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobs.map((j) => j.id));
    trackedJobIds = (data ?? []).flatMap((r) => (r.job_id ? [r.job_id] : []));
  }

  return (
    <DiscoverView
      jobs={jobs}
      total={total}
      filters={filters}
      signedIn={Boolean(auth.user)}
      trackedJobIds={trackedJobIds}
      pulse={pulse}
    />
  );
}
