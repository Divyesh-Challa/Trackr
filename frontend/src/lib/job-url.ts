// Recognizes postings on the ATS platforms whose public APIs we can read. Mirrors
// ingest/normalize.py canonical_key so a pasted link matches a row in the jobs feed.

export type AtsRef =
  | { ats: "greenhouse"; slug: string | null; id: string; canonical: string }
  | { ats: "lever"; slug: string; id: string; canonical: string }
  | { ats: "ashby"; slug: string; id: string; canonical: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const SLUG = /^[a-z0-9][a-z0-9._-]{0,80}$/i;

export function parseJobUrl(raw: string): AtsRef | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const segs = url.pathname.split("/").filter(Boolean);

  const ghJid = url.searchParams.get("gh_jid");
  if (ghJid && /^\d{4,20}$/.test(ghJid)) {
    const slug = host.endsWith("greenhouse.io") ? (url.searchParams.get("for") ?? segs[0] ?? null) : null;
    return { ats: "greenhouse", slug: slug && SLUG.test(slug) ? slug.toLowerCase() : null, id: ghJid, canonical: `greenhouse:${ghJid}` };
  }
  if (host.endsWith("greenhouse.io")) {
    const m = url.pathname.match(/\/jobs\/(\d{4,20})/);
    const slug = segs[0];
    if (m && slug && SLUG.test(slug)) {
      return { ats: "greenhouse", slug: slug.toLowerCase(), id: m[1], canonical: `greenhouse:${m[1]}` };
    }
  }
  if (host === "jobs.lever.co") {
    const m = url.pathname.match(new RegExp(`^/([^/]+)/(${UUID})`, "i"));
    if (m && SLUG.test(m[1])) {
      const id = m[2].toLowerCase();
      return { ats: "lever", slug: m[1].toLowerCase(), id, canonical: `lever:${id}` };
    }
  }
  if (host === "jobs.ashbyhq.com") {
    const m = url.pathname.match(new RegExp(`^/([^/]+)/(${UUID})`, "i"));
    if (m && SLUG.test(decodeURIComponent(m[1]))) {
      const id = m[2].toLowerCase();
      return { ats: "ashby", slug: decodeURIComponent(m[1]), id, canonical: `ashby:${id}` };
    }
  }
  return null;
}
