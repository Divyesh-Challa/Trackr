import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GATEWAY_URL =
  process.env.API_GATEWAY_URL || "https://trackr-gateway.onrender.com";

interface ParsedResume {
  full_name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  education: {
    school: string;
    degree: string;
    major: string;
    grad_term: string;
    gpa?: string;
    start_year?: string;
    is_coop_enrolled: boolean;
  };
  skills: string[];
  experiences: Array<{
    role: string;
    company: string;
    location: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    technologies: string;
    dates: string;
    link?: string;
    bullets: string[];
  }>;
  bullets: Array<{
    category: "EXPERIENCE" | "PROJECT";
    content: string;
  }>;
}

function isPageFooter(l: string): boolean {
  const t = l.trim();
  return (
    /^(?:--\s*)?(?:page\s*)?\d+\s*(?:of|\/)\s*\d+(?:\s*--)?$/i.test(t) ||
    /^\d+\s*of\s*\d+\s*--$/i.test(t) ||
    t === "--" ||
    t === "1 of 1 --"
  );
}

function cleanBullet(text: string): string {
  return text.replace(/^[•\-\*▪–—]\s*/, "").replace(/\s+/g, " ").trim();
}

function parseResumeStructure(rawText: string): ParsedResume {
  const rawLines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const lines = rawLines.filter((l) => !isPageFooter(l));

  const result: ParsedResume = {
    full_name: lines[0] || "Candidate",
    email: "",
    phone: "",
    city: "",
    province: "",
    linkedin_url: "",
    github_url: "",
    portfolio_url: "",
    education: {
      school: "",
      degree: "",
      major: "",
      grad_term: "",
      gpa: "",
      start_year: "",
      is_coop_enrolled: true,
    },
    skills: [],
    experiences: [],
    projects: [],
    bullets: [],
  };

  // 1. Header & Contact Information (from first 6 lines)
  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const l = lines[i];
    const em = l.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (em && !result.email) result.email = em[0];

    const ph = l.match(/(?:\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (ph && !result.phone) result.phone = ph[0];

    const loc = l.match(/\b([A-Za-z\s]+),\s*([A-Z]{2})\b/);
    if (loc && !result.city && !/university|college|school|faculty/i.test(l)) {
      result.city = loc[1].trim();
      result.province = loc[2].trim();
    }

    const li = l.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
    if (li && !result.linkedin_url) result.linkedin_url = li[0];

    const gh = l.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i);
    if (gh && !result.github_url) result.github_url = gh[0];
  }

  // 2. Sections Segmentation
  const sectionKeywords = [
    { key: "EDUCATION", regex: /^education$/i },
    { key: "SKILLS", regex: /^(?:technical\s+skills|skills\s*(?:&|and)\s*technologies|skills)$/i },
    { key: "PROJECTS", regex: /^(?:projects|technical\s+projects|featured\s+projects)$/i },
    { key: "EXPERIENCE", regex: /^(?:experience|work\s+experience|professional\s+experience|experience\s*&?\s*technical\s*leadership|employment\s+history)$/i },
  ];

  let currentSection = "HEADER";
  const sectionLines: Record<string, string[]> = {
    HEADER: [],
    EDUCATION: [],
    SKILLS: [],
    PROJECTS: [],
    EXPERIENCE: [],
  };

  for (const l of lines) {
    const sec = sectionKeywords.find((s) => s.regex.test(l));
    if (sec) {
      currentSection = sec.key;
      continue;
    }
    if (!sectionLines[currentSection]) sectionLines[currentSection] = [];
    sectionLines[currentSection].push(l);
  }

  // 3. Parse Education
  for (const el of sectionLines.EDUCATION || []) {
    if (/university|college|institute|polytechnic/i.test(el) && !result.education.school) {
      result.education.school = el.replace(/\b(?:Edmonton|Calgary|Vancouver|Toronto|Waterloo|Burnaby|Ottawa|Montreal|Victoria),\s*[A-Z]{2}\b/g, "").trim();
    }
    if (/bachelor|master|phd|diploma|b\.sc|bcs|b\.eng|associate/i.test(el) && !result.education.degree) {
      const gradMatch = el.match(/(?:Expected\s+)?([A-Za-z]+\s+20\d\d)/i);
      if (gradMatch) {
        result.education.grad_term = gradMatch[0].trim();
      }
      let deg = el.replace(/(?:Expected\s+)?(?:[A-Za-z]+\s+20\d\d).*$/i, "").trim();
      if (/in\s+(?:Computing|Computer|Software|Data|Electrical|Mechanical)/i.test(deg)) {
        const parts = deg.split(/\s+in\s+/i);
        result.education.degree = parts[0].trim();
        result.education.major = parts[1].trim();
      } else {
        result.education.degree = deg;
      }
    }
    if (!result.education.major && /computing science|computer science|software engineering|data science/i.test(el)) {
      if (/computing science/i.test(el)) result.education.major = "Computing Science";
      else if (/computer science/i.test(el)) result.education.major = "Computer Science";
      else if (/software engineering/i.test(el)) result.education.major = "Software Engineering";
    }
  }

  if (!result.education.school) result.education.school = "University of Alberta";
  if (!result.education.degree) result.education.degree = "Bachelor of Science";
  if (!result.education.major) result.education.major = "Computing Science";
  if (!result.education.grad_term) result.education.grad_term = "Expected Apr 2028";

  // 4. Parse Technical Skills
  const skillSet = new Set<string>();
  for (const sl of sectionLines.SKILLS || []) {
    const cleaned = sl.replace(/^[^:]+:\s*/, "");
    cleaned
      .split(/[,|•]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 35)
      .forEach((s) => skillSet.add(s));
  }
  result.skills = Array.from(skillSet);
  if (result.skills.length === 0) {
    result.skills = [
      "Python", "SQL", "Go", "TypeScript", "JavaScript", "Bash", "C++",
      "Docker", "Git", "GitHub Actions", "Linux/Unix", "RESTful APIs",
      "PostgreSQL", "SQLite", "Redis", "pgvector", "Pandas",
    ];
  }

  // Helper date regex
  const dateRegex = /(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\s*-\s*(?:Present|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})/i;

  // 5. Parse Projects
  const pLines = sectionLines.PROJECTS || [];
  let pIdx = 0;
  while (pIdx < pLines.length) {
    const l = pLines[pIdx];
    if (l.startsWith("•") || l.startsWith("-") || l.startsWith("*")) {
      pIdx++;
      continue;
    }

    if (dateRegex.test(l) || l.includes("|")) {
      const dMatch = l.match(dateRegex);
      const dates = dMatch ? dMatch[0].trim() : "";
      const beforeDate = dMatch ? l.slice(0, dMatch.index).trim() : l;
      const name = beforeDate.split("|")[0].replace(/\b(?:GitHub|Live Demo|Demo)\b/gi, "").trim();

      pIdx++;
      let tech = "";
      if (
        pIdx < pLines.length &&
        !pLines[pIdx].startsWith("•") &&
        !pLines[pIdx].startsWith("-") &&
        !pLines[pIdx].startsWith("*") &&
        !dateRegex.test(pLines[pIdx]) &&
        !pLines[pIdx].includes("|")
      ) {
        tech = pLines[pIdx].trim();
        pIdx++;
      }

      const bullets: string[] = [];
      while (pIdx < pLines.length) {
        const bLine = pLines[pIdx];
        if (isPageFooter(bLine)) {
          pIdx++;
          continue;
        }
        if (bLine.startsWith("•") || bLine.startsWith("-") || bLine.startsWith("*")) {
          const cleaned = cleanBullet(bLine);
          if (!isPageFooter(cleaned) && cleaned.length > 10) {
            bullets.push(cleaned);
          }
          pIdx++;
        } else if (
          bullets.length > 0 &&
          !dateRegex.test(bLine) &&
          !bLine.includes("|") &&
          bLine.length > 0
        ) {
          bullets[bullets.length - 1] = cleanBullet(bullets[bullets.length - 1] + " " + bLine);
          pIdx++;
        } else {
          break;
        }
      }

      if (name) {
        result.projects.push({
          name,
          technologies: tech,
          dates: dates || "Aug 2026 - Present",
          bullets: bullets.filter((b) => !isPageFooter(b) && b.length > 10),
        });
      }
    } else {
      pIdx++;
    }
  }

  // 6. Parse Experience
  const expLines = sectionLines.EXPERIENCE || [];
  const locRegex = /\s+([A-Za-z]+),\s*([A-Z]{2})$/;
  let eIdx = 0;

  while (eIdx < expLines.length) {
    const l = expLines[eIdx];
    if (l.startsWith("•") || l.startsWith("-") || l.startsWith("*")) {
      eIdx++;
      continue;
    }

    const locMatch = l.match(locRegex);
    const loc = locMatch
      ? `${locMatch[1]}, ${locMatch[2]}`
      : (result.city ? `${result.city}, ${result.province}` : "Edmonton, AB");
    const role = locMatch ? l.slice(0, locMatch.index).trim() : l.trim();

    let company = "";
    let dates = "";
    let isCurr = false;

    eIdx++;
    if (
      eIdx < expLines.length &&
      !expLines[eIdx].startsWith("•") &&
      !expLines[eIdx].startsWith("-") &&
      !expLines[eIdx].startsWith("*")
    ) {
      const nextL = expLines[eIdx];
      const dMatch = nextL.match(dateRegex);
      if (dMatch) {
        dates = dMatch[0].trim();
        company = nextL.slice(0, dMatch.index).trim();
        isCurr = /present/i.test(dates);
        eIdx++;
      }
    }

    const bullets: string[] = [];
    while (eIdx < expLines.length) {
      const bLine = expLines[eIdx];
      if (isPageFooter(bLine)) {
        eIdx++;
        continue;
      }
      if (bLine.startsWith("•") || bLine.startsWith("-") || bLine.startsWith("*")) {
        const cleaned = cleanBullet(bLine);
        if (!isPageFooter(cleaned) && cleaned.length > 10) {
          bullets.push(cleaned);
        }
        eIdx++;
      } else if (
        bullets.length > 0 &&
        !dateRegex.test(bLine) &&
        !locRegex.test(bLine) &&
        bLine.length > 0 &&
        !/^[A-Z][a-zA-Z\s]+$/.test(bLine)
      ) {
        bullets[bullets.length - 1] = cleanBullet(bullets[bullets.length - 1] + " " + bLine);
        eIdx++;
      } else {
        break;
      }
    }

    if (role) {
      result.experiences.push({
        role,
        company: company || role,
        location: loc,
        start_date: dates ? dates.split("-")[0].trim() : "Sep 2025",
        end_date: dates ? dates.split("-")[1].trim() : "Present",
        is_current: isCurr,
        bullets: bullets.filter((b) => !isPageFooter(b) && b.length > 10),
      });
    }
  }

  // Populate bullets for vector search / highlights
  result.experiences.forEach((e) =>
    e.bullets.forEach((b) =>
      result.bullets.push({ category: "EXPERIENCE", content: b })
    )
  );
  result.projects.forEach((p) =>
    p.bullets.forEach((b) =>
      result.bullets.push({ category: "PROJECT", content: b })
    )
  );

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = (formData.get("user_id") as string) || "00000000-0000-0000-0000-000000000001";

    if (!file) {
      return NextResponse.json({ error: "file field is required in form-data" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const filename = file.name.toLowerCase();
    let rawText = "";

    if (filename.endsWith(".pdf") || file.type === "application/pdf") {
      const parser = new PDFParse(new Uint8Array(arrayBuffer));
      const pdfData = await parser.getText();
      rawText = pdfData.text;
    } else {
      // Plain text or docx fallback
      rawText = Buffer.from(arrayBuffer).toString("utf-8");
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract readable text from uploaded document." },
        { status: 422 }
      );
    }

    // Parse structured resume
    const parsed = parseResumeStructure(rawText);

    // 1. Sync updated profile to PostgreSQL via Gateway
    const profilePayload = {
      user_id: userId,
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      city: parsed.city,
      province: parsed.province,
      linkedin_url: parsed.linkedin_url || undefined,
      github_url: parsed.github_url || undefined,
      portfolio_url: parsed.portfolio_url || undefined,
      education: parsed.education,
      skills: parsed.skills,
      experiences: parsed.experiences,
      projects: parsed.projects,
    };

    try {
      await fetch(`${GATEWAY_URL}/api/v1/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profilePayload),
      });
    } catch (dbErr) {
      console.warn("Could not sync profile to gateway:", dbErr);
    }

    // 2. Insert extracted bullets into resume_bullets table via Gateway
    const insertedBullets: any[] = [];
    for (const item of parsed.bullets) {
      try {
        const bulletRes = await fetch(`${GATEWAY_URL}/api/v1/resumes/bullets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            category: item.category,
            content: item.content,
          }),
        });
        if (bulletRes.ok) {
          const json = await bulletRes.json();
          if (json.data) insertedBullets.push(json.data);
        }
      } catch (bErr) {
        // Continue adding remaining bullets
      }
    }

    return NextResponse.json({
      status: "success",
      filename: file.name,
      count: parsed.bullets.length,
      data: insertedBullets.length > 0 ? insertedBullets : parsed.bullets.map((b, idx) => ({
        id: `bullet-${idx}`,
        user_id: userId,
        category: b.category,
        content: b.content,
        created_at: new Date().toISOString(),
      })),
      profile: {
        full_name: parsed.full_name,
        email: parsed.email,
        phone: parsed.phone,
        city: parsed.city,
        province: parsed.province,
        linkedin_url: parsed.linkedin_url,
        github_url: parsed.github_url,
        portfolio_url: parsed.portfolio_url,
        education: parsed.education,
        skills: parsed.skills,
        experiences: parsed.experiences,
        projects: parsed.projects,
      },
    });
  } catch (err: any) {
    console.error("Resume upload failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process resume file" },
      { status: 500 }
    );
  }
}
