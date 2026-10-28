"use server";

// Prefills "add application" from a pasted job link. Only ever calls the fixed public
// APIs of Greenhouse, Lever and Ashby with a slug and id validated by parseJobUrl, so
// it can't be used to make the server fetch arbitrary URLs.
import { createClient } from "@/lib/supabase/server";
import { parseJobUrl } from "@/lib/job-url";

export type JobPrefill = {
  company_name: string;
  role_title: string;
  job_location?: string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
  job_url: string;
  job_id?: string;
  description?: string;
};

export type LookupResult =
  | { kind: "found"; prefill: JobPrefill; fromFeed: boolean }
  | { kind: "unsupported" }
  | { kind: "error"; message: string };

const TIMEOUT_MS = 8000;
const MAX_BYTES = 3_000_000;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "TrackrJobsBot/1.0" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("That posting no longer exists.");
  if (!res.ok) throw new Error(`The job board returned ${res.status}.`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("The job board response was too large.");
  return JSON.parse(text);
}

function plainText(html: string | undefined | null, limit = 20_000): string | undefined {
  if (!html) return undefined;
  const decoded = html.includes("&lt;") && !html.includes("<")
    ? html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    : html;
  const text = decoded
    .replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text ? text.slice(0, limit) : undefined;
}

function prettySlug(slug: string): string {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function workModel(value: unknown): JobPrefill["work_model"] {
  const v = String(value ?? "").toLowerCase();
  return v === "remote" ? "REMOTE" : v === "hybrid" ? "HYBRID" : v === "onsite" || v === "on-site" ? "ONSITE" : undefined;
}

type Obj = Record<string, unknown>;

export async function lookupJobUrl(rawUrl: string): Promise<LookupResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { kind: "error", message: "Sign in first." };

  const ref = parseJobUrl(String(rawUrl).slice(0, 2048));
  if (!ref) return { kind: "unsupported" };

  // Already in the feed? Use our row, which has a cleaned-up location and the job id.
  const { data: job } = await supabase
    .from("jobs")
    .select("id, company_name, title, locations, work_model, job_url")
    .eq("job_url_canonical", ref.canonical)
    .maybeSingle();
  if (job) {
    return {
      kind: "found",
      fromFeed: true,
      prefill: {
        company_name: job.company_name,
        role_title: job.title,
        job_location: job.locations[0],
        work_model: workModel(job.work_model),
        job_url: job.job_url,
        job_id: job.id,
      },
    };
  }

  try {
    if (ref.ats === "greenhouse") {
      if (!ref.slug) return { kind: "unsupported" };
      const j = (await getJson(
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(ref.slug)}/jobs/${ref.id}`
      )) as Obj;
      return {
        kind: "found",
        fromFeed: false,
        prefill: {
          company_name: String(j.company_name || prettySlug(ref.slug)),
          role_title: String(j.title ?? ""),
          job_location: ((j.location as Obj) ?? {}).name as string | undefined,
          job_url: String(j.absolute_url || rawUrl),
          description: plainText(j.content as string),
        },
      };
    }
    if (ref.ats === "lever") {
      const j = (await getJson(
        `https://api.lever.co/v0/postings/${encodeURIComponent(ref.slug)}/${ref.id}`
      )) as Obj;
      const cats = (j.categories as Obj) ?? {};
      return {
        kind: "found",
        fromFeed: false,
        prefill: {
          company_name: prettySlug(ref.slug),
          role_title: String(j.text ?? ""),
          job_location: cats.location as string | undefined,
          work_model: workModel(j.workplaceType),
          job_url: String(j.hostedUrl || rawUrl),
          description: (j.descriptionPlain as string | undefined)?.slice(0, 20_000),
        },
      };
    }
    const board = (await getJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(ref.slug)}`
    )) as { jobs?: Obj[] };
    const j = board.jobs?.find((x) => String(x.id).toLowerCase() === ref.id);
    if (!j) return { kind: "error", message: "That posting is no longer on the company's board." };
    return {
      kind: "found",
      fromFeed: false,
      prefill: {
        company_name: prettySlug(ref.slug),
        role_title: String(j.title ?? ""),
        job_location: j.location as string | undefined,
        work_model: workModel(j.workplaceType),
        job_url: String(j.jobUrl || rawUrl),
        description: (j.descriptionPlain as string | undefined)?.slice(0, 20_000),
      },
    };
  } catch (err) {
    const message = err instanceof Error && err.name !== "TimeoutError" ? err.message : "The job board didn't respond.";
    return { kind: "error", message };
  }
}
