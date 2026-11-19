// The apply kit's form logic: what a posting's form asks, and the answers we can give from
// the user's own profile without any AI. Factual questions (work authorization, contact,
// self-identification) are only ever answered from here, never generated.

export type KitQuestion = {
  section: string;
  label: string;
  required: boolean;
  kind: "text" | "textarea" | "select" | "multiselect" | "file";
  options?: string[];
};

export type KitAnswer = {
  section: string;
  label: string;
  value: string;
  options?: string[];
  /** profile = from the user's saved answers; ai = drafted, needs a read; empty = the user must answer. */
  source: "profile" | "ai" | "empty";
  required: boolean;
};

/** What the profile knows, flattened for matching. */
export type ProfileFacts = {
  full_name: string;
  email: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  school: string;
  grad_label: string;
  street: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  work_auth: Record<string, { authorized?: boolean; needs_sponsorship?: boolean; basis?: string }>;
  willing_to_relocate: boolean | null;
  in_person_ok: boolean | null;
  earliest_start: string;
  eeo: Partial<Record<"gender" | "race_ethnicity" | "indigenous" | "veteran" | "disability", string | null>>;
};

const PREFER_NOT = "Prefer not to say";

type GhField = { type?: string; values?: { label?: string }[] };
type GhQuestion = { label?: string; required?: boolean; fields?: GhField[] };

/** The questions on a Greenhouse posting, from boards-api ...?questions=true. */
export function greenhouseQuestions(json: unknown): KitQuestion[] {
  const j = (json ?? {}) as { questions?: GhQuestion[]; location_questions?: GhQuestion[]; compliance?: { questions?: GhQuestion[] }[] };
  const read = (qs: GhQuestion[] | undefined, section: string) =>
    (qs ?? []).flatMap((q): KitQuestion[] => {
      const field = q.fields?.[0];
      if (!q.label || !field || field.type === "input_hidden") return [];
      const kind: KitQuestion["kind"] =
        field.type === "input_file" ? "file"
        : field.type === "textarea" ? "textarea"
        : field.type === "multi_value_single_select" ? "select"
        : field.type === "multi_value_multi_select" ? "multiselect"
        : "text";
      const options = field.values?.map((v) => v.label ?? "").filter(Boolean);
      return [{ section, label: q.label.trim().slice(0, 500), required: Boolean(q.required), kind, ...(options?.length ? { options } : {}) }];
    });
  return [
    ...read(j.questions, "Application"),
    ...read(j.location_questions, "Location"),
    ...(j.compliance ?? []).flatMap((c) => read(c.questions, "Self-identification")),
  ].slice(0, 80);
}

/** Asked by almost every form; used when we can't read the posting's own questions. */
export const COMMON_QUESTIONS: KitQuestion[] = [
  { section: "Personal information", label: "First name", required: true, kind: "text" },
  { section: "Personal information", label: "Last name", required: true, kind: "text" },
  { section: "Personal information", label: "Email", required: true, kind: "text" },
  { section: "Personal information", label: "Phone", required: true, kind: "text" },
  { section: "Personal information", label: "Location (city)", required: false, kind: "text" },
  { section: "Personal information", label: "LinkedIn profile", required: false, kind: "text" },
  { section: "Personal information", label: "Website or GitHub", required: false, kind: "text" },
  { section: "Education", label: "School", required: false, kind: "text" },
  { section: "Education", label: "Expected graduation", required: false, kind: "text" },
  { section: "Eligibility", label: "Are you legally authorized to work in Canada?", required: true, kind: "select", options: ["Yes", "No"] },
  { section: "Eligibility", label: "Will you now or in the future require sponsorship for employment visa status?", required: true, kind: "select", options: ["Yes", "No"] },
  { section: "Logistics", label: "When can you start?", required: false, kind: "text" },
  { section: "Logistics", label: "Are you willing to relocate?", required: false, kind: "select", options: ["Yes", "No"] },
  { section: "Application", label: "Why are you interested in this role?", required: false, kind: "textarea" },
];

const yesNo = (b: boolean | null | undefined) => (b === true ? "Yes" : b === false ? "No" : "");

