import "server-only";

// Reads a public ATS API (Greenhouse, Lever, Ashby) with a timeout and a size cap. Callers
// build the URL from a slug and id that parseJobUrl validated, never from user input directly.
const TIMEOUT_MS = 8000;
const MAX_BYTES = 3_000_000;

export async function getAtsJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "TrackrJobsBot/1.0" },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("That posting no longer exists.");
  if (!res.ok) throw new Error(`The job board returned ${res.status}.`);
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("The job board response was too large.");
  return JSON.parse(text);
}

