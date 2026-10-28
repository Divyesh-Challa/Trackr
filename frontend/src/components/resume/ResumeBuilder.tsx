"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Download, ExternalLink, FileText, Loader2, Printer, Wand2, X } from "lucide-react";
import { TAILORING_KEY, buildResume, toLatex, toPlainText, type StoredTailoring } from "@/lib/resume";
import { useResume, type ResumeData } from "@/lib/resume-hooks";
import { useToast } from "../ui/Toast";
import ResumeEditor, { type Drafts } from "./ResumeEditor";
import ResumePreview from "./ResumePreview";

const PAGE_PX = { width: 816, height: 1056 }; // US Letter at 96 CSS px per inch

function applyDrafts(data: ResumeData, d: Drafts): ResumeData {
  const contact = { ...data.contact, ...d.contact };
  if (d.contact.full_name !== undefined) contact.name = d.contact.full_name ?? "";
  return {
    contact,
    entries: data.entries.map((e) => (d.entries[e.id] ? { ...e, ...d.entries[e.id] } : e)),
    bullets: data.bullets.map((b) => (d.bullets[b.id] ? { ...b, ...d.bullets[b.id] } : b)),
  };
}

function readTailoring(): StoredTailoring | null {
  try {
    if (!new URLSearchParams(window.location.search).has("tailored")) return null;
    const raw = sessionStorage.getItem(TAILORING_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredTailoring) : null;
    return parsed && Array.isArray(parsed.bullets) ? parsed : null;
  } catch {
    return null;
  }
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "resume";
}

/** Scales the true-size sheet to fit its column, and reports when it runs past one page. */
function useSheetFit() {
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(PAGE_PX.height);

  useLayoutEffect(() => {
    if (!frame.current || !sheet.current) return;
    const ro = new ResizeObserver(() => {
      setScale(Math.min(1, frame.current!.clientWidth / PAGE_PX.width));
      setHeight(sheet.current!.offsetHeight);
    });
    ro.observe(frame.current);
    ro.observe(sheet.current);
    return () => ro.disconnect();
  }, []);

  return { frame, sheet, scale, overflows: height > PAGE_PX.height + 1, height };
}

