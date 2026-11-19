import "server-only";
// Trackr's MCP tools. Each call gets a client acting as the token's owner, so RLS scopes
// everything. Nothing here submits an application: the user does that on the employer's site.
import type { McpServer } from "@modelcontextprotocol/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./supabase/database.types";
import { getJob, parseFeedParams, queryFeed } from "./feed";
import { profileKit, startKit, storeKit } from "./apply-kit-server";
import { SITE_URL } from "./site";

type Db = SupabaseClient<Database>;
export type ToolContext = { db: Db; userId: string; email?: string };

const STATUSES = ["wishlist", "applied", "oa", "interviewing", "offer", "rejected", "withdrawn"] as const;
const today = () => new Date().toISOString().slice(0, 10);
const text = (value: unknown) => ({ content: [{ type: "text" as const, text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] });
const fail = (message: string) => ({ ...text(message), isError: true });

export function registerTools(server: McpServer, ctx: () => Promise<ToolContext | null>) {
  const withCtx = <A,>(fn: (c: ToolContext, args: A) => Promise<ReturnType<typeof text>>) => async (args: A) => {
    const c = await ctx();
    return c ? fn(c, args) : fail("Couldn't act as your Trackr account. Create a new token on your profile and try again.");
  };

  server.registerTool(
    "search_jobs",
    {
      title: "Search jobs",
      description:
        "Search Trackr's feed of open Canadian tech internships, co-ops and new-grad roles. Results are personalized: match_percent is how many of the job's skills are on the user's resume.",
      inputSchema: z.object({
        query: z.string().max(120).optional().describe("Keywords, e.g. 'backend python'"),
        provinces: z.array(z.string()).optional().describe("Province codes, e.g. ['ON', 'BC']"),
        work_models: z.array(z.enum(["remote", "hybrid", "onsite"])).optional(),
        job_types: z.array(z.enum(["internship", "coop", "new_grad", "full_time"])).optional(),
        terms: z.array(z.string()).optional().describe("Terms like 'S2027' (W/S/F + year)"),
        posted_within_days: z.number().int().optional().describe("1, 3, 7 or 30"),
        sort: z.enum(["recommended", "match", "recent", "trending"]).optional(),
        page: z.number().int().min(1).max(50).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    withCtx(async ({ db }, a) => {
      // parseFeedParams validates exactly like the Discover page's URL does.
      const filters = parseFeedParams({
        q: a.query,
        province: a.provinces?.join(","),
        mode: a.work_models?.join(","),
        type: a.job_types?.join(","),
        term: a.terms?.join(","),
        posted: a.posted_within_days ? String(a.posted_within_days) : undefined,
        sort: a.sort,
        page: a.page ? String(a.page) : undefined,
      });
      const { jobs, total } = await queryFeed(db, filters);
      return text({
        total,
        page: filters.page,
        jobs: jobs.map((j) => ({
          id: j.id,
          title: j.role_title,
          company: j.company_name,
          location: [j.city, j.province].filter(Boolean).join(", "),
          work_model: j.work_model,
          job_type: j.job_type,
          posted_at: j.posted_at,
          match_percent: j.match_percent ?? null,
          trackr_url: `${SITE_URL}/discover/${j.id}`,
        })),
      });
    })
  );

  server.registerTool(
    "get_job",
    {
      title: "Get a job",
      description: "One job's full posting (description in markdown), whether it's still open, and the user's match.",
      inputSchema: z.object({ job_id: z.string().uuid() }),
      annotations: { readOnlyHint: true },
    },
    withCtx(async ({ db }, { job_id }) => {
      const job = await getJob(db, job_id);
      return job ? text({ ...job, trackr_url: `${SITE_URL}/discover/${job.id}` }) : fail("No job with that id.");
    })
  );

  server.registerTool(
    "build_apply_kit",
    {
      title: "Build an apply kit",
      description:
        "Adds the job to the user's tracker (as Wishlist) and answers its application form from their saved profile. Factual answers (work authorization, contact, self-identification) come only from the profile. Open-ended questions come back empty: draft them with the user from their real experience, never invent facts. The user fills and submits the form themselves.",
      inputSchema: z.object({ job_id: z.string().uuid() }),
    },
    withCtx(async ({ db, userId, email }, { job_id }) => {
      const started = await startKit(db, job_id);
      if (!started.ok) return fail(started.error);
      const kit = await profileKit(db, userId, email, started.jobUrl);
      await storeKit(db, started.applicationId, kit.answers, "");
      return text({
        application_id: started.applicationId,
        company: started.company,
        role: started.role,
        apply_url: started.jobUrl,
        other_applications_at_company_last_30_days: started.recentAtCompany,
        questions_are_from_posting: kit.fromPosting,
        profile_complete: kit.hasProfile,
        answers: kit.answers.map(({ section, label, value, options, required, source }) => ({ section, label, value, options, required, needs_user: source === "empty" })),
      });
    })
  );

  server.registerTool(
    "log_application",
    {
      title: "Log an application",
      description: "Adds a job the user found elsewhere to their tracker. Use build_apply_kit instead for jobs from search_jobs.",
      inputSchema: z.object({
        company: z.string().min(1).max(200),
        role: z.string().min(1).max(200),
        job_url: z.string().url().max(2048).optional(),
        location: z.string().max(200).optional(),
        status: z.enum(STATUSES).optional().describe("Defaults to wishlist"),
      }),
    },
    withCtx(async ({ db }, a) => {
      const status = a.status ?? "wishlist";
      const { data, error } = await db
        .from("applications")
        .insert({
          company_name: a.company,
          role_title: a.role,
          job_url: a.job_url ?? null,
          location: a.location ?? null,
          status,
          applied_at: status === "wishlist" ? null : today(),
        })
        .select("id, company_name, role_title, status")
        .single();
      return error ? fail("Couldn't add it to the tracker.") : text(data);
    })
  );

  server.registerTool(
    "list_applications",
    {
      title: "List applications",
      description: "The user's tracked applications, most recently updated first.",
      inputSchema: z.object({ status: z.enum(STATUSES).optional(), limit: z.number().int().min(1).max(100).optional() }),
      annotations: { readOnlyHint: true },
    },
    withCtx(async ({ db }, a) => {
      let q = db
        .from("applications")
        .select("id, company_name, role_title, status, location, job_url, applied_at, deadline_at, follow_up_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(a.limit ?? 50);
      if (a.status) q = q.eq("status", a.status);
      const { data, error } = await q;
      return error ? fail("Couldn't load applications.") : text(data);
    })
  );

  server.registerTool(
    "update_status",
    {
      title: "Update an application's status",
      description: "Moves an application on the user's board, e.g. to interviewing after they hear back.",
      inputSchema: z.object({ application_id: z.string().uuid(), status: z.enum(STATUSES) }),
    },
    withCtx(async ({ db }, { application_id, status }) => {
      const { data: row } = await db.from("applications").select("applied_at").eq("id", application_id).maybeSingle();
      if (!row) return fail("No application with that id.");
      const { data, error } = await db
        .from("applications")
        // Leaving the wishlist records when they applied, like the board does.
        .update({ status, ...(status !== "wishlist" && !row.applied_at ? { applied_at: today() } : {}) })
        .eq("id", application_id)
        .select("id, company_name, role_title, status, applied_at")
        .single();
      return error ? fail("Couldn't update it.") : text(data);
    })
  );
}
