"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, FolderInput, Loader2, Plus, Trash2 } from "lucide-react";
import { dateRange, type ResumeBulletRow, type ResumeEntryRow } from "@/lib/resume";
import { useResumeMutations, type ContactPatch, type EntryPatch, type ResumeData } from "@/lib/resume-hooks";
import { springs } from "@/lib/motion-tokens";
import { Field, inputClass, normalizeUrl, reorder, splitBullets } from "./fields";
import { GripHandle, SortableList, SortableRow } from "./sortable";

export type Drafts = {
  contact: ContactPatch;
  entries: Record<string, EntryPatch>;
  bullets: Record<string, { content?: string; heading?: string }>;
};

type Mutations = ReturnType<typeof useResumeMutations>;
type DraftSetters = {
  contact: (patch: ContactPatch) => void;
  entry: (id: string, patch: EntryPatch) => void;
  bullet: (id: string, patch: { content?: string; heading?: string }) => void;
};

export const SECTIONS: { id: ResumeEntryRow["section"]; title: string; noun: string; blank: string }[] = [
  { id: "education", title: "Education", noun: "school", blank: "New school" },
  { id: "experience", title: "Experience", noun: "role", blank: "New role" },
  { id: "project", title: "Projects", noun: "project", blank: "New project" },
];

/** Opens the editor row behind a preview line (`e:<id>`, `b:<id>`…); see ResumeBuilder. */
export const REVEAL_EVENT = "resume:reveal";

const iconBtn =
  "rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30";
// Row tools show on hover or focus on a desktop and always on touch screens.
const hoverTool = "md:opacity-0 md:group-hover/row:opacity-100 md:focus-visible:opacity-100";
const addBtn =
  "inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50";

