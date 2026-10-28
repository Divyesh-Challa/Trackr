import { describe, expect, it } from "vitest";
import { parseJobUrl } from "../job-url";
import { importCsv, parseCsv, toCsv } from "../csv";
import { nextDue, positionBetween } from "../board";
import { statusToDb, statusToUi, toApplication } from "../mappers";
import { feedSearchParams, parseFeedParams, upcomingTerms } from "../feed";
import type { Application } from "../../types";

const app = (over: Partial<Application> = {}): Application => ({
  id: "1", user_id: "u", company_name: "Acme", role_title: "SWE Intern", status: "APPLIED",
  applied_date: "2026-10-01", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
  ...over,
});

describe("parseJobUrl", () => {
  it.each([
    ["https://job-boards.greenhouse.io/hootsuite/jobs/8221711", "greenhouse:8221711", "hootsuite"],
    ["https://boards.greenhouse.io/acme/jobs/4012345?gh_src=x", "greenhouse:4012345", "acme"],
    ["https://acme.com/careers?gh_jid=4012345", "greenhouse:4012345", null],
    ["https://jobs.lever.co/bosonai/2DBEDE2C-e0ad-4691-84ba-99e6755aebe8/apply", "lever:2dbede2c-e0ad-4691-84ba-99e6755aebe8", "bosonai"],
    ["https://jobs.ashbyhq.com/cohere/7133d205-5421-4336-a8e2-6037b5f55073/application", "ashby:7133d205-5421-4336-a8e2-6037b5f55073", "cohere"],
  ])("%s", (url, canonical, slug) => {
    const ref = parseJobUrl(url)!;
    expect(ref.canonical).toBe(canonical);
    expect(ref.slug).toBe(slug);
  });

  it.each([
    "https://example.com/jobs/1",
    "http://169.254.169.254/latest/meta-data",
    "javascript:alert(1)",
    "https://jobs.lever.co/a%2F..%2F..%2Fadmin/2dbede2c-e0ad-4691-84ba-99e6755aebe8",
    "https://evil.com/greenhouse.io/acme/jobs/123456",
    "not a url",
  ])("rejects %s", (url) => expect(parseJobUrl(url)).toBeNull());
});

describe("csv", () => {
  it("round-trips through export and import", () => {
    const csv = toCsv([app({ company_name: 'Acme, "Inc"', job_location: "Toronto, ON", deadline_at: "2026-11-15" })]);
    const { rows, errors } = importCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ company_name: 'Acme, "Inc"', status: "APPLIED", job_location: "Toronto, ON", deadline_at: "2026-11-15" });
  });

  it("neutralizes spreadsheet formulas on export and restores them on import", () => {
    const csv = toCsv([app({ company_name: "=HYPERLINK(\"x\")" })]);
    expect(csv).toContain("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(importCsv(csv).rows[0].company_name).toBe('=HYPERLINK("x")');
  });

  it("accepts common spreadsheet headers and statuses", () => {
    const { rows, errors } = importCsv(
      "Company Name,Job Title,Stage,Date Applied,Link\nShopify,Dev Intern,Phone Screen,2026-09-30,https://x.com/1\nRBC,Analyst,ghosted,,\nAcme,Intern,banana,,\n,Missing,,,\n"
    );
    expect(rows.map((r) => [r.company_name, r.status])).toEqual([["Shopify", "INTERVIEWING"], ["RBC", "REJECTED"]]);
    expect(rows[0].applied_at).toBe("2026-09-30");
    expect(errors.map((e) => e.line)).toEqual([4, 5]);
  });

  it("parses quoted newlines and a BOM", () => {
    expect(parseCsv('﻿a,b\n"multi\nline","x""y"\n')).toEqual([["a", "b"], ["multi\nline", 'x"y']]);
  });

  it("requires company and role columns", () => {
    expect(importCsv("foo,bar\n1,2").errors[0].message).toMatch(/company/);
  });
});

