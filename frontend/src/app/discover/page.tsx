import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { parseFeedParams, queryFeed } from "@/lib/feed";
import DiscoverView from "./DiscoverView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Canadian internships & co-ops | Trackr",
  description:
    "Tech internships and co-ops across Canada, pulled from company career sites and community lists, refreshed every 6 hours.",
};

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFeedParams(await searchParams);
  const supabase = await createClient();
  const [{ jobs, total }, { data: auth }] = await Promise.all([
    queryFeed(supabase, filters),
    supabase.auth.getUser(),
  ]);

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
    />
  );
}
