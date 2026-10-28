// Builds a resume in Jake Gutierrez's "Jake's Resume" layout (MIT licensed,
// github.com/jakegut/resume) from the user's own entries and bullets, and renders it
// to LaTeX. Every user-supplied string is escaped before it reaches LaTeX.

export type ResumeContact = {
  name: string;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website_url?: string | null;
};

export type ResumeEntryRow = {
  id: string;
  section: "education" | "experience" | "project";
  title: string;
  organization: string;
  location: string;
  start_date: string;
  end_date: string;
  tech: string;
  details: string;
  position: number;
};

export type ResumeBulletRow = {
  id: string;
  entry_id: string | null;
  section: string;
  heading: string;
  content: string;
  position: number;
};

export type ResumeEntry = ResumeEntryRow & { bullets: { id: string; text: string }[] };
export type SkillLine = { category: string; items: string };

export type ResumeModel = {
  contact: ResumeContact;
  education: ResumeEntry[];
  experience: ResumeEntry[];
  projects: ResumeEntry[];
  skills: SkillLine[];
};

/** Optional tailoring: which bullets to show, in what order, with what wording. */
export type Tailoring = { bullets: { bullet_id: string; text: string }[] };

/** Where the AI tab leaves a tailoring (in sessionStorage) for the resume page to show. */
export const TAILORING_KEY = "trackr:tailoring";
export type StoredTailoring = Tailoring & { label: string };

export function dateRange(start: string, end: string): string {
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

export function buildResume(
  contact: ResumeContact,
  entries: ResumeEntryRow[],
  bullets: ResumeBulletRow[],
  tailoring?: Tailoring
): ResumeModel {
  const rewrite = tailoring ? new Map(tailoring.bullets.map((b, i) => [b.bullet_id, { text: b.text, rank: i }])) : null;
  const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

  const withBullets = (entry: ResumeEntryRow): ResumeEntry => {
    let own = bullets.filter((b) => b.entry_id === entry.id).sort(byPosition);
    if (rewrite) {
      // Tailored: keep only the chosen bullets, best first, in the tailored wording.
      own = own.filter((b) => rewrite.has(b.id)).sort((a, b) => rewrite.get(a.id)!.rank - rewrite.get(b.id)!.rank);
    }
    return { ...entry, bullets: own.map((b) => ({ id: b.id, text: rewrite?.get(b.id)?.text ?? b.content })) };
  };

  const section = (name: ResumeEntryRow["section"]) => {
    const list = entries.filter((e) => e.section === name).sort(byPosition).map(withBullets);
    // A tailored resume drops experience and projects with no chosen bullets; education always stays.
    return rewrite && name !== "education" ? list.filter((e) => e.bullets.length) : list;
  };

  return {
    contact,
    education: section("education"),
    experience: section("experience"),
    projects: section("project"),
    skills: bullets
      .filter((b) => b.section === "skills" && !b.entry_id)
      .sort(byPosition)
      .map((b) => ({ category: b.heading || "Skills", items: b.content })),
  };
}

const LATEX_SPECIALS: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "&": "\\&",
  "%": "\\%",
  $: "\\$",
  "#": "\\#",
  _: "\\_",
  "{": "\\{",
  "}": "\\}",
  "~": "$\\sim$", // "~$2k" means "about"; \textasciitilde renders as a raised accent
  "^": "\\textasciicircum{}",
  "<": "\\textless{}",
  ">": "\\textgreater{}",
};

