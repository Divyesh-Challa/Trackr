import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200/80 bg-white/60">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-3 px-4 py-6 text-[13px] text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} Trackr. Listings link to the original postings.</p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/discover" className="hover:text-slate-900">Jobs</Link>
          <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-900">Terms</Link>
          <a href="mailto:divyeshchallavgr@gmail.com" className="hover:text-slate-900">Contact</a>
        </nav>
      </div>
    </footer>
  );
}
