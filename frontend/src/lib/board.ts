import type { Application, ApplicationStatus } from "../types";

export const COLUMNS: { id: ApplicationStatus; title: string; accent: string }[] = [
  { id: "WISHLIST", title: "Wishlist", accent: "bg-slate-400" },
  { id: "APPLIED", title: "Applied", accent: "bg-blue-500" },
  { id: "OA_SCHEDULED", title: "Online assessment", accent: "bg-violet-500" },
  { id: "INTERVIEWING", title: "Interviewing", accent: "bg-amber-500" },
  { id: "OFFER", title: "Offer", accent: "bg-emerald-500" },
  { id: "REJECTED", title: "Rejected", accent: "bg-rose-400" },
  { id: "WITHDRAWN", title: "Withdrawn", accent: "bg-slate-300" },
];

export const STATUS_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.id, c.title])) as Record<
  ApplicationStatus,
  string
>;

const GAP = 1024;

/**
 * Position for an item dropped between `before` and `after` (either may be missing).
 * Positions are sparse floats, so a move only ever rewrites the moved row.
 */
export function positionBetween(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return GAP;
  if (before === undefined) return after! - GAP;
  if (after === undefined) return before + GAP;
  return (before + after) / 2;
}

export function sortByPosition(apps: Application[]): Application[] {
  return [...apps].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0) || b.updated_at.localeCompare(a.updated_at)
  );
}

export type DueInfo = { date: string; label: string; kind: "deadline" | "follow-up" | "task"; days: number };

function daysUntil(isoDate: string, today: Date): number {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  const due = Date.UTC(y, m - 1, d);
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((due - now) / 86_400_000);
}

/** The most urgent upcoming date on an application, if any is within `withinDays` (or overdue). */
export function nextDue(app: Application, today = new Date(), withinDays = 7): DueInfo | null {
  const candidates: { date: string; kind: DueInfo["kind"] }[] = [];
  const closed = app.status === "REJECTED" || app.status === "WITHDRAWN" || app.status === "OFFER";
  if (app.deadline_at && app.status === "WISHLIST") candidates.push({ date: app.deadline_at, kind: "deadline" });
  if (app.follow_up_at && !closed) candidates.push({ date: app.follow_up_at, kind: "follow-up" });
  if (app.next_task_due && !closed) candidates.push({ date: app.next_task_due, kind: "task" });
  if (!candidates.length) return null;

  const soonest = candidates
    .map((c) => ({ ...c, days: daysUntil(c.date, today) }))
    .sort((a, b) => a.days - b.days)[0];
  if (soonest.days > withinDays) return null;

  const what = { deadline: "Deadline", "follow-up": "Follow up", task: "Task due" }[soonest.kind];
  const when =
    soonest.days < 0
      ? `${-soonest.days}d overdue`
      : soonest.days === 0
        ? "today"
        : soonest.days === 1
          ? "tomorrow"
          : `in ${soonest.days}d`;
  return { date: soonest.date, kind: soonest.kind, days: soonest.days, label: `${what} ${when}` };
}

export function matchesSearch(app: Application, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [app.company_name, app.role_title, app.job_location ?? ""].some((s) =>
    s.toLowerCase().includes(needle)
  );
}
