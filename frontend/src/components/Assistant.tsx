"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getAiStatus } from "@/app/actions/ai";
import { askAssistant, type ChatMessage } from "@/app/actions/assistant";
import { CompanyLogo } from "@/components/CompanyLogo";
import { AiFreeTierNotice } from "@/components/AiFreeTierNotice";
import type { DiscoveredJob } from "@/types";

type Turn = ChatMessage & { jobs?: DiscoveredJob[]; error?: boolean };

const STARTERS = ["Which open roles fit my skills best?", "What should I follow up on this week?", "Any new grad roles posted recently?"];

/** Floating chat for signed-in users: finds roles in the feed and answers questions about their applications. */
export function Assistant() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  const { data: status, refetch } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus(), enabled: signedIn });

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  // Hidden until AI is switched on for this deployment and the user may use it.
  if (!signedIn || !status?.enabled || !status.allowed) return null;

  const send = (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Turn[] = [...turns.filter((t) => !t.error), { role: "user", text: q }];
    setTurns((t) => [...t, { role: "user", text: q }]);
    setDraft("");
    start(async () => {
      const r = await askAssistant(history.map(({ role, text }) => ({ role, text }))).catch(() => ({
        ok: false as const,
        error: "Couldn't reach the assistant. Try again.",
      }));
      setTurns((t) => [...t, r.ok ? { role: "assistant", text: r.data.text, jobs: r.data.jobs } : { role: "assistant", text: r.error, error: true }]);
      refetch();
    });
  };

  const left = status.remaining.assistant;

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open the Trackr assistant"
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[#0066FF] px-4 py-3 text-sm font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,102,255,0.7)] transition hover:-translate-y-0.5 hover:bg-[#0052cc]"
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> Ask Trackr
        </button>
      )}
      {open && (
        <section
          role="dialog"
          aria-label="Trackr assistant"
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[min(640px,calc(100vh-1.5rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-2xl sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[400px]"
        >
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="font-semibold text-slate-900">Ask Trackr</h2>
              <p className="text-xs text-slate-500">Finds roles and keeps you on top of your applications</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {!turns.length && (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">Ask about open roles, your applications or your next step. Try:</p>
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)} className="block w-full rounded-xl border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50/50">
                    {s}
                  </button>
                ))}
                {status.freeTier && <AiFreeTierNotice />}
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={t.role === "user" ? "flex justify-end" : "space-y-2"}>
                <p
                  className={
                    t.role === "user"
                      ? "max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-md bg-[#0066FF] px-3 py-2 text-sm text-white"
                      : `whitespace-pre-line text-sm ${t.error ? "text-red-700" : "text-slate-800"}`
                  }
                  role={t.error ? "alert" : undefined}
                >
                  {t.text}
                </p>
                {t.jobs?.map((job) => (
                  <Link key={job.id} href={`/discover/${job.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 transition hover:border-blue-300">
                    <CompanyLogo name={job.company_name} domain={job.company_domain} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{job.role_title}</p>
                      <p className="truncate text-xs text-slate-500">{job.company_name} · {job.locations[0] ?? "Canada"}</p>
                    </div>
                    {job.match_percent != null && <span className="text-xs font-semibold text-emerald-700">{job.match_percent}%</span>}
                  </Link>
                ))}
              </div>
            ))}
            {busy && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Looking through the feed…
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className="border-t border-slate-100 p-3"
          >
            <div className="flex items-end gap-2">
              <label htmlFor="assistant-input" className="sr-only">Message</label>
              <textarea
                id="assistant-input"
                ref={inputRef}
                rows={1}
                value={draft}
                maxLength={1500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
                placeholder={left === 0 ? "You've used this month's messages" : "Ask anything about your search"}
                disabled={left === 0}
                className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button type="submit" disabled={busy || !draft.trim() || left === 0} aria-label="Send" className="rounded-xl bg-[#0066FF] p-2.5 text-white transition hover:bg-[#0052cc] disabled:opacity-50">
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">{left} messages left this month · Answers can be wrong, so check the posting</p>
          </form>
        </section>
      )}
    </>
  );
}
