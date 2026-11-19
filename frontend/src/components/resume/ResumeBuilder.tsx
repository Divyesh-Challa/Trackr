"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Copy, Download, ExternalLink, FileText, Loader2, Printer, Wand2, X, type LucideIcon } from "lucide-react";
import { TAILORING_KEY, buildResume, toLatex, toPlainText, type ResumeModel, type StoredTailoring } from "@/lib/resume";
import { useResume, type ResumeData } from "@/lib/resume-hooks";
import { springs } from "@/lib/motion-tokens";
import { useToast } from "../ui/Toast";
import ResumeEditor, { REVEAL_EVENT, type Drafts } from "./ResumeEditor";
import ResumePreview from "./ResumePreview";
import SectionRail, { type RailItem } from "./SectionRail";

const PAGE_PX = { width: 816, height: 1056 }; // US Letter at 96 CSS px per inch
const SHEET_PADDING_PX = 48; // the sheet's 0.5in margin

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
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "my";
}

/**
 * Scales the true-size sheet to fit its column, and measures how much of a page the
 * content fills (the sheet itself never gets shorter than one page).
 */
function useSheetFit(model: ResumeModel | null) {
  const frame = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(PAGE_PX.height);
  const [used, setUsed] = useState(0);

  const measure = useCallback(() => {
    if (!frame.current || !sheet.current) return;
    setScale(Math.min(1, frame.current.clientWidth / PAGE_PX.width));
    setHeight(sheet.current.offsetHeight);
    const article = sheet.current.firstElementChild as HTMLElement | null;
    const last = article?.lastElementChild;
    if (!article || !last) return setUsed(0);
    const box = article.getBoundingClientRect();
    const ratio = box.height / article.offsetHeight || 1;
    setUsed((last.getBoundingClientRect().bottom - box.top) / ratio + SHEET_PADDING_PX);
  }, []);

  useLayoutEffect(() => {
    if (!frame.current || !sheet.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(frame.current);
    ro.observe(sheet.current);
    return () => ro.disconnect();
  }, [measure]);
  // Content shorter than a page doesn't resize the sheet, so measure on every change too.
  useLayoutEffect(measure, [model, measure]);

  return { frame, sheet, scale, height, fill: used / PAGE_PX.height, overflows: used > PAGE_PX.height + 1 };
}

type MenuItem = { label: string; icon: LucideIcon; run: () => void };

function ExportMenu({ items }: { items: MenuItem[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => list.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const buttons = [...(list.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = buttons.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      setOpen(false);
      root.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      buttons[(i + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    }
  };

  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        More export options
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={list}
            role="menu"
            aria-label="Export"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
            transition={springs.modal}
            className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-xl bg-surface p-1 shadow-lg"
          >
            {items.map((it) => (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  it.run();
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-700 outline-none hover:bg-slate-100 focus-visible:bg-slate-100"
              >
                <it.icon className="h-4 w-4 text-slate-500" aria-hidden />
                {it.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Reveals a tailoring's bullets one at a time (the result is already complete). */
function useReveal(total: number, active: boolean) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduce) return setShown(total);
    setShown(0);
    const t = setInterval(() => setShown((n) => (n >= total ? (clearInterval(t), n) : n + 1)), 220);
    return () => clearInterval(t);
  }, [total, active, reduce]);
  return active ? shown : total;
}

function TailoringPanel({ tailoring, on, shown, reworded, onToggle, onDiscard }: {
  tailoring: StoredTailoring; on: boolean; shown: number; reworded: number; onToggle: () => void; onDiscard: () => void;
}) {
  const total = tailoring.bullets.length;
  const done = shown >= total;
  const matched = tailoring.matched ?? [];
  const gaps = tailoring.gaps ?? [];
  const steps = [`Chose ${total} bullet${total === 1 ? "" : "s"}, best first`, `Reworded ${reworded} to fit the posting, from what you wrote`];
  if (matched.length + gaps.length) steps.push(`${matched.length} of ${matched.length + gaps.length} of the posting's requirements shown`);

  return (
    <div data-print-hidden="true" role="status" className="mb-5 rounded-2xl bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-slate-800">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
          </span>
          {on ? (
            <span>
              Tailored for <strong>{tailoring.label}</strong>. Edits change your saved resume, not this version.
            </span>
          ) : (
            <span>Showing your full resume. A tailored version for <strong>{tailoring.label}</strong> is ready.</span>
          )}
        </p>
        <span className="flex gap-1.5">
          <button type="button" onClick={onToggle} className="rounded-full bg-slate-100 px-3 py-1.5 text-[13px] font-medium text-slate-800 transition hover:bg-slate-200">
            {on ? "Show full resume" : "Show tailored"}
          </button>
          <button type="button" aria-label="Discard tailored version" onClick={onDiscard} className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </span>
      </div>
      {on && (
        <ol className="mt-3 space-y-1.5 pl-9 text-[13px]">
          {done ? (
            steps.map((s, i) => (
              <motion.li key={s} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ ...springs.list, delay: i * 0.08 }} className="flex items-center gap-2 text-slate-700">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                {s}
              </motion.li>
            ))
          ) : (
            <li className="flex items-center gap-2 text-slate-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" aria-hidden />
              Placing your chosen bullets, {shown} of {total}
            </li>
          )}
          {done && matched.length > 0 && (
            <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-1 pt-1">
              {matched.slice(0, 10).map((k) => (
                <span key={k} className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[12px] font-medium text-emerald-800">{k}</span>
              ))}
            </motion.li>
          )}
          {done && gaps.length > 0 && <li className="text-[12px] text-amber-700">Not on your resume: {gaps.join(", ")}</li>}
        </ol>
      )}
    </div>
  );
}

export default function ResumeBuilder() {
  const { data, isLoading, isError, error } = useResume();
  const toast = useToast();
  const [drafts, setDrafts] = useState<Drafts>({ contact: {}, entries: {}, bullets: {} });
  const [tailoring, setTailoring] = useState<StoredTailoring | null>(null);
  const [useTailored, setUseTailored] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const overleaf = useRef<HTMLFormElement>(null);

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

  const tailoredOn = Boolean(tailoring && useTailored);
  const shown = useReveal(tailoring?.bullets.length ?? 0, tailoredOn);

  const live = useMemo(() => (data ? applyDrafts(data, drafts) : null), [data, drafts]);
  const model = useMemo(() => {
    if (!live) return null;
    const t = tailoring && useTailored ? { bullets: tailoring.bullets.slice(0, shown) } : undefined;
    return buildResume(live.contact, live.entries, live.bullets, t);
  }, [live, tailoring, useTailored, shown]);
  // Exports always use the whole tailoring, even mid-reveal.
  const exportModel = useMemo(
    () => (live ? buildResume(live.contact, live.entries, live.bullets, tailoring && useTailored ? tailoring : undefined) : null),
    [live, tailoring, useTailored]
  );
  const { frame, sheet, scale, height, fill, overflows } = useSheetFit(model);

  const reworded = useMemo(() => {
    if (!tailoring || !data) return 0;
    const original = new Map(data.bullets.map((b) => [b.id, b.content.trim()]));
    return tailoring.bullets.filter((b) => original.has(b.bullet_id) && original.get(b.bullet_id) !== b.text.trim()).length;
  }, [tailoring, data]);

  const rail = useMemo<RailItem[]>(() => {
    if (!live) return [];
    const c = live.contact;
    const contactFilled = [c.name, c.email, c.phone, c.location, c.linkedin_url || c.github_url || c.website_url].filter(Boolean).length;
    const section = (id: string, label: string) => {
      const entries = live.entries.filter((e) => e.section === id);
      const withBullets = entries.filter((e) => live.bullets.some((b) => b.entry_id === e.id)).length;
      // Schools rarely have bullets, so one is enough to fill Education's ring.
      const progress = !entries.length ? 0 : id === "education" ? 1 : withBullets / entries.length;
      return { anchor: `rs-${id}`, label, count: entries.length, progress };
    };
    const skills = live.bullets.filter((b) => b.section === "skills" && !b.entry_id).length;
    return [
      { anchor: "rs-contact", label: "Contact", progress: contactFilled / 5 },
      section("education", "Education"),
      section("experience", "Experience"),
      section("project", "Projects"),
      { anchor: "rs-skills", label: "Skills", count: skills, progress: skills ? 1 : 0 },
    ];
  }, [live]);

  const copy = useCallback(
    async (kind: "latex" | "text") => {
      if (!exportModel) return;
      try {
        await navigator.clipboard.writeText(kind === "latex" ? toLatex(exportModel) : toPlainText(exportModel));
        toast(kind === "latex" ? "LaTeX copied" : "Resume text copied");
      } catch {
        toast("Your browser blocked the clipboard. Use Download .tex instead.", "error");
      }
    },
    [exportModel, toast]
  );

  const download = () => {
    if (!exportModel) return;
    const url = URL.createObjectURL(new Blob([toLatex(exportModel)], { type: "application/x-tex" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${slug(exportModel.contact.name)}-resume.tex` });
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clicking a line on the sheet opens and focuses the field it came from.
  const jumpToEditor = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) return;
    const ref = (e.target as HTMLElement).closest("[data-ref]")?.getAttribute("data-ref");
    if (!ref) return;
    window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: ref }));
    setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`#resume-editor [data-ref="${CSS.escape(ref)}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.querySelector<HTMLElement>("input, textarea")?.focus({ preventScroll: true });
    }, 80);
  };

  if (isError) {
    return <p role="alert" className="mx-auto mt-10 max-w-xl text-sm text-red-700">Couldn&apos;t load your resume: {(error as Error).message}</p>;
  }

  const isEmpty = model && !model.education.length && !model.experience.length && !model.projects.length && !model.skills.length;
  const safeActive = active && /^[\w:-]+$/.test(active) ? active : null;

  return (
    <div className="mx-auto max-w-[1480px]">
      {safeActive && <style>{`@media screen { #resume-sheet [data-ref="${safeActive}"] { background: rgb(36 86 214 / 0.08); box-shadow: 0 0 0 3pt rgb(36 86 214 / 0.08); } }`}</style>}
      <div data-print-hidden="true" className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-900">Resume</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Built on Jake&apos;s Resume, the one-page LaTeX template recruiters know. Changes save as you go. The AI tools only work from what you write here.
          </p>
        </div>
        {model && (
          <div className="flex items-center gap-2">
            <ExportMenu
              items={[
                { label: "Download .tex", icon: Download, run: download },
                { label: "Copy LaTeX", icon: Copy, run: () => copy("latex") },
                { label: "Copy as text", icon: FileText, run: () => copy("text") },
                { label: "Open in Overleaf", icon: ExternalLink, run: () => overleaf.current?.submit() },
              ]}
            />
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-[13px] font-medium text-accent-ink shadow-sm transition hover:bg-accent-hover active:scale-[0.97]"
            >
              <Printer className="h-4 w-4" aria-hidden /> Save as PDF
            </button>
            {/* Overleaf's documented "open a snippet" endpoint; only sent when the user clicks. */}
            {exportModel && (
              <form ref={overleaf} action="https://www.overleaf.com/docs" method="post" target="_blank" className="hidden">
                <input type="hidden" name="snip_name" value={`${slug(exportModel.contact.name)}-resume.tex`} readOnly />
                <input type="hidden" name="encoded_snip" value={encodeURIComponent(toLatex(exportModel))} readOnly />
              </form>
            )}
          </div>
        )}
      </div>

      {tailoring && (
        <TailoringPanel
          tailoring={tailoring}
          on={tailoredOn}
          shown={shown}
          reworded={reworded}
          onToggle={() => setUseTailored((v) => !v)}
          onDiscard={() => {
            try { sessionStorage.removeItem(TAILORING_KEY); } catch {}
            setTailoring(null);
            window.history.replaceState(null, "", "/resume");
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-[10.5rem_minmax(0,1fr)_minmax(0,1.05fr)]">
        {data && <SectionRail items={rail} variant="column" />}
        <div data-print-hidden="true" className="min-w-0">
          {isLoading || !data ? (
            <div className="flex justify-center py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading resume" /></div>
          ) : (
            <>
              <SectionRail items={rail} variant="strip" />
              <ResumeEditor data={data} draft={draft} onActive={setActive} />
            </>
          )}
        </div>

        <div className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <div data-print-hidden="true" className="mb-2 flex items-center justify-between gap-3 text-[13px] text-slate-500">
            <span>Preview</span>
            <span className={`flex items-center gap-2 ${overflows ? "text-amber-700" : ""}`}>
              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                <span
                  className={`block h-full rounded-full transition-[width] duration-500 ease-out ${overflows ? "bg-amber-500" : "bg-accent"}`}
                  style={{ width: `${Math.min(100, fill * 100)}%` }}
                />
              </span>
              {overflows ? "Runs onto a second page. Trim a few bullets." : "One page"}
            </span>
          </div>
          <div
            ref={frame}
            data-print-frame="true"
            onClick={jumpToEditor}
            className="overflow-hidden rounded-xl bg-slate-100 shadow-md"
            style={{ height: Math.max(height, PAGE_PX.height) * scale }}
          >
            <div ref={sheet} style={{ width: PAGE_PX.width, transform: `scale(${scale})`, transformOrigin: "top left" }}>
              {model && <ResumePreview model={model} />}
            </div>
          </div>
          {isEmpty ? (
            <p data-print-hidden="true" className="mt-3 text-center text-sm text-slate-500">Add your education, experience and projects to see them here.</p>
          ) : (
            <p data-print-hidden="true" className="mt-3 text-center text-[12px] text-slate-500">Click any line to edit it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
