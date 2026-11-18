"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CITIES, ROLES } from "@/lib/collections";

const linkClass = "text-slate-800 hover:text-accent";

// Screens people work in get one quiet line instead of the full site footer.
const APP_ROUTES = ["/board", "/profile", "/resume"];

export default function SiteFooter() {
  const pathname = usePathname();
  if (APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return (
      <footer className="mx-auto mt-12 flex w-full max-w-[1720px] flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-sm text-slate-600 sm:px-6">
        <span>© {new Date().getFullYear()} Trackr</span>
        <Link href="/feedback" className={linkClass}>Feedback</Link>
        <Link href="/privacy" className={linkClass}>Privacy</Link>
        <Link href="/terms" className={linkClass}>Terms</Link>
      </footer>
    );
  }
  return (
    <footer className="mt-24 overflow-hidden bg-surface">
      <div className="mx-auto max-w-[1720px] px-4 pt-14 text-sm text-slate-600 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <p className="max-w-[32ch] font-serif text-xl leading-snug text-slate-900">
            Every Canadian tech internship and co-op, with a tracker for each application.
          </p>
          <nav aria-label="Jobs by city" className="space-y-2">
            <h2 className="text-slate-600">By city</h2>
            {CITIES.map((c) => (
              <Link key={c.slug} href={`/internships/${c.slug}`} className={`block ${linkClass}`}>{c.name}</Link>
            ))}
          </nav>
          <nav aria-label="Jobs by role" className="space-y-2">
            <h2 className="text-slate-600">By role</h2>
            {ROLES.map((r) => (
              <Link key={r.slug} href={`/roles/${r.slug}`} className={`block ${linkClass}`}>{r.name}</Link>
            ))}
          </nav>
          <nav aria-label="Trackr" className="space-y-2">
            <h2 className="text-slate-600">Trackr</h2>
            <Link href="/discover" className={`block ${linkClass}`}>All jobs</Link>
            <Link href="/guide" className={`block ${linkClass}`}>Internship guide</Link>
            <Link href="/pricing" className={`block ${linkClass}`}>Pricing</Link>
            <Link href="/feedback" className={`block ${linkClass}`}>Feedback</Link>
            <a href="mailto:divyeshchallavgr@gmail.com" className={`block ${linkClass}`}>Contact</a>
          </nav>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <p>Listings link to the original postings.</p>
          <nav aria-label="Legal" className="flex gap-6 sm:justify-center">
            <Link href="/privacy" className={linkClass}>Privacy</Link>
            <Link href="/terms" className={linkClass}>Terms</Link>
          </nav>
          <p className="sm:text-right">© {new Date().getFullYear()} Trackr</p>
        </div>
        {/* The name closes the page at full width. */}
        <p
          aria-hidden
          className="wordmark-settle mt-6 select-none pb-[0.04em] font-serif text-[22vw] font-semibold leading-[0.85] tracking-[-0.045em] text-slate-900 sm:text-[19vw] 2xl:text-[320px]"
        >
          trackr
        </p>
      </div>
    </footer>
  );
}
