import { describe, expect, it } from "vitest";
import { greenhouseQuestions, pickOption, profileAnswer, type KitQuestion, type ProfileFacts } from "../apply-kit";

const facts: ProfileFacts = {
  full_name: "Ada Mary Lovelace", email: "ada@example.com", phone: "555-0100",
  linkedin_url: "https://linkedin.com/in/ada", github_url: "https://github.com/ada",
  school: "University of Alberta", grad_label: "Winter 2027",
  street: "1 Main St", city: "Edmonton", region: "AB", postal_code: "T5J 0N3", country: "Canada",
  work_auth: { Canada: { authorized: true, needs_sponsorship: false }, "United States": { authorized: false, needs_sponsorship: true } },
  willing_to_relocate: true, in_person_ok: null, earliest_start: "May 2027", eeo: { gender: "Woman" },
};
const q = (label: string, options?: string[]): KitQuestion => ({ section: "s", label, required: false, kind: options ? "select" : "text", options });

describe("profileAnswer", () => {
  it("splits names", () => {
    expect(profileAnswer(q("First Name"), facts)).toBe("Ada");
    expect(profileAnswer(q("Last Name"), facts)).toBe("Mary Lovelace");
  });
  it("answers work authorization per country, picking the form's option", () => {
    expect(profileAnswer(q("Are you legally authorized to work in Canada?", ["Yes", "No"]), facts)).toBe("Yes");
    expect(profileAnswer(q("Are you authorized to work in the United States?", ["Yes", "No"]), facts)).toBe("No");
    expect(profileAnswer(q("Will you require visa sponsorship?", ["No, I will not", "Yes, I will"]), facts, "United States")).toBe("Yes, I will");
  });
  it("answers self-identification, defaulting to prefer not to say", () => {
    expect(profileAnswer(q("Gender", ["Man", "Woman", "Prefer not to say"]), facts)).toBe("Woman");
    expect(profileAnswer(q("Veteran status", ["I am a veteran", "Prefer not to say"]), facts)).toBe("Prefer not to say");
  });
  it("finds each form's own wording for declining to self-identify", () => {
    expect(profileAnswer(q("Race", ["Decline To Self Identify", "Two or More Races"]), facts)).toBe("Decline To Self Identify");
    expect(profileAnswer(q("VeteranStatus", ["I don't wish to answer", "I am not a protected veteran"]), facts)).toBe("I don't wish to answer");
  });
  it("doesn't read a remote-work preference as in-person", () => {
    expect(profileAnswer(q("If this role offers remote work, do you intend to work remotely or from an office location?", ["Yes, I intend to work remotely.", "No"]), { ...facts, in_person_ok: true })).toBe("");
  });
  it("leaves unknowns empty for the user", () => {
    expect(profileAnswer(q("Are you comfortable working in person?", ["Yes", "No"]), facts)).toBe("");
    expect(profileAnswer(q("Why do you want to work here?"), facts)).toBe("");
  });
});

describe("pickOption", () => {
  it("never invents an option", () => expect(pickOption("Maybe", ["Yes", "No"])).toBe(""));
});

describe("greenhouseQuestions", () => {
  it("reads questions, options and compliance", () => {
    const qs = greenhouseQuestions({
      questions: [
        { label: "Resume/CV", required: true, fields: [{ type: "input_file" }] },
        { label: "Sponsorship?", required: true, fields: [{ type: "multi_value_single_select", values: [{ label: "Yes" }, { label: "No" }] }] },
        { label: "Hidden", fields: [{ type: "input_hidden" }] },
      ],
      compliance: [{ questions: [{ label: "Gender", fields: [{ type: "multi_value_single_select", values: [{ label: "Decline" }] }] }] }],
    });
    expect(qs.map((x) => [x.label, x.kind, x.section])).toEqual([
      ["Resume/CV", "file", "Application"],
      ["Sponsorship?", "select", "Application"],
      ["Gender", "select", "Self-identification"],
    ]);
    expect(qs[1].options).toEqual(["Yes", "No"]);
  });
});