function ActionButton({ onClick, icon: Icon, children, primary }: { onClick: () => void; icon: typeof Copy; children: React.ReactNode; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
        primary ? "bg-[#0066FF] text-white shadow-sm hover:bg-[#0052cc]" : "border border-slate-300 bg-surface text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}

export default function ResumeBuilder() {
  const { data, isLoading, isError, error } = useResume();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Drafts>({ contact: {}, entries: {}, bullets: {} });
  const [tailoring, setTailoring] = useState<StoredTailoring | null>(null);
  const [useTailored, setUseTailored] = useState(true);
  const [copied, setCopied] = useState<"latex" | "text" | null>(null);
  const overleaf = useRef<HTMLFormElement>(null);
  const { frame, sheet, scale, overflows, height } = useSheetFit();

  useEffect(() => setTailoring(readTailoring()), []);

  const draft = useMemo(
    () => ({
      contact: (patch: Drafts["contact"]) => setDrafts((d) => ({ ...d, contact: { ...d.contact, ...patch } })),
      entry: (id: string, patch: Drafts["entries"][string]) =>
        setDrafts((d) => ({ ...d, entries: { ...d.entries, [id]: { ...d.entries[id], ...patch } } })),
      bullet: (id: string, patch: Drafts["bullets"][string]) =>
        setDrafts((d) => ({ ...d, bullets: { ...d.bullets, [id]: { ...d.bullets[id], ...patch } } })),
    }),
    []
  );

  const model = useMemo(() => {
    if (!data) return null;
    const live = applyDrafts(data, drafts);
    return buildResume(live.contact, live.entries, live.bullets, tailoring && useTailored ? tailoring : undefined);
  }, [data, drafts, tailoring, useTailored]);

  const copy = useCallback(
    async (kind: "latex" | "text") => {
      if (!model) return;
      try {
        await navigator.clipboard.writeText(kind === "latex" ? toLatex(model) : toPlainText(model));
        setCopied(kind);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        toast("Your browser blocked the clipboard. Use Download .tex instead.", "error");
      }
    },
    [model, toast]
  );

  const download = () => {
    if (!model) return;
    const url = URL.createObjectURL(new Blob([toLatex(model)], { type: "application/x-tex" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${slug(model.contact.name)}-resume.tex` });
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isError) {
    return <p role="alert" className="mx-auto mt-10 max-w-xl text-sm text-red-700">Couldn&apos;t load your resume: {(error as Error).message}</p>;
  }

  const tailoredOn = Boolean(tailoring && useTailored);
  const isEmpty = model && !model.education.length && !model.experience.length && !model.projects.length && !model.skills.length;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div data-print-hidden="true" className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">Resume</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Built on Jake&apos;s Resume, the one-page LaTeX template recruiters know. Changes save as you go. The AI tools only work from what you write here.
          </p>
        </div>
        {model && (
          <div className="flex flex-wrap gap-2">
            <ActionButton primary icon={Printer} onClick={() => window.print()}>Save as PDF</ActionButton>
            <ActionButton icon={Download} onClick={download}>Download .tex</ActionButton>
            <ActionButton icon={copied === "latex" ? Check : Copy} onClick={() => copy("latex")}>{copied === "latex" ? "Copied" : "Copy LaTeX"}</ActionButton>
            <ActionButton icon={copied === "text" ? Check : FileText} onClick={() => copy("text")}>{copied === "text" ? "Copied" : "Copy as text"}</ActionButton>
            <ActionButton icon={ExternalLink} onClick={() => overleaf.current?.submit()}>Open in Overleaf</ActionButton>
            {/* Overleaf's documented "open a snippet" endpoint; only sent when the user clicks. */}
            <form ref={overleaf} action="https://www.overleaf.com/docs" method="post" target="_blank" className="hidden">
              <input type="hidden" name="snip_name" value={`${slug(model.contact.name)}-resume.tex`} readOnly />
              <input type="hidden" name="encoded_snip" value={encodeURIComponent(toLatex(model))} readOnly />
            </form>
          </div>
        )}
      </div>

      {tailoring && (
        <div data-print-hidden="true" role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          <span className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 shrink-0" aria-hidden />
            {tailoredOn ? (
              <span>
                Tailored for <strong>{tailoring.label}</strong>: {tailoring.bullets.length} chosen bullets, best first. Edits below change your saved resume, not this version.
              </span>
            ) : (
              <span>Showing your full resume. A tailored version for <strong>{tailoring.label}</strong> is ready.</span>
            )}
          </span>
          <span className="flex gap-2">
            <button type="button" onClick={() => setUseTailored((v) => !v)} className="rounded-lg bg-surface px-3 py-1.5 text-[13px] font-medium text-blue-800 shadow-sm hover:bg-blue-100">
              {tailoredOn ? "Show full resume" : "Show tailored"}
            </button>
            <button
              type="button"
              aria-label="Discard tailored version"
              onClick={() => {
                try { sessionStorage.removeItem(TAILORING_KEY); } catch {}
                setTailoring(null);
                window.history.replaceState(null, "", "/resume");
              }}
              className="rounded-lg p-1.5 text-blue-800 hover:bg-blue-100"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div data-print-hidden="true" className="min-w-0">
          {isLoading || !data ? (
            <div className="flex justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading resume" /></div>
          ) : (
            <ResumeEditor data={data} draft={draft} />
          )}
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div data-print-hidden="true" className="mb-2 flex items-center justify-between text-[13px] text-slate-500">
            <span>Preview</span>
            {overflows ? (
              <span className="flex items-center gap-1 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Runs onto a second page. Trim a few bullets.
              </span>
            ) : (
              <span>One page</span>
            )}
          </div>
          <div
            ref={frame}
            data-print-frame="true"
            className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm"
            style={{ height: Math.max(height, PAGE_PX.height) * scale }}
          >
            <div ref={sheet} style={{ width: PAGE_PX.width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {model && <ResumePreview model={model} />}
            </div>
          </div>
          {isEmpty && (
            <p data-print-hidden="true" className="mt-3 text-center text-sm text-slate-500">Add your education, experience and projects to see them here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