describe("board helpers", () => {
  it("positions between neighbours", () => {
    expect(positionBetween(undefined, undefined)).toBe(1024);
    expect(positionBetween(1024, 2048)).toBe(1536);
    expect(positionBetween(undefined, 1024)).toBe(0);
    expect(positionBetween(2048, undefined)).toBe(3072);
  });

  it("reports the most urgent date within a week", () => {
    const today = new Date(2026, 9, 27);
    expect(nextDue(app({ status: "WISHLIST", deadline_at: "2026-10-29" }), today)?.label).toBe("Deadline in 2d");
    expect(nextDue(app({ follow_up_at: "2026-10-25", next_task_due: "2026-10-28" }), today)?.label).toBe("Follow up 2d overdue");
    expect(nextDue(app({ follow_up_at: "2026-12-01" }), today)).toBeNull();
    expect(nextDue(app({ status: "REJECTED", follow_up_at: "2026-10-27" }), today)).toBeNull();
  });
});

describe("mappers", () => {
  it("maps statuses both ways", () => {
    expect(statusToDb("OA_SCHEDULED")).toBe("oa");
    expect(statusToUi("oa")).toBe("OA_SCHEDULED");
    expect(() => statusToDb("BOGUS")).toThrow();
  });

  it("derives counts and the next task due date", () => {
    const a = toApplication({
      id: "1", user_id: "u", job_id: null, company_name: "A", role_title: "R", location: null, work_model: "remote",
      status: "applied", position: 5, job_url: null, salary_text: null, description: null, applied_at: null,
      deadline_at: null, follow_up_at: null, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-02T00:00:00Z",
      application_tasks: [{ is_completed: true, due_date: "2026-10-01" }, { is_completed: false, due_date: "2026-11-02" }, { is_completed: false, due_date: null }],
      application_notes: [{ count: 2 }],
    });
    expect(a).toMatchObject({ work_model: "REMOTE", task_count: 3, completed_tasks: 1, note_count: 2, next_task_due: "2026-11-02", applied_date: "2026-10-01" });
  });
});

describe("feed params", () => {
  it("round-trips and drops invalid values", () => {
    const f = parseFeedParams({ province: "bc,ZZ", term: "s2027,bogus", discipline: "software,nope", size: "small", page: "3" });
    expect(f).toMatchObject({ provinces: ["BC"], terms: ["S2027"], disciplines: ["software"], smallCompanies: true, page: 3 });
    expect(parseFeedParams(Object.fromEntries(feedSearchParams(f)))).toEqual(f);
  });

  it("lists terms that haven't started", () => {
    expect(upcomingTerms(new Date(2026, 9, 27))).toEqual(["W2027", "S2027", "F2027", "W2028"]);
  });
});

import { computeInsights } from "../insights";

describe("insights", () => {
  const t = (application_id: string, from: string | null, to: string, at: string) => ({
    id: `${application_id}${to}`, application_id, from_status: from, to_status: to, transitioned_at: at,
  });
  const today = new Date(2026, 9, 28);

  it("builds the funnel and response stats from history", () => {
    const apps = [
      app({ id: "a", status: "INTERVIEWING", applied_date: "2026-10-01" }),
      app({ id: "b", status: "REJECTED", applied_date: "2026-10-05" }),
      app({ id: "c", status: "APPLIED", applied_date: "2026-10-20" }),
      app({ id: "d", status: "WISHLIST" }),
    ];
    const history = [
      t("a", null, "APPLIED", "2026-10-01T12:00:00Z"),
      t("a", "APPLIED", "OA_SCHEDULED", "2026-10-08T12:00:00Z"),
      t("a", "OA_SCHEDULED", "INTERVIEWING", "2026-10-15T12:00:00Z"),
      t("b", null, "APPLIED", "2026-10-05T12:00:00Z"),
      t("b", "APPLIED", "REJECTED", "2026-10-09T12:00:00Z"),
      t("c", null, "APPLIED", "2026-10-20T12:00:00Z"),
      t("d", null, "WISHLIST", "2026-10-20T12:00:00Z"),
    ];
    const r = computeInsights(apps, history, today, 4);
    expect(r.funnel.map((f) => f.count)).toEqual([3, 1, 1, 0]);
    expect(r.responseRate).toBeCloseTo(2 / 3);
    expect(r.medianDaysToResponse).toBe(6); // 7.5 and 4.5 days
    expect(r.perWeek.map((w) => w.count)).toEqual([1, 0, 1, 0]); // weeks of Oct 5, 12, 19, 26
    expect(r.open).toBe(2);
  });

  it("counts a role you went straight to interviewing for as applied", () => {
    const r = computeInsights([app({ id: "x", status: "INTERVIEWING" })], [t("x", null, "INTERVIEWING", "2026-10-02T00:00:00Z")], today);
    expect(r.funnel[0].count).toBe(1);
  });

  it("doesn't count a wishlist role that was closed as applied", () => {
    const r = computeInsights(
      [app({ id: "w", status: "REJECTED" })],
      [t("w", null, "WISHLIST", "2026-10-01T00:00:00Z"), t("w", "WISHLIST", "REJECTED", "2026-10-03T00:00:00Z")],
      today
    );
    expect(r.funnel[0].count).toBe(0);
  });

  it("handles no data", () => {
    const r = computeInsights([], [], today);
    expect(r.responseRate).toBeNull();
    expect(r.medianDaysToResponse).toBeNull();
  });
});