function Card({ id, anchor, title, hint, action, children }: { id: string; anchor?: string; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={anchor} aria-labelledby={id} className="scroll-mt-32 rounded-2xl bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ContactCard({ data, m, draft }: { data: ResumeData; m: Mutations; draft: DraftSetters }) {
  const c = data.contact;
  const field = (key: keyof ContactPatch, label: string, opts: { placeholder?: string; type?: string; url?: boolean; max?: number } = {}) => (
    <Field
      label={label}
      value={(key === "full_name" ? c.name : c[key as keyof typeof c]) ?? ""}
      type={opts.type}
      placeholder={opts.placeholder}
      maxLength={opts.max ?? (opts.url ? 300 : 120)}
      normalize={opts.url ? normalizeUrl : undefined}
      onDraft={(v) => draft.contact({ [key]: v })}
      onSave={(v) => m.saveContact.mutateAsync({ id: c.id, patch: { [key]: key === "full_name" ? v : v || null } })}
    />
  );
  return (
    <Card id="contact-title" anchor="rs-contact" title="Contact" hint="The header of your resume.">
      <div data-ref="contact" className="grid gap-3 sm:grid-cols-2">
        {field("full_name", "Full name", { placeholder: "Jake Ryan" })}
        {field("email", "Email", { type: "email", placeholder: "jake@su.edu", max: 255 })}
        {field("phone", "Phone", { type: "tel", placeholder: "604-555-0134", max: 40 })}
        {field("location", "Location", { placeholder: "Vancouver, BC" })}
        {field("linkedin_url", "LinkedIn", { url: true, placeholder: "linkedin.com/in/jake" })}
        {field("github_url", "GitHub", { url: true, placeholder: "github.com/jake" })}
        {field("website_url", "Website", { url: true, placeholder: "jake.dev" })}
      </div>
    </Card>
  );
}

function BulletList({ entry, bullets, m, draft }: { entry: ResumeEntryRow; bullets: ResumeBulletRow[]; m: Mutations; draft: DraftSetters }) {
  const [text, setText] = useState("");
  const add = () => {
    const lines = splitBullets(text);
    if (!lines.length) return;
    const start = bullets.length ? Math.max(...bullets.map((b) => b.position)) + 1 : 0;
    m.addBullets.mutate(
      lines.map((content, i) => ({ entry_id: entry.id, section: entry.section, content: content.slice(0, 600), position: start + i })),
      { onSuccess: () => setText("") }
    );
  };

  return (
    <div className="space-y-2">
      {bullets.length > 0 && (
        <SortableList ids={bullets.map((b) => b.id)} onMove={(from, to) => m.reorderBullets.mutate(reorder(bullets, from, to))}>
          <ol aria-label={`Bullets for ${entry.title}`} className="space-y-1.5">
            {bullets.map((b, i) => (
              <SortableRow key={b.id} id={b.id} data-ref={`b:${b.id}`} className="group/row flex items-start gap-1 rounded-lg bg-surface">
                {(grip) => (
                  <>
                    <GripHandle grip={grip} label={`Reorder bullet ${i + 1}`} className={`mt-1.5 ${hoverTool}`} />
                    <Field
                      className="flex-1"
                      hideLabel
                      multiline
                      maxLength={600}
                      label={`Bullet ${i + 1}`}
                      value={b.content}
                      onDraft={(v) => draft.bullet(b.id, { content: v })}
                      onSave={(v) => (v ? m.updateBullet.mutateAsync({ id: b.id, patch: { content: v } }) : m.deleteBullet.mutateAsync(b.id))}
                    />
                    <button type="button" className={`${iconBtn} mt-1 hover:text-rose-600 ${hoverTool}`} onClick={() => m.deleteBullet.mutate(b.id)} aria-label={`Delete bullet ${i + 1}`}>
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </>
                )}
              </SortableRow>
            ))}
          </ol>
        </SortableList>
      )}
      <div className="flex items-start gap-2 pl-7">
        <label htmlFor={`new-bullet-${entry.id}`} className="sr-only">New bullet for {entry.title}</label>
        <textarea
          id={`new-bullet-${entry.id}`}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a bullet: start with a verb, show the result (paste several lines to add many)"
          className={`${inputClass} resize-y`}
        />
        <button type="button" onClick={add} disabled={!text.trim() || m.addBullets.isPending} className={`${addBtn} mt-0.5`}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
    </div>
  );
}

function EntryRow({ entry, bullets, m, draft, defaultOpen }: { entry: ResumeEntryRow; bullets: ResumeBulletRow[]; m: Mutations; draft: DraftSetters; defaultOpen: boolean }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const [confirming, setConfirming] = useState(false);
  const bulletRefs = useRef(new Set<string>());
  bulletRefs.current = new Set(bullets.map((b) => `b:${b.id}`));

  useEffect(() => {
    const onReveal = (e: Event) => {
      const ref = (e as CustomEvent<string>).detail;
      if (ref === `e:${entry.id}` || bulletRefs.current.has(ref)) setOpen(true);
    };
    window.addEventListener(REVEAL_EVENT, onReveal);
    return () => window.removeEventListener(REVEAL_EVENT, onReveal);
  }, [entry.id]);

  const f = (key: keyof EntryPatch & string, label: string, placeholder?: string, opts: { required?: boolean; max?: number } = {}) => (
    <Field
      label={label}
      value={String(entry[key as keyof ResumeEntryRow] ?? "")}
      placeholder={placeholder}
      required={opts.required}
      maxLength={opts.max ?? 200}
      onDraft={(v) => draft.entry(entry.id, { [key]: v })}
      onSave={(v) => m.updateEntry.mutateAsync({ id: entry.id, patch: { [key]: v } })}
    />
  );

  const fields =
    entry.section === "education" ? (
      <>
        {f("organization", "School", "Simon Fraser University")}
        {f("location", "Location", "Burnaby, BC", { max: 120 })}
        {f("title", "Degree", "Bachelor of Science in Computing Science", { required: true })}
        {f("details", "Details", "GPA 3.8, Dean's List", { max: 300 })}
      </>
    ) : entry.section === "experience" ? (
      <>
        {f("title", "Role", "Software Developer Co-op", { required: true })}
        {f("organization", "Company", "Acme Corp")}
        {f("location", "Location", "Vancouver, BC", { max: 120 })}
      </>
    ) : (
      <>
        {f("title", "Project name", "Gitlytics", { required: true })}
        {f("tech", "Technologies", "Python, Flask, React, PostgreSQL", { max: 300 })}
      </>
    );

  const meta = [entry.section === "project" ? entry.tech : entry.organization, dateRange(entry.start_date, entry.end_date)].filter(Boolean).join(" · ");

  return (
    <SortableRow id={entry.id} data-ref={`e:${entry.id}`} className="group/row rounded-xl bg-slate-50 ring-1 ring-slate-900/[0.06]">
      {(grip) => (
        <>
          <div className="flex items-center gap-1 py-2 pl-1.5 pr-2">
            <GripHandle grip={grip} label={`Reorder ${entry.title}`} className={hoverTool} />
            {/* The whole row toggles; the heading's button keeps the name to the title for screen readers. */}
            <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1" onClick={() => setOpen((o) => !o)}>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold text-slate-900">
                  <button type="button" aria-expanded={open} aria-controls={`entry-${entry.id}`} className="max-w-full truncate text-left">
                    {entry.title}
                  </button>
                </h3>
                {meta && <p className="truncate text-[12px] text-slate-500">{meta}</p>}
              </div>
              <span className="shrink-0 text-[12px] text-slate-500">
                {bullets.length} bullet{bullets.length === 1 ? "" : "s"}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
            </div>
            {confirming ? (
              <span className="flex shrink-0 items-center gap-1 text-[13px]">
                <button type="button" onClick={() => m.deleteEntry.mutate(entry.id)} className="rounded-full bg-rose-600 px-2.5 py-1 font-medium text-white hover:bg-rose-700">
                  Delete{bullets.length ? ` with ${bullets.length} bullet${bullets.length === 1 ? "" : "s"}` : ""}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="rounded-full px-2.5 py-1 text-slate-600 hover:bg-slate-100">Cancel</button>
              </span>
            ) : (
              <button type="button" className={`${iconBtn} hover:text-rose-600 ${hoverTool}`} onClick={() => setConfirming(true)} aria-label={`Delete ${entry.title}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id={`entry-${entry.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduce ? { duration: 0 } : springs.list}
                className="overflow-hidden"
              >
                <div className="border-t border-slate-900/[0.06] bg-surface px-4 pb-4 pt-3 [border-bottom-left-radius:inherit] [border-bottom-right-radius:inherit]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {fields}
                    {f("start_date", "Start", "Sep 2024", { max: 40 })}
                    {f("end_date", "End", "Present", { max: 40 })}
                  </div>
                  <div className="mt-4">
                    <p className="mb-2 text-[13px] font-medium text-slate-700">Bullets</p>
                    <BulletList entry={entry} bullets={bullets} m={m} draft={draft} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </SortableRow>
  );
}

function EntrySection({ section, data, m, draft }: { section: (typeof SECTIONS)[number]; data: ResumeData; m: Mutations; draft: DraftSetters }) {
  const entries = data.entries.filter((e) => e.section === section.id).sort((a, b) => a.position - b.position);
  const bulletsFor = (id: string) => data.bullets.filter((b) => b.entry_id === id).sort((a, b) => a.position - b.position);
  // Entries already there when the page loaded start folded; ones added now open for typing.
  const known = useRef(new Set(entries.map((e) => e.id)));
  const add = () =>
    m.addEntry.mutate({ section: section.id, title: section.blank, position: entries.length ? Math.max(...entries.map((e) => e.position)) + 1 : 0 });

  return (
    <Card
      id={`${section.id}-title`}
      anchor={`rs-${section.id}`}
      title={section.title}
      action={
        <button type="button" onClick={add} disabled={m.addEntry.isPending} className={addBtn}>
          {m.addEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          Add {section.noun}
        </button>
      }
    >
      {entries.length ? (
        <SortableList ids={entries.map((e) => e.id)} onMove={(from, to) => m.reorderEntries.mutate(reorder(entries, from, to))}>
          <ul className="space-y-2">
            {entries.map((e) => (
              <EntryRow key={e.id} entry={e} bullets={bulletsFor(e.id)} m={m} draft={draft} defaultOpen={!known.current.has(e.id)} />
            ))}
          </ul>
        </SortableList>
      ) : (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No {section.noun}s yet.</p>
      )}
    </Card>
  );
}

function SkillsCard({ data, m, draft }: { data: ResumeData; m: Mutations; draft: DraftSetters }) {
  const skills = data.bullets.filter((b) => b.section === "skills" && !b.entry_id).sort((a, b) => a.position - b.position);
  const [category, setCategory] = useState("");
  const [items, setItems] = useState("");
  const add = () => {
    if (!items.trim()) return;
    m.addBullets.mutate(
      [{ entry_id: null, section: "skills", heading: category.trim() || "Skills", content: items.trim().slice(0, 600), position: skills.length ? Math.max(...skills.map((s) => s.position)) + 1 : 0 }],
      { onSuccess: () => { setCategory(""); setItems(""); } }
    );
  };

  return (
    <Card id="skills-title" anchor="rs-skills" title="Technical skills" hint="One line per category, like Languages: Java, Python, C.">
      {skills.length > 0 && (
        <SortableList ids={skills.map((s) => s.id)} onMove={(from, to) => m.reorderBullets.mutate(reorder(skills, from, to))}>
          <ul className="space-y-1.5">
            {skills.map((s) => (
              <SortableRow key={s.id} id={s.id} data-ref={`s:${s.id}`} className="group/row grid grid-cols-[auto_8rem_1fr_auto] items-start gap-1.5 rounded-lg bg-surface sm:grid-cols-[auto_9rem_1fr_auto]">
                {(grip) => (
                  <>
                    <GripHandle grip={grip} label={`Reorder ${s.heading || "skills"} line`} className={`mt-1.5 ${hoverTool}`} />
                    <Field hideLabel label="Category" value={s.heading} maxLength={200} onDraft={(v) => draft.bullet(s.id, { heading: v })} onSave={(v) => m.updateBullet.mutateAsync({ id: s.id, patch: { heading: v } })} />
                    <Field hideLabel label={`${s.heading || "Skills"} list`} value={s.content} maxLength={600} onDraft={(v) => draft.bullet(s.id, { content: v })} onSave={(v) => (v ? m.updateBullet.mutateAsync({ id: s.id, patch: { content: v } }) : m.deleteBullet.mutateAsync(s.id))} />
                    <button type="button" className={`${iconBtn} mt-1 hover:text-rose-600 ${hoverTool}`} onClick={() => m.deleteBullet.mutate(s.id)} aria-label={`Delete ${s.heading || "skills"} line`}>
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </>
                )}
              </SortableRow>
            ))}
          </ul>
        </SortableList>
      )}
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className={`grid grid-cols-[8rem_1fr_auto] gap-2 pl-7 sm:grid-cols-[9rem_1fr_auto] ${skills.length ? "mt-3" : ""}`}>
        <label className="sr-only" htmlFor="new-skill-category">New skill category</label>
        <input id="new-skill-category" value={category} maxLength={200} onChange={(e) => setCategory(e.target.value)} placeholder="Languages" className={inputClass} />
        <label className="sr-only" htmlFor="new-skill-items">Skills in that category</label>
        <input id="new-skill-items" value={items} maxLength={600} onChange={(e) => setItems(e.target.value)} placeholder="Java, Python, C/C++, SQL, JavaScript" className={inputClass} />
        <button type="submit" disabled={!items.trim()} className={addBtn}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </form>
    </Card>
  );
}

/** Bullets saved before the builder existed have a heading but no entry; offer to turn each group into one. */
function LooseBullets({ data, m }: { data: ResumeData; m: Mutations }) {
  const groups = useMemo(() => {
    const map = new Map<string, ResumeBulletRow[]>();
    for (const b of data.bullets) {
      if (b.entry_id || b.section === "skills") continue;
      const key = `${b.section}::${b.heading}`;
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return [...map.values()];
  }, [data.bullets]);
  if (!groups.length) return null;

  return (
    <Card id="loose-title" title="Bullets to sort" hint="These bullets aren't on your resume yet. Move each group into an entry, then fill in its dates.">
      <ul className="space-y-3">
        {groups.map((items) => {
          const { section, heading } = items[0];
          const target: ResumeEntryRow["section"] = section === "project" || section === "education" ? section : "experience";
          return (
            <li key={`${section}::${heading}`} className="rounded-xl border border-dashed border-slate-300 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">
                  {heading || "Untitled"} <span className="font-normal text-slate-500">· {items.length} bullet{items.length === 1 ? "" : "s"}</span>
                </p>
                <button
                  type="button"
                  disabled={m.importGroup.isPending}
                  onClick={() => m.importGroup.mutate({ section: target, title: (heading || "Untitled").slice(0, 200), position: Date.now(), bulletIds: items.map((b) => b.id) })}
                  className={addBtn}
                >
                  <FolderInput className="h-3.5 w-3.5" aria-hidden /> Make it {target === "project" ? "a project" : target === "education" ? "a school" : "a role"}
                </button>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-slate-600">
                {items.slice(0, 3).map((b) => <li key={b.id}>{b.content}</li>)}
                {items.length > 3 && <li className="list-none text-slate-400">and {items.length - 3} more</li>}
              </ul>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** `onActive` gets the preview ref (`contact`, `e:<id>`, `b:<id>`, `s:<id>`) of the field being edited. */
export default function ResumeEditor({ data, draft, onActive }: { data: ResumeData; draft: DraftSetters; onActive?: (ref: string | null) => void }) {
  const m = useResumeMutations();
  const refOf = (el: EventTarget | null) => (el instanceof HTMLElement ? el.closest("[data-ref]")?.getAttribute("data-ref") ?? null : null);
  return (
    <div id="resume-editor" className="space-y-5" onFocus={(e) => onActive?.(refOf(e.target))} onBlur={(e) => onActive?.(refOf(e.relatedTarget))}>
      <ContactCard data={data} m={m} draft={draft} />
      <LooseBullets data={data} m={m} />
      {SECTIONS.map((s) => (
        <EntrySection key={s.id} section={s} data={data} m={m} draft={draft} />
      ))}
      <SkillsCard data={data} m={m} draft={draft} />
    </div>
  );
}
