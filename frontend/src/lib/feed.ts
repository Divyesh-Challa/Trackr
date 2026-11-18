// Jobs-feed filters: parsed from (and written back to) the URL so any view is shareable.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";
import { formatPostedSalary, toDiscoveredJob, type FeedJobRow } from "./mappers";
import type { DiscoveredJob } from "../types";

export const PAGE_SIZE = 40;

export const PROVINCES = [
  { code: "ON", label: "Ontario" },
  { code: "BC", label: "British Columbia" },
  { code: "QC", label: "Quebec" },
  { code: "AB", label: "Alberta" },
  { code: "MB", label: "Manitoba" },
  { code: "SK", label: "Saskatchewan" },
  { code: "NS", label: "Nova Scotia" },
  { code: "NB", label: "New Brunswick" },
  { code: "NL", label: "Newfoundland and Labrador" },
  { code: "PE", label: "Prince Edward Island" },
  { code: "YT", label: "Yukon" },
  { code: "NT", label: "Northwest Territories" },
  { code: "NU", label: "Nunavut" },
] as const;

export const DISCIPLINES = [
  { code: "software", label: "Software" },
  { code: "data_ml", label: "Data & ML" },
  { code: "hardware", label: "Hardware" },
  { code: "product_design", label: "Product & Design" },
  { code: "security_it", label: "IT & Security" },
  { code: "quant", label: "Quant" },
  { code: "business", label: "Business" },
  { code: "mechanical", label: "Other engineering" },
] as const;

export const WORK_MODELS = [
  { code: "remote", label: "Remote" },
  { code: "hybrid", label: "Hybrid" },
  { code: "onsite", label: "On-site" },
] as const;
export type WorkModel = (typeof WORK_MODELS)[number]["code"];

export const JOB_TYPES = [
  { code: "internship", label: "Internship" },
  { code: "coop", label: "Co-op" },
  { code: "new_grad", label: "New grad" },
] as const;
export type JobType = (typeof JOB_TYPES)[number]["code"];

// Matched against jobs.company_name exactly, as the ingest writes it.
export const BIG_TECH = [
  "Google", "Microsoft", "Amazon", "Apple", "Meta", "NVIDIA", "Intel", "Qualcomm", "AMD", "Shopify", "Stripe",
  "Databricks", "Uber", "Lyft", "DoorDash", "Pinterest", "Atlassian", "Block", "Workday", "Salesforce", "Adobe",
  "Netflix", "Snowflake", "Cloudflare", "Datadog", "Figma", "Notion", "OpenAI", "Anthropic", "Cohere",
  "Electronic Arts", "Epic Games", "Synopsys", "Nokia", "Cisco", "IBM", "Oracle", "SAP", "Tesla", "Samsung",
];

export const POSTED_WITHIN = [
  { days: 3, label: "Last 3 days" },
  { days: 7, label: "Last week" },
  { days: 30, label: "Last month" },
] as const;

export const SORTS = [
  { code: "recommended", label: "Recommended", hint: "Fresh postings first, nudged up by your target roles and provinces, your resume skills, company size, stated pay and what students track." },
  { code: "match", label: "Best match", hint: "Jobs asking for the most skills on your resume first." },
  { code: "recent", label: "Most recent", hint: "Newest postings first." },
  { code: "trending", label: "Trending", hint: "Most tracked by Trackr users this week." },
] as const;
export type Sort = (typeof SORTS)[number]["code"];

const SEASON_LABEL = { W: "Winter", S: "Summer", F: "Fall" } as const;

export function termLabel(term: string): string {
  return `${SEASON_LABEL[term[0] as keyof typeof SEASON_LABEL] ?? term[0]} ${term.slice(1)}`;
}

/** The next `count` co-op terms that haven't started yet (Winter=Jan, Summer=May, Fall=Sep). */
export function upcomingTerms(today = new Date(), count = 4): string[] {
  const starts: [string, number][] = [["W", 0], ["S", 4], ["F", 8]];
  const out: string[] = [];
  for (let year = today.getFullYear(); out.length < count; year++) {
    for (const [season, month] of starts) {
      if (new Date(year, month, 1) > today && out.length < count) out.push(`${season}${year}`);
    }
  }
  return out;
}