import { checkParagraphs, checkRewrites, inventedNumbers } from "../ai-guard";

describe("ai guard", () => {
  const bullets = [
    { id: "b1", heading: "Intern, Acme (2026)", content: "Cut API latency by 40% by adding a Redis cache" },
    { id: "b2", heading: "Project", content: "Built a React dashboard used by 12 teammates" },
  ];

  it("spots numbers the source never had", () => {
    expect(inventedNumbers("Cut latency 40% for 3,000 users", ["Cut API latency by 40%"])).toEqual(["3000"]);
    expect(inventedNumbers("Reduced latency by 40 percent", ["by 40%"])).toEqual([]);
  });

  it("keeps faithful rewrites, reverts invented metrics, drops unknown citations", () => {
    const out = checkRewrites(
      [
        { bullet_id: "b1", text: "Reduced API latency 40% with a Redis caching layer", why: "Matches 'performance'" },
        { bullet_id: "b2", text: "Built a React dashboard used by 50 engineers", why: "React" },
        { bullet_id: "zzz", text: "Led a team of 10", why: "made up" },
        { bullet_id: "b1", text: "duplicate", why: "dup" },
      ],
      bullets
    );
    expect(out.map((r) => [r.bullet_id, r.reverted])).toEqual([["b1", false], ["b2", true]]);
    expect(out[1].text).toBe(bullets[1].content);
  });

  it("flags unsupported numbers in cover letters but allows ones from the job post", () => {
    const [p1, p2] = checkParagraphs(
      [
        { text: "Your team of 25 engineers ships weekly; I cut latency 40%.", bullet_ids: ["b1"] },
        { text: "I mentored 8 interns.", bullet_ids: ["nope"] },
      ],
      bullets,
      "Join our team of 25 engineers"
    );
    expect(p1.flagged).toEqual([]);
    expect(p1.sources.map((s) => s.id)).toEqual(["b1"]);
    expect(p2.flagged).toEqual(["8"]);
    expect(p2.sources).toEqual([]);
  });
});

import { buildResume, tex, texUrl, toLatex, toPlainText, type ResumeBulletRow, type ResumeEntryRow } from "../resume";

