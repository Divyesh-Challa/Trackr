// Converts Supabase rows into the shapes the existing UI components expect.
import type { Database } from "./supabase/database.types";
import type {
  Application,
  ApplicationStatus,
  ApplicationStateTransition,
  DiscoveredJob,
} from "../types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type DbApplication = Tables["applications"]["Row"];
export type DbJob = Tables["jobs"]["Row"];
export type DbStatus = Enums["application_status"];
export type DbWorkModel = Enums["work_model"];

const STATUS_TO_UI: Record<DbStatus, ApplicationStatus> = {
  wishlist: "WISHLIST",
  applied: "APPLIED",
  oa: "OA_SCHEDULED",
  interviewing: "INTERVIEWING",
  offer: "OFFER",
  rejected: "REJECTED",
  withdrawn: "WITHDRAWN",
};

const STATUS_TO_DB = Object.fromEntries(
  Object.entries(STATUS_TO_UI).map(([db, ui]) => [ui, db])
) as Record<ApplicationStatus, DbStatus>;

export function statusToUi(status: DbStatus): ApplicationStatus {
  return STATUS_TO_UI[status];
}

export function statusToDb(status: string): DbStatus {
  const mapped = STATUS_TO_DB[status.toUpperCase() as ApplicationStatus];
  if (!mapped) throw new Error(`Unknown application status: ${status}`);
  return mapped;
}

export function workModelToUi(model: DbWorkModel | null): Application["work_model"] {
  return model ? (model.toUpperCase() as Application["work_model"]) : undefined;
}

export function workModelToDb(model: string | null | undefined): DbWorkModel | null {
  if (!model) return null;
  const lower = model.toLowerCase();
  if (lower === "remote" || lower === "hybrid" || lower === "onsite") return lower;
  throw new Error(`Unknown work model: ${model}`);
}

export type DbApplicationWithCounts = DbApplication & {
  application_tasks?: { is_completed: boolean }[];
  application_contacts?: { count: number }[];
  application_notes?: { count: number }[];
};

export function toApplication(row: DbApplicationWithCounts): Application {
  const tasks = row.application_tasks ?? [];
  return {
    id: row.id,
    user_id: row.user_id,
    job_id: row.job_id,
    company_name: row.company_name,
    role_title: row.role_title,
    job_location: row.location ?? undefined,
    work_model: workModelToUi(row.work_model),
    status: statusToUi(row.status),
    applied_date: row.applied_at ?? row.created_at.slice(0, 10),
    salary_range: row.salary_text ?? undefined,
    job_description_url: row.job_url ?? undefined,
    raw_description: row.description ?? undefined,
    deadline_at: row.deadline_at,
    follow_up_at: row.follow_up_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    task_count: tasks.length,
    completed_tasks: tasks.filter((t) => t.is_completed).length,
    contact_count: row.application_contacts?.[0]?.count ?? 0,
    note_count: row.application_notes?.[0]?.count ?? 0,
  };
}

export function toTransition(
  row: Tables["application_state_transitions"]["Row"]
): ApplicationStateTransition {
  return {
    id: row.id,
    application_id: row.application_id,
    from_status: row.from_status ? statusToUi(row.from_status) : null,
    to_status: statusToUi(row.to_status),
    transitioned_at: row.transitioned_at,
  };
}

/** Pay as stated in the posting, or null. Never estimated. */
export function formatPostedSalary(
  job: Pick<DbJob, "salary_min" | "salary_max" | "salary_period" | "salary_currency" | "salary_source">
): string | null {
  if (job.salary_source !== "posted" || (job.salary_min == null && job.salary_max == null)) {
    return null;
  }
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: job.salary_currency || "CAD",
      maximumFractionDigits: 0,
    }).format(n);
  const range =
    job.salary_min != null && job.salary_max != null && job.salary_min !== job.salary_max
      ? `${fmt(job.salary_min)}–${fmt(job.salary_max)}`
      : fmt((job.salary_min ?? job.salary_max)!);
  const suffix = { hour: "/hr", month: "/mo", year: "/yr" }[job.salary_period ?? ""] ?? "";
  return `${range}${suffix}`;
}

export type FeedJobRow = Pick<
  DbJob,
  | "id" | "source" | "company_name" | "company_domain" | "company_size" | "title" | "locations"
  | "city" | "province" | "work_model" | "job_type" | "term" | "terms" | "disciplines" | "job_url"
  | "salary_min" | "salary_max" | "salary_currency" | "salary_period" | "salary_source"
  | "posted_at" | "deadline_at" | "first_seen_at" | "created_at"
> & { description_md?: string | null };

export function toDiscoveredJob(row: FeedJobRow): DiscoveredJob {
  return {
    id: row.id,
    source: row.source,
    company_name: row.company_name,
    company_domain: row.company_domain ?? undefined,
    role_title: row.title,
    city: row.city ?? row.locations[0] ?? "",
    province: row.province ?? (row.work_model === "remote" ? "REMOTE" : ""),
    work_model: workModelToUi(row.work_model),
    job_type: row.job_type ?? undefined,
    term: row.term ?? undefined,
    terms: row.terms,
    disciplines: row.disciplines,
    company_size: (row.company_size as DiscoveredJob["company_size"]) ?? null,
    locations: row.locations,
    salary: formatPostedSalary(row),
    job_url: row.job_url,
    description: row.description_md ?? "",
    posted_at: row.posted_at ?? row.first_seen_at,
    deadline_at: row.deadline_at ?? undefined,
    created_at: row.created_at,
  };
}