export type FeedFilters = {
  q: string;
  provinces: string[];
  /** Exact city names (a metro is several). */
  cities: string[];
  /** Jobs tagged with any of these skills. */
  skills: string[];
  terms: string[];
  disciplines: string[];
  workModels: WorkModel[];
  jobTypes: JobType[];
  smallCompanies: boolean;
  bigTech: boolean;
  postedWithin: number | null;
  sort: Sort;
  /** Show the listings the viewer hid instead of the feed. */
  hidden: boolean;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const list = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v.join(",") : v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function parseFeedParams(params: Params): FeedFilters {
  const provinceCodes = new Set<string>(PROVINCES.map((p) => p.code));
  const disciplineCodes = new Set<string>(DISCIPLINES.map((d) => d.code));
  const workModels = WORK_MODELS.map((m) => m.code).filter((m) => list(params.mode).includes(m));
  const jobTypes = JOB_TYPES.map((t) => t.code).filter((t) => list(params.type).includes(t));
  const days = Number(params.posted);
  const page = Number(params.page);
  return {
    q: (typeof params.q === "string" ? params.q : "").slice(0, 120),
    provinces: list(params.province).map((p) => p.toUpperCase()).filter((p) => provinceCodes.has(p)),
    cities: list(params.city).filter((c) => /^[\p{L} .'-]{2,40}$/u.test(c)).slice(0, 12),
    skills: list(params.skill).filter((k) => /^[\w .+#/-]{1,30}$/.test(k)).slice(0, 12),
    terms: list(params.term).map((t) => t.toUpperCase()).filter((t) => /^(W|S|F)\d{4}$/.test(t)),
    disciplines: list(params.discipline).filter((d) => disciplineCodes.has(d)),
    // `remote=1` is the old spelling of `mode=remote`; shared links still use it.
    workModels: workModels.length || params.remote !== "1" ? workModels : ["remote"],
    jobTypes,
    smallCompanies: params.size === "small",
    bigTech: params.top === "1",
    postedWithin: POSTED_WITHIN.some((p) => p.days === days) ? days : null,
    sort: SORTS.find((s) => s.code === params.sort)?.code ?? "recommended",
    hidden: params.view === "hidden",
    page: Number.isInteger(page) && page > 1 ? Math.min(page, 50) : 1,
  };
}

export function feedSearchParams(f: FeedFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.provinces.length) p.set("province", f.provinces.join(","));
  if (f.cities.length) p.set("city", f.cities.join(","));
  if (f.skills.length) p.set("skill", f.skills.join(","));
  if (f.terms.length) p.set("term", f.terms.join(","));
  if (f.disciplines.length) p.set("discipline", f.disciplines.join(","));
  if (f.workModels.length) p.set("mode", f.workModels.join(","));
  if (f.jobTypes.length) p.set("type", f.jobTypes.join(","));
  if (f.smallCompanies) p.set("size", "small");
  if (f.bigTech) p.set("top", "1");
  if (f.postedWithin) p.set("posted", String(f.postedWithin));
  if (f.sort !== "recommended") p.set("sort", f.sort);
  if (f.hidden) p.set("view", "hidden");
  if (f.page > 1) p.set("page", String(f.page));
  return p;
}

const JOB_COLUMNS =
  "id, source, company_name, company_domain, company_size, title, locations, city, province, work_model, job_type, term, terms, disciplines, job_url, salary_min, salary_max, salary_currency, salary_period, salary_source, posted_at, deadline_at, first_seen_at, created_at, is_repost, citizenship_required, clearance_required, min_gpa, skills";

export async function queryFeed(
  supabase: SupabaseClient<Database>,
  f: FeedFilters
): Promise<{ jobs: DiscoveredJob[]; total: number }> {
  let query = supabase
    .from("job_feed")
    .select(`${JOB_COLUMNS}, trackers_week, match_percent`, { count: "exact" })
    .eq("is_active", true)
    .eq("hidden", f.hidden);

  if (f.q) query = query.textSearch("search", f.q, { type: "websearch", config: "english" });
  if (f.provinces.length) {
    // Remote-in-Canada postings have no province; keep them unless the user filters to onsite.
    query = query.or(`province.in.(${f.provinces.join(",")}),and(province.is.null,work_model.eq.remote)`);
  }
  if (f.cities.length) query = query.in("city", f.cities);
  if (f.skills.length) query = query.overlaps("skills", f.skills);
  if (f.workModels.length) query = query.in("work_model", f.workModels);
  if (f.jobTypes.length) query = query.in("job_type", f.jobTypes);
  if (f.terms.length) query = query.overlaps("terms", f.terms);
  if (f.disciplines.length) query = query.overlaps("disciplines", f.disciplines);
  if (f.smallCompanies) query = query.in("company_size", ["startup", "mid"]);
  if (f.bigTech) query = query.in("company_name", BIG_TECH);
  if (f.postedWithin) {
    const since = new Date(Date.now() - f.postedWithin * 86_400_000).toISOString();
    query = query.or(`posted_at.gte.${since},and(posted_at.is.null,first_seen_at.gte.${since})`);
  }

  if (f.sort === "recommended") query = query.order("rank_score", { ascending: false });
  if (f.sort === "trending") query = query.order("trackers_week", { ascending: false });
  if (f.sort === "match") query = query.order("match_percent", { ascending: false, nullsFirst: false });
  const from = (f.page - 1) * PAGE_SIZE;
  const { data, error, count } = await query
    .order("posted_sort", { ascending: false })
    .order("id")
    .range(from, from + PAGE_SIZE - 1);
  if (error?.code === "PGRST103") return { jobs: [], total: 0 }; // page past the end (stale link)
  if (error) throw new Error(`Failed to load jobs: ${error.message}`);

  return {
    // The view's columns are all nullable in the generated types; these rows come from jobs.
    jobs: ((data ?? []) as FeedJobRow[]).map(toDiscoveredJob),
    total: count ?? 0,
  };
}

/** When the viewer last opened Discover, so the next visit can say what's new. */
export const SEEN_COOKIE = "discover_seen_at";

export type FeedPulse = { lastRefresh: string | null; newToday: number; trackersWeek: number; newSinceVisit: number | null };

/** The live line above the feed. `since` is the viewer's previous visit, if we know it. */
export async function feedPulse(supabase: SupabaseClient<Database>, since: string | null): Promise<FeedPulse> {
  const validSince = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : null;
  const [pulse, fresh] = await Promise.all([
    supabase.rpc("feed_pulse").single(),
    validSince
      ? supabase.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).gt("first_seen_at", validSince)
      : null,
  ]);
  // The live line is decoration; a failure here shouldn't break the feed.
  return {
    lastRefresh: pulse.data?.last_refresh ?? null,
    newToday: pulse.data?.new_today ?? 0,
    trackersWeek: pulse.data?.trackers_week ?? 0,
    newSinceVisit: fresh?.count ?? null,
  };
}

/** One job with its description, or null if the id is unknown. Closed postings are returned too. */
export async function getJob(
  supabase: SupabaseClient<Database>,
  id: string
): Promise<(DiscoveredJob & { is_active: boolean }) | null> {
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) return null;
  const { data, error } = await supabase
    .from("jobs")
    .select(`${JOB_COLUMNS}, description_md, is_active`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load job: ${error.message}`);
  return data ? { ...toDiscoveredJob(data), is_active: data.is_active } : null;
}

/** Open roles at the same company, and others in the same field that ask for the same skills. */
export async function relatedJobs(
  supabase: SupabaseClient<Database>,
  job: DiscoveredJob
): Promise<{ sameCompany: DiscoveredJob[]; similar: DiscoveredJob[] }> {
  const open = () => supabase.from("jobs").select(JOB_COLUMNS).eq("is_active", true).neq("id", job.id);
  let similar = open().neq("company_name", job.company_name);
  if (job.disciplines.length) similar = similar.overlaps("disciplines", job.disciplines);
  if (job.skills?.length) similar = similar.overlaps("skills", job.skills);
  const [company, alike] = await Promise.all([
    open().eq("company_name", job.company_name).order("posted_at", { ascending: false, nullsFirst: false }).limit(5),
    similar.order("posted_at", { ascending: false, nullsFirst: false }).limit(6),
  ]);
  // Related links are extras; a failed lookup shouldn't take the job page down with it.
  return {
    sameCompany: (company.data ?? []).map(toDiscoveredJob),
    similar: (alike.data ?? []).map(toDiscoveredJob),
  };
}

export { formatPostedSalary };
