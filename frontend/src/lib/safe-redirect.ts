// Only allow same-origin relative paths, so ?next= can't send users off-site.
export function safeNextPath(next: string | null | undefined, fallback = "/board"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
