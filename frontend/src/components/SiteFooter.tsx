import Link from "next/link";
import { CITIES, ROLES } from "@/lib/collections";

const linkClass = "hover:text-slate-900";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-surface/60">
      <div className="mx-auto max-w-[1720px] px-4 py-8 text-[13px] text-slate-500 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <nav aria-label="Jobs by city" className="space-y-1.5">
            <p className="font-semibold text-slate-700">By city</p>
            {CITIES.map((c) => (
              <Link key={c.slug} href={`/internships/${c.slug}`} className={`block ${linkClass}`}>{c.name}</Link>
            ))}
          </nav>
          <nav aria-label="Jobs by role" className="space-y-1.5">
            <p className="font-semibold text-slate-700">By role</p>
            {ROLES.map((r) => (
              <Link key={r.slug} href={`/roles/${r.slug}`} className={`block ${linkClass}`}>{r.name}</Link>
            ))}
          </nav>
          <nav aria-label="Trackr" className="space-y-1.5">
            <p className="font-semibold text-slate-700">Trackr</p>
            <Link href="/discover" className={`block ${linkClass}`}>All jobs</Link>
            <Link href="/guide" className={`block ${linkClass}`}>Internship guide</Link>
            <Link href="/pricing" className={`block ${linkClass}`}>Pricing</Link>
            <Link href="/feedback" className={`block ${linkClass}`}>Feedback</Link>
            <a href="mailto:divyeshchallavgr@gmail.com" className={`block ${linkClass}`}>Contact</a>
          </nav>
        </div>
        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Trackr. Listings link to the original postings.</p>
          <nav aria-label="Legal" className="flex gap-4">
            <Link href="/privacy" className={linkClass}>Privacy</Link>
            <Link href="/terms" className={linkClass}>Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