/** Escapes text for LaTeX body content. */
export function tex(value: string | null | undefined): string {
  return (value ?? "").replace(/[\\&%$#_{}~^<>]/g, (c) => LATEX_SPECIALS[c]).replace(/–/g, "--").replace(/—/g, "---");
}

/** Escapes a URL for \href's first argument (only %, # and \ need it there). */
export function texUrl(url: string): string {
  return url.replace(/\\/g, "").replace(/%/g, "\\%").replace(/#/g, "\\#");
}

export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function contactLine(c: ResumeContact): string {
  const parts: string[] = [];
  if (c.phone) parts.push(tex(c.phone));
  if (c.email) parts.push(`\\href{mailto:${texUrl(c.email)}}{\\underline{${tex(c.email)}}}`);
  for (const url of [c.linkedin_url, c.github_url, c.website_url]) {
    if (url) parts.push(`\\href{${texUrl(url)}}{\\underline{${tex(displayUrl(url))}}}`);
  }
  if (c.location) parts.push(tex(c.location));
  return parts.join(" $|$ ");
}

function itemList(entry: ResumeEntry): string {
  if (!entry.bullets.length) return "";
  return [
    "      \\resumeItemListStart",
    ...entry.bullets.map((b) => `        \\resumeItem{${tex(b.text)}}`),
    "      \\resumeItemListEnd",
  ].join("\n");
}

export function toLatex(m: ResumeModel): string {
  const out: string[] = [PREAMBLE, "\\begin{document}", "", "\\begin{center}"];
  out.push(`    \\textbf{\\Huge \\scshape ${tex(m.contact.name || "Your Name")}} \\\\ \\vspace{1pt}`);
  const line = contactLine(m.contact);
  if (line) out.push(`    \\small ${line}`);
  out.push("\\end{center}", "");

  if (m.education.length) {
    out.push("\\section{Education}", "  \\resumeSubHeadingListStart");
    for (const e of m.education) {
      const degree = e.details ? `${e.title}, ${e.details}` : e.title;
      out.push(
        "    \\resumeSubheading",
        `      {${tex(e.organization)}}{${tex(e.location)}}`,
        `      {${tex(degree)}}{${tex(dateRange(e.start_date, e.end_date))}}`
      );
      const items = itemList(e);
      if (items) out.push(items);
    }
    out.push("  \\resumeSubHeadingListEnd", "");
  }

  if (m.experience.length) {
    out.push("\\section{Experience}", "  \\resumeSubHeadingListStart");
    for (const e of m.experience) {
      out.push(
        "    \\resumeSubheading",
        `      {${tex(e.title)}}{${tex(dateRange(e.start_date, e.end_date))}}`,
        `      {${tex(e.organization)}}{${tex(e.location)}}`
      );
      const items = itemList(e);
      if (items) out.push(items);
    }
    out.push("  \\resumeSubHeadingListEnd", "");
  }

  if (m.projects.length) {
    out.push("\\section{Projects}", "  \\resumeSubHeadingListStart");
    for (const p of m.projects) {
      const name = p.tech ? `\\textbf{${tex(p.title)}} $|$ \\emph{${tex(p.tech)}}` : `\\textbf{${tex(p.title)}}`;
      out.push("    \\resumeProjectHeading", `      {${name}}{${tex(dateRange(p.start_date, p.end_date))}}`);
      const items = itemList(p);
      if (items) out.push(items);
    }
    out.push("  \\resumeSubHeadingListEnd", "");
  }

  if (m.skills.length) {
    out.push("\\section{Technical Skills}", " \\begin{itemize}[leftmargin=0.15in, label={}]", "    \\small{\\item{");
    m.skills.forEach((s, i) => {
      out.push(`     \\textbf{${tex(s.category)}}{: ${tex(s.items)}}${i < m.skills.length - 1 ? " \\\\" : ""}`);
    });
    out.push("    }}", " \\end{itemize}", "");
  }

  out.push("\\end{document}", "");
  return out.join("\n");
}

/** Plain text for pasting into application forms. */
export function toPlainText(m: ResumeModel): string {
  const c = m.contact;
  const lines = [c.name, [c.phone, c.email, c.linkedin_url, c.github_url, c.website_url, c.location].filter(Boolean).join(" | "), ""];
  const block = (title: string, entries: ResumeEntry[], head: (e: ResumeEntry) => string) => {
    if (!entries.length) return;
    lines.push(title.toUpperCase());
    for (const e of entries) {
      lines.push(head(e));
      for (const b of e.bullets) lines.push(`• ${b.text}`);
    }
    lines.push("");
  };
  block("Education", m.education, (e) => `${e.organization}, ${e.location} | ${e.title}${e.details ? `, ${e.details}` : ""} | ${dateRange(e.start_date, e.end_date)}`);
  block("Experience", m.experience, (e) => `${e.title} | ${e.organization}, ${e.location} | ${dateRange(e.start_date, e.end_date)}`);
  block("Projects", m.projects, (e) => `${e.title}${e.tech ? ` | ${e.tech}` : ""} | ${dateRange(e.start_date, e.end_date)}`);
  if (m.skills.length) {
    lines.push("TECHNICAL SKILLS", ...m.skills.map((s) => `${s.category}: ${s.items}`));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

// Jake's Resume preamble (MIT, Jake Gutierrez / sb2nov), unchanged except comments.
const PREAMBLE = String.raw`%-------------------------
% Resume in LaTeX, based on Jake's Resume (MIT) - github.com/jakegut/resume
% Generated by Trackr
%-------------------------
\documentclass[letterpaper,11pt]{article}

\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{}
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}
\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

\pdfgentounicode=1

\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabular*}{0.97\textwidth}[t]{l@{\extracolsep{\fill}}r}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabular*}{0.97\textwidth}{l@{\extracolsep{\fill}}r}
      \small#1 & #2 \\
    \end{tabular*}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}
`;
