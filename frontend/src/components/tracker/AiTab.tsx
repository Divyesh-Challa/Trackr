"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Copy, Loader2, Sparkles } from "lucide-react";
import {
  getAiStatus,
  interviewFeedback,
  interviewQuestion,
  tailorResume,
  writeCoverLetter,
  type InterviewFeedback,
  type LetterResult,
  type TailorResult,
} from "@/app/actions/ai";
import { useToast } from "../ui/Toast";

type Tool = "tailor" | "letter" | "interview";

const btn =
  "inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60";

function Busy({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
      {children}
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => navigator.clipboard.writeText(text).then(() => toast("Copied"))}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-slate-600 hover:bg-slate-100"
    >
      <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
    </button>
  );
}

export default function AiTab({ appId }: { appId: string }) {
  const { data: status, refetch } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });
  const [tool, setTool] = useState<Tool>("tailor");
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tailor, setTailor] = useState<TailorResult | null>(null);
  const [letter, setLetter] = useState<LetterResult | null>(null);
  const [notes, setNotes] = useState("");
  const [question, setQuestion] = useState<{ question: string; competency: string } | null>(null);
  const [asked, setAsked] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);

  if (!status) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!status.enabled) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">AI tools are coming soon.</p>;
  }
  if (!status.pro) {
    return (
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">AI tools are part of Pro.</p>
        <p className="mt-1">Tailor your resume to this posting, draft a cover letter from your own experience, and practise interview answers with feedback.</p>
        <Link href="/pricing" className="mt-3 inline-block font-medium text-[#0066FF] underline">See Pro</Link>
      </div>
    );
  }

  const run = <T,>(fn: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, onData: (d: T) => void) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) onData(r.data);
      else setError(r.error);
      refetch();
    });

  const tabs: { id: Tool; label: string; left: number }[] = [
    { id: "tailor", label: "Tailor resume", left: status.remaining.tailor },
    { id: "letter", label: "Cover letter", left: status.remaining.cover_letter },
    { id: "interview", label: "Interview practice", left: status.remaining.interview_feedback },
  ];

  return (
    <div className="space-y-4">
      {status.bulletCount === 0 && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Add your experience bullets on your <Link href="/profile" className="underline">Profile</Link> first. The AI only works from what you&apos;ve written.
        </p>
      )}
      <div role="tablist" aria-label="AI tools" className="flex flex-wrap gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tool === t.id}
            onClick={() => {
              setTool(t.id);
              setError(null);
            }}
            className={`rounded-xl border px-3 py-1.5 text-[13px] font-medium ${tool === t.id ? "border-[#0066FF] bg-blue-50 text-[#0066FF]" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
          >
            {t.label} <span className="text-slate-500">· {t.left} left</span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {tool === "tailor" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Picks and rewrites your most relevant bullets for this posting. Each one links back to what you wrote.</p>
          <button type="button" disabled={busy} onClick={() => run(() => tailorResume(appId), setTailor)} className={btn}>
            <Busy busy={busy}>{tailor ? "Tailor again" : "Tailor my resume"}</Busy>
          </button>
          {tailor && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <CopyButton text={tailor.bullets.map((b) => `• ${b.text}`).join("\n")} />
              </div>
              <ol className="space-y-3">
                {tailor.bullets.map((b) => (
                  <li key={b.bullet_id} className="rounded-xl border border-slate-200 p-3">
                    <p className="text-sm font-medium text-slate-900">{b.text}</p>
                    <p className="mt-1 text-[13px] text-slate-600">{b.why}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      From your bullet{b.source.heading ? ` (${b.source.heading})` : ""}: “{b.source.content}”
                      {b.reverted && <span className="ml-1 text-amber-700">Kept your wording; the rewrite added a number you hadn&apos;t written.</span>}
                    </p>
                  </li>
                ))}
              </ol>
              {tailor.matched_keywords.length > 0 && (
                <p className="text-sm text-slate-700"><span className="font-medium">You show:</span> {tailor.matched_keywords.join(", ")}</p>
              )}
              {tailor.gaps.length > 0 && (
                <div className="text-sm text-slate-700">
                  <p className="font-medium">Not covered by your bullets yet:</p>
                  <ul className="mt-1 list-disc pl-5">{tailor.gaps.map((g) => <li key={g}>{g}</li>)}</ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tool === "letter" && (
        <div className="space-y-4">
          <label htmlFor="letter-notes" className="block text-[13px] font-medium text-slate-700">Why this role? (optional, in your own words)</label>
          <textarea id="letter-notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm" />
          <button type="button" disabled={busy} onClick={() => run(() => writeCoverLetter(appId, notes), setLetter)} className={btn}>
            <Busy busy={busy}>{letter ? "Write another draft" : "Draft a cover letter"}</Busy>
          </button>
          {letter && (
            <div className="space-y-3">
              <div className="flex justify-end"><CopyButton text={letter.paragraphs.map((p) => p.text).join("\n\n")} /></div>
              {letter.paragraphs.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{p.text}</p>
                  {p.sources.length > 0 && (
                    <p className="mt-2 text-xs text-slate-500">Based on: {p.sources.map((s) => `“${s.content}”`).join(" · ")}</p>
                  )}
                  {p.flagged.length > 0 && (
                    <p className="mt-1 text-xs text-amber-700">Check before sending: {p.flagged.join(", ")} isn&apos;t in your bullets or the posting.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tool === "interview" && (
        <div className="space-y-4">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => interviewQuestion(appId, asked), (q) => {
                setQuestion(q);
                setAsked((a) => [...a, q.question]);
                setAnswer("");
                setFeedback(null);
              })
            }
            className={btn}
          >
            <Busy busy={busy}>{question ? "Next question" : "Ask me a question"}</Busy>
          </button>
          {question && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                run(() => interviewFeedback(appId, question.question, answer), setFeedback);
              }}
              className="space-y-3"
            >
              <p className="text-sm font-medium text-slate-900">{question.question}</p>
              <p className="text-xs text-slate-500">Tests: {question.competency}</p>
              <label htmlFor="answer" className="sr-only">Your answer</label>
              <textarea id="answer" rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer as you would out loud. Try Situation, Task, Action, Result." className="w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm" />
              <button type="submit" disabled={busy || answer.trim().length < 40} className={btn}>
                <Busy busy={busy}>Get feedback</Busy>
              </button>
            </form>
          )}
          {feedback && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">Overall {feedback.overall}/5</p>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {(["situation", "task", "action", "result"] as const).map((k) => (
                  <div key={k} className="rounded-lg bg-slate-50 p-2">
                    <dt className="text-xs capitalize text-slate-500">{k}</dt>
                    <dd className="text-lg font-semibold tabular-nums text-slate-900">{feedback.scores[k]}</dd>
                  </div>
                ))}
              </dl>
              <div className="text-sm text-slate-700">
                <p className="font-medium text-emerald-700">What worked</p>
                <ul className="list-disc pl-5">{feedback.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
                <p className="mt-2 font-medium text-amber-700">To improve</p>
                <ul className="list-disc pl-5">{feedback.improvements.map((s) => <li key={s}>{s}</li>)}</ul>
                <p className="mt-2 text-slate-600"><span className="font-medium">Likely follow-up:</span> {feedback.follow_up}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
