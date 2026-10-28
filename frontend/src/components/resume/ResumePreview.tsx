import React from "react";
import { dateRange, displayUrl, type ResumeEntry, type ResumeModel } from "@/lib/resume";

// An HTML rendering of Jake's Resume at true size (US Letter, 0.5in margins, 11pt base),
// so the preview and "Save as PDF" match the LaTeX output closely. Colours are fixed: a
// resume is black on white whatever the site theme.

const FONT = `"Latin Modern Roman", "CMU Serif", "Computer Modern Serif", "Times New Roman", Times, serif`;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "6pt" }}>
      <h2 style={{ fontSize: "14.4pt", fontVariant: "small-caps", fontWeight: 400, borderBottom: "0.4pt solid #000", lineHeight: 1.2, margin: "0 0 4pt" }}>
        {title}
      </h2>
      <div style={{ paddingLeft: "0.15in" }}>{children}</div>
    </section>
  );
}

function Row({ left, right, style }: { left: React.ReactNode; right: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "12pt", width: "97%", ...style }}>
      <span>{left}</span>
      <span style={{ whiteSpace: "nowrap" }}>{right}</span>
    </div>
  );
}

function Bullets({ entry }: { entry: ResumeEntry }) {
  if (!entry.bullets.length) return null;
  return (
    <ul style={{ listStyle: "disc", margin: "2pt 0 4pt", paddingLeft: "0.3in", fontSize: "10pt", lineHeight: 1.25 }}>
      {entry.bullets.map((b) => (
        <li key={b.id} style={{ marginBottom: "1pt" }}>{b.text}</li>
      ))}
    </ul>
  );
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>
      {children}
    </a>
  );
}

export default function ResumePreview({ model }: { model: ResumeModel }) {
  const c = model.contact;
  const contact: React.ReactNode[] = [];
  if (c.phone) contact.push(c.phone);
  if (c.email) contact.push(<Link href={`mailto:${c.email}`}>{c.email}</Link>);
  for (const url of [c.linkedin_url, c.github_url, c.website_url]) {
    if (url) contact.push(<Link href={url}>{displayUrl(url)}</Link>);
  }
  if (c.location) contact.push(c.location);

  return (
    <article
      id="resume-sheet"
      aria-label="Resume preview"
      style={{ width: "8.5in", minHeight: "11in", padding: "0.5in", background: "#fff", color: "#000", fontFamily: FONT, fontSize: "11pt", lineHeight: 1.2, boxSizing: "border-box" }}
    >
      <div style={{ textAlign: "center", marginBottom: "4pt" }}>
        <h1 style={{ fontSize: "24.88pt", fontWeight: 700, fontVariant: "small-caps", lineHeight: 1.1, margin: 0 }}>
          {c.name || "Your Name"}
        </h1>
        {contact.length > 0 && (
          <p style={{ fontSize: "10pt", margin: "3pt 0 0" }}>
            {contact.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && " | "}
                {part}
              </React.Fragment>
            ))}
          </p>
        )}
      </div>

      {model.education.length > 0 && (
        <Section title="Education">
          {model.education.map((e) => (
            <div key={e.id} style={{ marginBottom: "3pt" }}>
              <Row left={<strong>{e.organization}</strong>} right={e.location} />
              <Row
                style={{ fontSize: "10pt", fontStyle: "italic" }}
                left={e.details ? `${e.title}, ${e.details}` : e.title}
                right={dateRange(e.start_date, e.end_date)}
              />
              <Bullets entry={e} />
            </div>
          ))}
        </Section>
      )}

      {model.experience.length > 0 && (
        <Section title="Experience">
          {model.experience.map((e) => (
            <div key={e.id} style={{ marginBottom: "3pt" }}>
              <Row left={<strong>{e.title}</strong>} right={dateRange(e.start_date, e.end_date)} />
              <Row style={{ fontSize: "10pt", fontStyle: "italic" }} left={e.organization} right={e.location} />
              <Bullets entry={e} />
            </div>
          ))}
        </Section>
      )}

      {model.projects.length > 0 && (
        <Section title="Projects">
          {model.projects.map((p) => (
            <div key={p.id} style={{ marginBottom: "3pt" }}>
              <Row
                style={{ fontSize: "10pt" }}
                left={
                  <>
                    <strong>{p.title}</strong>
                    {p.tech && (
                      <>
                        {" | "}
                        <em>{p.tech}</em>
                      </>
                    )}
                  </>
                }
                right={dateRange(p.start_date, p.end_date)}
              />
              <Bullets entry={p} />
            </div>
          ))}
        </Section>
      )}

      {model.skills.length > 0 && (
        <Section title="Technical Skills">
          <div style={{ fontSize: "10pt", lineHeight: 1.3 }}>
            {model.skills.map((s, i) => (
              <div key={i}>
                <strong>{s.category}</strong>: {s.items}
              </div>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}
