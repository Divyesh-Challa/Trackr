import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/site";
import { CITIES, ROLES } from "@/lib/collections";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  // shortcut: one request returns at most 1000 rows, so only the newest 1000 open jobs are listed; page with .range() once the feed outgrows that.
  const { data } = await supabase
    .from("jobs")
    .select("id, updated_at")
    .eq("is_active", true)
    .order("posted_at", { ascending: false, nullsFirst: false })
    .limit(1000);
  return [
    ...["", "/discover", "/guide", "/pricing", "/privacy", "/terms"].map((path) => ({ url: `${SITE_URL}${path}` })),
    ...CITIES.map((c) => ({ url: `${SITE_URL}/internships/${c.slug}` })),
    ...ROLES.map((r) => ({ url: `${SITE_URL}/roles/${r.slug}` })),
    ...(data ?? []).map((j) => ({ url: `${SITE_URL}/discover/${j.id}`, lastModified: j.updated_at })),
  ];
}
