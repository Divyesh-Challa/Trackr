import { describe, expect, it } from "vitest";
import { answerField, copyAnswers, normLabel, type KitPayload } from "../autofill";
import { COMMON_QUESTIONS, type KitQuestion } from "../apply-kit";
import { jobCanonical } from "../job-url";

const kit: KitPayload = {
  facts: {
    full_name: "Ada Lovelace", email: "ada@example.com", phone: "555-0100", linkedin_url: "", github_url: "",
    school: "", grad_label: "", street: "", city: "Edmonton", region: "AB", postal_code: "", country: "Canada",
    work_auth: { Canada: { authorized: true, needs_sponsorship: false } }, willing_to_relocate: null, in_person_ok: null,
    earliest_start: "", eeo: {},
  },
  jobCountry: "Canada",
  application: null,
  answers: [{ section: "Application", label: "Why do you want to work here?", value: "I use your product daily." }],
  coverLetter: "Dear team,",
};
const q = (label: string, kind: KitQuestion["kind"] = "text", options?: string[]): KitQuestion => ({ section: "s", label, required: false, kind, options });

describe("answerField", () => {
  it("uses the reviewed kit answer, matching labels loosely", () => {
    expect(answerField(q("Why do you want to work here? *", "textarea"), kit)).toBe("I use your product daily.");
  });
  it("puts the cover letter in a text cover-letter field but not a file input", () => {
    expect(answerField(q("Cover Letter", "textarea"), kit)).toBe("Dear team,");
    expect(answerField(q("Cover Letter", "file"), kit)).toBe("");
  });
  it("falls back to profile facts and the form's own options", () => {
    expect(answerField(q("First Name"), kit)).toBe("Ada");
    expect(answerField(q("Legal Name"), kit)).toBe("Ada Lovelace");
    expect(answerField(q("Name Pronunciation | How do you pronounce your name?"), kit)).toBe("");
    expect(answerField(q("Are you legally authorized to work in Canada?", "select", ["Yes", "No"]), kit)).toBe("Yes");
  });
});

describe("copyAnswers", () => {
  it("lists answered common questions plus the letter when there's no kit", () => {
    const rows = copyAnswers({ ...kit, answers: [] }, COMMON_QUESTIONS);
    expect(rows.find((r) => r.label === "Email")?.value).toBe("ada@example.com");
    expect(rows.every((r) => r.value)).toBe(true);
    expect(rows.at(-1)?.label).toBe("Cover letter");
  });
});

describe("normLabel and jobCanonical", () => {
  it("normalizes labels", () => expect(normLabel("First Name (required)*")).toBe("first name"));
  it("maps form URLs to the feed's canonical key", () => {
    expect(jobCanonical("https://jobs.lever.co/acme/0f3c2a1e-1111-2222-3333-444455556666/apply")).toBe("lever:0f3c2a1e-1111-2222-3333-444455556666");
    expect(jobCanonical("https://job-boards.greenhouse.io/acme/jobs/4012345")).toBe("greenhouse:4012345");
    expect(jobCanonical("https://www.careers.example.com/jobs/3/apply/")).toBe("careers.example.com/jobs/3");
    expect(jobCanonical("https://boards.greenhouse.io/embed/job_app?for=acme&token=4012345")).toBe("greenhouse:4012345");
    expect(jobCanonical("not a url")).toBeNull();
  });
});
