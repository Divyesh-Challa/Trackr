"use client";

export default function DiscoverError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-12 max-w-lg rounded-2xl border border-red-200 bg-surface p-6 text-sm">
      <p className="font-medium text-red-700">Couldn&apos;t load the jobs feed.</p>
      <p className="mt-1 text-slate-600">{error.message}</p>
      <button onClick={reset} className="mt-4 rounded-xl bg-[#0066FF] px-4 py-2 text-white hover:bg-[#0052cc]">
        Try again
      </button>
    </div>
  );
}
