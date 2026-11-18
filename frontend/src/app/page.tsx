import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { feedPulse, queryFeed, parseFeedParams } from "@/lib/feed";
import Landing from "./Landing";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) redirect("/board");

  const [{ jobs }, all, smaller, companies, pulse] = await Promise.all([
    // Lead with tech roles; the full feed is one click away.
    queryFeed(supabase, parseFeedParams({ discipline: "software,data_ml,hardware", sort: "recent" })),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).in("company_size", ["startup", "mid"]),
    supabase.from("jobs").select("company_name, company_domain").eq("is_active", true).limit(5000),
    feedPulse(supabase, null),
  ]);

  const byCompany = new Map<string, { name: string; domain: string | null; roles: number }>();
  for (const r of companies.data ?? []) {
    const c = byCompany.get(r.company_name) ?? { name: r.company_name, domain: null, roles: 0 };
    c.roles += 1;
    c.domain ??= r.company_domain;
    byCompany.set(r.company_name, c);
  }
  // Companies with a logo read better in the strip; most roles first.
  const topCompanies = [...byCompany.values()].filter((c) => c.domain).sort((a, b) => b.roles - a.roles).slice(0, 12);

  return (
    <Landing
      totalRoles={all.count ?? 0}
      smallerCompanyRoles={smaller.count ?? 0}
      companyCount={byCompany.size}
      latest={jobs}
      topCompanies={topCompanies}
      pulse={pulse}
    />
  );
}