describe("Jake's resume", () => {
  const entry = (o: Partial<ResumeEntryRow>): ResumeEntryRow => ({
    id: "e", section: "experience", title: "", organization: "", location: "", start_date: "", end_date: "", tech: "", details: "", position: 0, ...o,
  });
  const bullet = (o: Partial<ResumeBulletRow>): ResumeBulletRow => ({ id: "b", entry_id: null, section: "experience", heading: "", content: "", position: 0, ...o });
  const entries = [
    entry({ id: "ed", section: "education", title: "BSc Computer Science", organization: "University of Calgary", location: "Calgary, AB", start_date: "Sep 2023", end_date: "Apr 2027", details: "GPA 3.8" }),
    entry({ id: "x1", title: "Software Intern", organization: "R&D Labs", location: "Toronto, ON", start_date: "May 2026", end_date: "Aug 2026", position: 1 }),
    entry({ id: "x2", title: "IT Assistant", organization: "Campus IT", position: 2 }),
    entry({ id: "p1", section: "project", title: "Trackr", tech: "Next.js, Postgres", start_date: "2026" }),
  ];
  const bullets = [
    bullet({ id: "b1", entry_id: "x1", content: "Cut p99 latency 40% & saved $2k/mo", position: 1 }),
    bullet({ id: "b2", entry_id: "x1", content: "Wrote C# tooling for the_build", position: 2 }),
    bullet({ id: "b3", entry_id: "x2", content: "Fixed laptops" }),
    bullet({ id: "b4", entry_id: "p1", section: "project", content: "Built a job tracker" }),
    bullet({ id: "s1", section: "skills", heading: "Languages", content: "TypeScript, Python, C++" }),
  ];
  const contact = { name: "Ada Lovelace", email: "ada@example.com", linkedin_url: "https://www.linkedin.com/in/ada/", phone: "403-555-0100" };

  it("escapes every LaTeX special character", () => {
    expect(tex("R&D 40% $5 #1 a_b {x} ~ ^ \\ <a>")).toBe(
      "R\\&D 40\\% \\$5 \\#1 a\\_b \\{x\\} $\\sim$ \\textasciicircum{} \\textbackslash{} \\textless{}a\\textgreater{}"
    );
    expect(texUrl("https://x.com/a%20b#c")).toBe("https://x.com/a\\%20b\\#c");
  });

  it("renders the full resume in Jake's structure with escaped content", () => {
    const latex = toLatex(buildResume(contact, entries, bullets));
    expect(latex).toContain("\\documentclass[letterpaper,11pt]{article}");
    expect(latex).toContain("\\textbf{\\Huge \\scshape Ada Lovelace}");
    expect(latex).toContain("\\href{https://www.linkedin.com/in/ada/}{\\underline{linkedin.com/in/ada}}");
    expect(latex).toMatch(/\\section\{Education\}[\s\S]*\{University of Calgary\}\{Calgary, AB\}\s*\{BSc Computer Science, GPA 3.8\}\{Sep 2023 -- Apr 2027\}/);
    expect(latex).toContain("{Software Intern}{May 2026 -- Aug 2026}");
    expect(latex).toContain("{R\\&D Labs}{Toronto, ON}");
    expect(latex).toContain("\\resumeItem{Cut p99 latency 40\\% \\& saved \\$2k/mo}");
    expect(latex).toContain("\\resumeItem{Wrote C\\# tooling for the\\_build}");
    expect(latex).toContain("{\\textbf{Trackr} $|$ \\emph{Next.js, Postgres}}{2026}");
    expect(latex).toContain("\\textbf{Languages}{: TypeScript, Python, C++}");
    expect(latex.indexOf("\\section{Education}")).toBeLessThan(latex.indexOf("\\section{Experience}"));
    expect(latex.indexOf("\\section{Experience}")).toBeLessThan(latex.indexOf("\\section{Projects}"));
    // Braces stay balanced so the document compiles.
    const opens = (latex.match(/(?<!\\)\{/g) ?? []).length;
    const closes = (latex.match(/(?<!\\)\}/g) ?? []).length;
    expect(opens).toBe(closes);
  });

  it("tailoring keeps only chosen bullets, in order, with rewritten text", () => {
    const m = buildResume(contact, entries, bullets, {
      bullets: [
        { bullet_id: "b2", text: "Built C# build tooling" },
        { bullet_id: "b1", text: "Reduced p99 latency 40%" },
      ],
    });
    expect(m.experience.map((e) => e.title)).toEqual(["Software Intern"]); // IT Assistant had no chosen bullets
    expect(m.experience[0].bullets.map((b) => b.text)).toEqual(["Built C# build tooling", "Reduced p99 latency 40%"]);
    expect(m.education).toHaveLength(1);
    expect(m.projects).toHaveLength(0);
  });

  it("makes paste-ready plain text", () => {
    const text = toPlainText(buildResume(contact, entries, bullets));
    expect(text).toContain("EXPERIENCE\nSoftware Intern | R&D Labs, Toronto, ON | May 2026 – Aug 2026\n• Cut p99 latency 40% & saved $2k/mo");
    expect(text).toContain("TECHNICAL SKILLS\nLanguages: TypeScript, Python, C++");
  });
});
