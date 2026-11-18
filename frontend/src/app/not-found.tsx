import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-24 text-center">
      <p className="text-sm font-semibold text-[#0066FF]">404</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900">This page isn&apos;t here</h1>
      <p className="mt-3 text-sm text-slate-600">The link may be old, or the job was taken down by the employer.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/discover" className="rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc]">
          Browse jobs
        </Link>
        <Link href="/" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Home
        </Link>
      </div>
    </div>
  );
}
