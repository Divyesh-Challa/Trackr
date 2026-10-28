// Funnel metrics computed from real status history (application_state_transitions).
import type { Application, ApplicationStateTransition, ApplicationStatus } from "../types";

const RANK: Partial<Record<ApplicationStatus, number>> = { APPLIED: 1, OA_SCHEDULED: 2, INTERVIEWING: 3, OFFER: 4 };
const RESPONSE: ApplicationStatus[] = ["OA_SCHEDULED", "INTERVIEWING", "OFFER", "REJECTED"];

export type Insights = {
  funnel: { stage: string; count: number }[];
  responseRate: number | null;
  medianDaysToResponse: number | null;
  perWeek: { weekStart: string; count: number }[];
  open: number;
};

export function computeInsights(
  apps: Application[],
  transitions: ApplicationStateTransition[],
  today = new Date(),
  weeks = 8
): Insights {
  const byApp = new Map<string, ApplicationStateTransition[]>();
  for (const t of transitions) {
    const list = byApp.get(t.application_id) ?? [];
    list.push(t);
    byApp.set(t.application_id, list);
  }

  let applied = 0, oa = 0, interviewing = 0, offer = 0, responded = 0;
  const responseDays: number[] = [];
  const appliedDates: Date[] = [];

  for (const app of apps) {
    const history = (byApp.get(app.id) ?? []).sort((a, b) => a.transitioned_at.localeCompare(b.transitioned_at));
    const statuses = [...history.map((h) => h.to_status as ApplicationStatus), app.status];
    const maxRank = Math.max(0, ...statuses.map((s) => RANK[s] ?? 0));
    // A rejection counts as having applied, unless it went straight from the wishlist
    // (e.g. the posting closed before you applied).
    const rejectedFromWishlist = history.some((h) => h.from_status === "WISHLIST" && h.to_status === "REJECTED");
    const everApplied = maxRank >= 1 || (statuses.includes("REJECTED") && !rejectedFromWishlist);
    if (!everApplied) continue;

    applied++;
    if (maxRank >= 2) oa++;
    if (maxRank >= 3) interviewing++;
    if (maxRank >= 4) offer++;

    const appliedAt = history.find((h) => (RANK[h.to_status as ApplicationStatus] ?? 0) >= 1 || h.to_status === "REJECTED");
    const appliedDate = app.applied_date ? new Date(`${app.applied_date}T00:00:00`) : appliedAt ? new Date(appliedAt.transitioned_at) : null;
    if (appliedDate) appliedDates.push(appliedDate);

    const firstResponse = history.find(
      (h) => RESPONSE.includes(h.to_status as ApplicationStatus) && h.from_status !== null && h.from_status !== "WISHLIST"
    );
    if (firstResponse || RESPONSE.includes(app.status)) responded++;
    if (firstResponse && appliedDate) {
      const days = (new Date(firstResponse.transitioned_at).getTime() - appliedDate.getTime()) / 86_400_000;
      if (days >= 0) responseDays.push(days);
    }
  }

  responseDays.sort((a, b) => a - b);
  const median = responseDays.length
    ? responseDays.length % 2
      ? responseDays[(responseDays.length - 1) / 2]
      : (responseDays[responseDays.length / 2 - 1] + responseDays[responseDays.length / 2]) / 2
    : null;

  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const perWeek = Array.from({ length: weeks }, (_, i) => {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 7 * (weeks - 1 - i));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    return {
      weekStart: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`,
      count: appliedDates.filter((d) => d >= start && d < end).length,
    };
  });

  return {
    funnel: [
      { stage: "Applied", count: applied },
      { stage: "Online assessment", count: oa },
      { stage: "Interview", count: interviewing },
      { stage: "Offer", count: offer },
    ],
    responseRate: applied ? responded / applied : null,
    medianDaysToResponse: median === null ? null : Math.round(median),
    perWeek,
    open: apps.filter((a) => !["OFFER", "REJECTED", "WITHDRAWN", "WISHLIST"].includes(a.status)).length,
  };
}
