// What the extension fills into an employer's form. Pure, so the extension bundles it too:
// a reviewed kit answer wins, then the cover letter, then the profile's factual answer.
import { pickOption, profileAnswer, type KitQuestion, type ProfileFacts } from "./apply-kit";

/** GET /api/v1/kit's body. */
export type KitPayload = {
  facts: ProfileFacts;
  jobCountry: string;
  application: { id: string; company: string; role: string } | null;
  /** The kit the user reviewed in Trackr, if they built one for this posting. */
  answers: { section: string; label: string; value: string }[];
  coverLetter: string;
};

/** A form field as the extension reads it, and as a receipt records it. */
export type FilledField = { section: string; label: string; value: string; options?: string[] };

export const normLabel = (s: string) =>
  s.toLowerCase().replace(/\((required|optional)\)|\*/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function answerField(q: KitQuestion, kit: KitPayload): string {
  const label = normLabel(q.label);
  const reviewed = kit.answers.find((a) => a.value && normLabel(a.label) === label)?.value;
  if (reviewed) return q.options ? pickOption(reviewed, q.options) : reviewed;
  if (/cover letter/.test(label) && q.kind !== "file") return kit.coverLetter;
  return profileAnswer(q, kit.facts, kit.jobCountry);
}

/** Copy-ready answers for boards the extension can't fill: the kit, else the common questions. */
export function copyAnswers(kit: KitPayload, common: KitQuestion[]): { section: string; label: string; value: string }[] {
  const rows = kit.answers.length
    ? kit.answers
    : common.map((q) => ({ section: q.section, label: q.label, value: profileAnswer(q, kit.facts, kit.jobCountry) }));
  return [...rows.filter((r) => r.value), ...(kit.coverLetter ? [{ section: "Application", label: "Cover letter", value: kit.coverLetter }] : [])];
}
