// Server-side checks that AI output only uses the user's own material. The model is told
// the same rules; these make them hold even when it slips.

export type SourceBullet = { id: string; heading: string; content: string };

/** Numbers as written (12, 1.5, 40%, 3k), normalised for comparison. */
export function numbersIn(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?\s*(?:%|k\b|m\b|x\b)?/gi)) {
    out.add(m[0].replace(/[,\s]/g, "").toLowerCase());
  }
  return out;
}

/** Numbers in `text` that appear nowhere in `sources`: a sign of an invented metric. */
export function inventedNumbers(text: string, sources: string[]): string[] {
  // Compare bare values, so "40 percent" matches "40%" and "3k" matches "3k".
  const bare = (n: string) => n.replace(/[%kmx]$/, "");
  const allowed = new Set<string>();
  for (const s of sources) for (const n of numbersIn(s)) allowed.add(bare(n));
  return [...numbersIn(text)].filter((n) => !allowed.has(bare(n)));
}

export type Rewrite = { bullet_id: string; text: string; why: string };
export type CheckedRewrite = Rewrite & { source: SourceBullet; reverted: boolean };

/**
 * Keeps rewrites that cite one of the user's bullets (each at most once). A rewrite that
 * adds a number its source didn't have falls back to the user's original wording.
 */
export function checkRewrites(rewrites: Rewrite[], bullets: SourceBullet[]): CheckedRewrite[] {
  const byId = new Map(bullets.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const out: CheckedRewrite[] = [];
  for (const r of rewrites) {
    const source = byId.get(r.bullet_id);
    if (!source || seen.has(r.bullet_id)) continue;
    seen.add(r.bullet_id);
    const invented = inventedNumbers(r.text, [source.content, source.heading]);
    out.push(
      invented.length
        ? { ...r, text: source.content, source, reverted: true }
        : { ...r, text: r.text.trim(), source, reverted: false }
    );
  }
  return out;
}

export type Paragraph = { text: string; bullet_ids: string[] };
export type CheckedParagraph = { text: string; sources: SourceBullet[]; flagged: string[] };

/**
 * Cover-letter paragraphs: citations must be the user's bullets, and any number must come
 * from a cited bullet or the job description. Unsupported numbers are flagged for the user.
 */
export function checkParagraphs(paragraphs: Paragraph[], bullets: SourceBullet[], jobText: string): CheckedParagraph[] {
  const byId = new Map(bullets.map((b) => [b.id, b]));
  return paragraphs.map((p) => {
    const sources = [...new Set(p.bullet_ids)].map((id) => byId.get(id)).filter((b): b is SourceBullet => Boolean(b));
    const flagged = inventedNumbers(p.text, [jobText, ...sources.map((s) => `${s.heading} ${s.content}`)]);
    return { text: p.text.trim(), sources, flagged };
  });
}
