import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { queryFeed, parseFeedParams } from "@/lib/feed";
import Landing from "./Landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) redirect("/board");

  const [{ jobs, total }, smaller, companies] = await Promise.all([
    // Lead with tech roles; the full feed is one click away.
    queryFeed(supabase, parseFeedParams({ discipline: "software,data_ml,hardware" })),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).in("company_size", ["startup", "mid"]),
    supabase.from("jobs").select("company_name").eq("is_active", true).limit(5000),
  ]);

  return (
    <Landing
      totalRoles={total}
      smallerCompanyRoles={smaller.count ?? 0}
      companyCount={new Set((companies.data ?? []).map((r) => r.company_name)).size}
      latest={jobs.slice(0, 6)}
    />
  );
}
