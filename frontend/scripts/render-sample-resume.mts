// Renders a sample resume with tricky characters to .tex, for the CI compile check:
//   node --experimental-strip-types scripts/render-sample-resume.mts out.tex
import { writeFileSync } from "node:fs";
import { buildResume, toLatex, type ResumeBulletRow, type ResumeEntryRow } from "../src/lib/resume.ts";
const e = (o: Partial<ResumeEntryRow>): ResumeEntryRow => ({ id: "e", section: "experience", title: "", organization: "", location: "", start_date: "", end_date: "", tech: "", details: "", position: 0, ...o });
const b = (o: Partial<ResumeBulletRow>): ResumeBulletRow => ({ id: "b", entry_id: null, section: "experience", heading: "", content: "", position: 0, ...o });
const m = buildResume(
  { name: "Ada Lovelace", email: "ada@example.com", phone: "403-555-0100", linkedin_url: "https://linkedin.com/in/ada", github_url: "https://github.com/ada", location: "Calgary, AB" },
  [
    e({ id: "ed", section: "education", title: "BSc Computer Science", organization: "University of Calgary", location: "Calgary, AB", start_date: "Sep 2023", end_date: "Apr 2027", details: "GPA 3.8/4.0" }),
    e({ id: "x1", title: "Software Developer Intern", organization: "R&D Labs Inc.", location: "Toronto, ON", start_date: "May 2026", end_date: "Aug 2026", position: 1 }),
    e({ id: "x2", title: "IT Support Assistant", organization: "Campus IT", location: "Calgary, AB", start_date: "Sep 2024", end_date: "Present", position: 2 }),
    e({ id: "p1", section: "project", title: "Trackr", tech: "Next.js, TypeScript, PostgreSQL", start_date: "Oct 2026" }),
  ],
  [
    b({ id: "1", entry_id: "x1", content: "Cut p99 API latency by 40% & saved ~$2k/month with a Redis cache", position: 1 }),
    b({ id: "2", entry_id: "x1", content: "Built C# tooling for the_build pipeline used by #platform (12 teams)", position: 2 }),
    b({ id: "3", entry_id: "x2", content: "Resolved 300+ tickets; wrote a {templated} FAQ that cut repeats by 25%" }),
    b({ id: "4", entry_id: "p1", section: "project", content: "Built a job tracker with drag-and-drop, CSV import and row-level security" }),
    b({ id: "s1", section: "skills", heading: "Languages", content: "TypeScript, Python, C++, SQL", position: 1 }),
    b({ id: "s2", section: "skills", heading: "Tools", content: "Git, Docker, Postgres, AWS", position: 2 }),
  ]
);
writeFileSync(process.argv[2], toLatex(m));
