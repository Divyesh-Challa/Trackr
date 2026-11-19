"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { getAiStatus } from "@/app/actions/ai";
import { scoutSearch } from "@/app/actions/assistant";
import { AiFreeTierNotice } from "@/components/AiFreeTierNotice";

const EXAMPLES = ["Remote backend co-ops for summer", "Hardware internships in Ottawa posted this week", "New grad data roles at big tech"];

/** Scout on the job board: describe the roles you want and it sets the Discover filters for you. */
export function ScoutBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, start] = useTransition();
  const { data: status, refetch } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  // Hidden until AI is switched on for this deployment and the user may use it.
  if (!status?.enabled || !status.allowed) return null;
  const left = status.remaining.assistant;

  const run = (request: string) => {
    if (busy || !request.trim()) return;
    setText(request);
    start(async () => {
      const r = await scoutSearch(request).catch(() => ({ ok: false as const, error: "Couldn't reach Scout. Try again." }));
      refetch();
      if (!r.ok) return setNote({ text: r.error, error: true });
      setNote({ text: r.data.summary || "Filters set." });
      router.push(r.data.query ? `/discover?${r.data.query}` : "/discover", { scroll: false });
    });
  };

  return (
    <section aria-labelledby="scout-heading" className="space-y-2 border-t border-slate-200 pt-4">
      <h2 id="scout-heading" className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <Sparkles className="h-4 w-4 text-accent" aria-hidden /> Scout
        <span className="font-normal text-slate-600">· say what you want, Scout sets the filters</span>
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <label htmlFor="scout-input" className="sr-only">Describe the roles you want</label>
        <input
          id="scout-input"
          value={text}
          maxLength={300}
          onChange={(e) => setText(e.target.value)}
          disabled={left === 0}
          placeholder={left === 0 ? "You've used this month's Scout requests" : "e.g. Paid ML internships in Toronto or remote for fall"}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-surface px-3 py-2.5 text-sm text-slate-900 focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={busy || !text.trim() || left === 0} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-50 sm:flex-none">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />} Find roles
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("scout:open", { detail: text.trim() }))}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-100"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Chat
          </button>
        </div>
      </form>
      <div aria-live="polite" className="text-[13px]">
        {note ? (
          <p className={note.error ? "text-red-700" : "text-slate-600"} role={note.error ? "alert" : undefined}>
            {note.text}
          </p>
        ) : (
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600">
            Try:
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => run(ex)} className="text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-accent">
                {ex}
              </button>
            ))}
          </p>
        )}
      </div>
      {status.freeTier && <AiFreeTierNotice />}
    </section>
  );
}