/** The option that best matches a value: exact, then starts-with (so "Yes" picks "Yes, I am authorized"). */
export function pickOption(value: string, options?: string[]): string {
  if (!value || !options?.length) return value;
  const v = value.toLowerCase();
  return (
    options.find((o) => o.toLowerCase() === v) ??
    options.find((o) => o.toLowerCase().startsWith(v)) ??
    options.find((o) => o.toLowerCase().includes(v)) ??
    ""
  );
}

/** Which country a work-authorization question is about. */
function countryOf(label: string, jobCountry: string): string {
  if (/\b(united states|u\.s\.|usa|\bus\b|america)/i.test(label)) return "United States";
  if (/\bcanad/i.test(label)) return "Canada";
  return jobCountry;
}

/** The answer from the user's profile, or "" when the profile doesn't cover the question. */
export function profileAnswer(q: KitQuestion, f: ProfileFacts, jobCountry = "Canada"): string {
  const value = rawAnswer(q, f, jobCountry);
  // A select can only take one of its options; free text ("Edmonton, AB") never goes in one.
  return q.options ? pickOption(value, q.options) : value;
}

function rawAnswer(q: KitQuestion, f: ProfileFacts, jobCountry: string): string {
  const l = q.label.toLowerCase();
  const [first, ...rest] = f.full_name.trim().split(/\s+/);
  const opt = (v: string) => pickOption(v, q.options);
  // Forms word "prefer not to say" many ways ("Decline To Self Identify", "I don't wish to answer").
  const eeo = (v: string | null | undefined) =>
    (v && opt(v)) || q.options?.find((o) => /decline|don.?t wish|prefer not|not to (say|answer|disclose)/i.test(o)) || (q.options ? "" : PREFER_NOT);

  if (q.kind === "file" || /pronounc/.test(l)) return "";
  if (/sponsor/.test(l)) return opt(yesNo(f.work_auth[countryOf(l, jobCountry)]?.needs_sponsorship));
  if (/(authori[sz]ed|eligible|entitled|legally|right) to work|work (authori[sz]ation|permit)/.test(l))
    return opt(yesNo(f.work_auth[countryOf(l, jobCountry)]?.authorized));
  if (/\bgender\b|\bsex\b/.test(l)) return eeo(f.eeo.gender);
  if (/\brace\b|ethnic/.test(l)) return eeo(f.eeo.race_ethnicity);
  if (/indigenous|aboriginal|first nations/.test(l)) return eeo(f.eeo.indigenous);
  if (/veteran|military/.test(l)) return eeo(f.eeo.veteran);
  if (/disabilit/.test(l)) return eeo(f.eeo.disability);
  if (/^first name|given name|preferred first/.test(l)) return first ?? "";
  if (/^last name|surname|family name/.test(l)) return rest.join(" ");
  if (/^(full |legal )?name\b/.test(l)) return f.full_name;
  if (/e-?mail/.test(l)) return f.email;
  if (/phone|mobile/.test(l)) return f.phone;
  if (/linkedin/.test(l)) return f.linkedin_url;
  if (/github|website|portfolio|personal (site|url)/.test(l)) return f.github_url;
  if (/relocat/.test(l)) return opt(yesNo(f.willing_to_relocate));
  if (/in[- ]person|on[- ]?site|commut/.test(l) && !/remote/.test(l)) return opt(yesNo(f.in_person_ok));
  if (/start date|available to start|can you start|earliest/.test(l)) return f.earliest_start;
  if (/graduat/.test(l)) return f.grad_label;
  if (/school|university|college|institution/.test(l)) return f.school;
  if (/postal|zip/.test(l)) return f.postal_code;
  if (/street|address/.test(l)) return [f.street, f.city, f.region, f.postal_code].filter(Boolean).join(", ");
  if (/\bcity\b|location/.test(l)) return [f.city, f.region].filter(Boolean).join(", ");
  if (/province|state/.test(l)) return f.region;
  if (/country/.test(l)) return opt(f.country);
  return "";
}

/** Which country's work rules a posting falls under, from its URL. */
export const jobCountryOf = (jobUrl: string, home: string) => (/united states|\busa?\b/i.test(jobUrl) ? "United States" : home || "Canada");
