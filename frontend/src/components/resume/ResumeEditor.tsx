"use client";

import React, { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FolderInput, Loader2, Plus, Trash2 } from "lucide-react";
import type { ResumeBulletRow, ResumeEntryRow } from "@/lib/resume";
import { useResumeMutations, type ContactPatch, type EntryPatch, type ResumeData } from "@/lib/resume-hooks";
import { Field, inputClass, normalizeUrl, reorder, splitBullets } from "./fields";

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

const SECTIONS: { id: ResumeEntryRow["section"]; title: string; noun: string; blank: string }[] = [
  { id: "education", title: "Education", noun: "school", blank: "New school" },
  { id: "experience", title: "Experience", noun: "role", blank: "New role" },
  { id: "project", title: "Projects", noun: "project", blank: "New project" },
];

const iconBtn =
  "rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-30";

function Card({ id, title, hint, action, children }: { id: string; title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-slate-200 bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="text-base font-semibold text-slate-900">{title}</h2>
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
    <Card id="contact-title" title="Contact" hint="The header of your resume.">
      <div className="grid gap-3 sm:grid-cols-2">
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
  const move = (from: number, to: number) =>
    reorder(bullets, from, to).forEach((u) => m.updateBullet.mutate({ id: u.id, patch: { position: u.position } }));

  return (
    <div className="space-y-2">
      {bullets.length > 0 && (
        <ol aria-label={`Bullets for ${entry.title}`} className="space-y-2">
          {bullets.map((b, i) => (
            <li key={b.id} className="flex items-start gap-1.5">
              <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
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
              <div className="flex flex-col">
                <button type="button" className={iconBtn} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label={`Move bullet ${i + 1} up`}>
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button type="button" className={iconBtn} disabled={i === bullets.length - 1} onClick={() => move(i, i + 1)} aria-label={`Move bullet ${i + 1} down`}>
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <button type="button" className={`${iconBtn} mt-1 hover:text-rose-600`} onClick={() => m.deleteBullet.mutate(b.id)} aria-label={`Delete bullet ${i + 1}`}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-start gap-2">
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
        <button
          type="button"
          onClick={add}
          disabled={!text.trim() || m.addBullets.isPending}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
    </div>
  );
}

function EntryCard({ entry, index, count, bullets, m, draft, onMove }: {
  entry: ResumeEntryRow; index: number; count: number; bullets: ResumeBulletRow[]; m: Mutations; draft: DraftSetters; onMove: (to: number) => void;
}) {
  const [confirming, setConfirming] = useState(false);
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

  return (
    <li className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-slate-800">{entry.title}</h3>
        <div className="flex shrink-0 items-center">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move ${entry.title} up`}>
            <ArrowUp className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={iconBtn} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label={`Move ${entry.title} down`}>
            <ArrowDown className="h-4 w-4" aria-hidden />
          </button>
          {confirming ? (
            <span className="ml-1 flex items-center gap-1 text-[13px]">
              <button type="button" onClick={() => m.deleteEntry.mutate(entry.id)} className="rounded-lg bg-rose-600 px-2 py-1 font-medium text-white hover:bg-rose-700">
                Delete{bullets.length ? ` with ${bullets.length} bullet${bullets.length === 1 ? "" : "s"}` : ""}
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100">Cancel</button>
            </span>
          ) : (
            <button type="button" className={`${iconBtn} hover:text-rose-600`} onClick={() => setConfirming(true)} aria-label={`Delete ${entry.title}`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields}
        {f("start_date", "Start", "Sep 2024", { max: 40 })}
        {f("end_date", "End", "Present", { max: 40 })}
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[13px] font-medium text-slate-700">Bullets</p>
        <BulletList entry={entry} bullets={bullets} m={m} draft={draft} />
      </div>
    </li>
  );
}

function EntrySection({ section, data, m, draft }: { section: (typeof SECTIONS)[number]; data: ResumeData; m: Mutations; draft: DraftSetters }) {
  const entries = data.entries.filter((e) => e.section === section.id).sort((a, b) => a.position - b.position);
  const bulletsFor = (id: string) => data.bullets.filter((b) => b.entry_id === id).sort((a, b) => a.position - b.position);
  const add = () =>
    m.addEntry.mutate({ section: section.id, title: section.blank, position: entries.length ? Math.max(...entries.map((e) => e.position)) + 1 : 0 });
  const move = (from: number, to: number) =>
    reorder(entries, from, to).forEach((u) => m.updateEntry.mutate({ id: u.id, patch: { position: u.position } }));

  return (
    <Card
      id={`${section.id}-title`}
      title={section.title}
      action={
        <button type="button" onClick={add} disabled={m.addEntry.isPending} className="inline-flex items-center gap-1 rounded-xl bg-[#0066FF] px-3 py-1.5 text-[13px] font-medium text-white shadow-sm hover:bg-[#0052cc] disabled:opacity-60">
          {m.addEntry.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
          Add {section.noun}
        </button>
      }
    >
      {entries.length ? (
        <ul className="space-y-3">
          {entries.map((e, i) => (
            <EntryCard key={e.id} entry={e} index={i} count={entries.length} bullets={bulletsFor(e.id)} m={m} draft={draft} onMove={(to) => move(i, to)} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">No {section.noun}s yet.</p>
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
    <Card id="skills-title" title="Technical skills" hint="One line per category, like Languages: Java, Python, C.">
      <ul className="space-y-2">
        {skills.map((s) => (
          <li key={s.id} className="grid grid-cols-[9rem_1fr_auto] items-start gap-2">
            <Field hideLabel label="Category" value={s.heading} maxLength={200} onDraft={(v) => draft.bullet(s.id, { heading: v })} onSave={(v) => m.updateBullet.mutateAsync({ id: s.id, patch: { heading: v } })} />
            <Field hideLabel label={`${s.heading || "Skills"} list`} value={s.content} maxLength={600} onDraft={(v) => draft.bullet(s.id, { content: v })} onSave={(v) => (v ? m.updateBullet.mutateAsync({ id: s.id, patch: { content: v } }) : m.deleteBullet.mutateAsync(s.id))} />
            <button type="button" className={`${iconBtn} mt-1 hover:text-rose-600`} onClick={() => m.deleteBullet.mutate(s.id)} aria-label={`Delete ${s.heading || "skills"} line`}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className={`grid grid-cols-[9rem_1fr_auto] gap-2 ${skills.length ? "mt-3" : ""}`}>
        <label className="sr-only" htmlFor="new-skill-category">New skill category</label>
        <input id="new-skill-category" value={category} maxLength={200} onChange={(e) => setCategory(e.target.value)} placeholder="Languages" className={inputClass} />
        <label className="sr-only" htmlFor="new-skill-items">Skills in that category</label>
        <input id="new-skill-items" value={items} maxLength={600} onChange={(e) => setItems(e.target.value)} placeholder="Java, Python, C/C++, SQL, JavaScript" className={inputClass} />
        <button type="submit" disabled={!items.trim()} className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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

export default function ResumeEditor({ data, draft }: { data: ResumeData; draft: DraftSetters }) {
  const m = useResumeMutations();
  return (
    <div className="space-y-5">
      <ContactCard data={data} m={m} draft={draft} />
      <LooseBullets data={data} m={m} />
      {SECTIONS.map((s) => (
        <EntrySection key={s.id} section={s} data={data} m={m} draft={draft} />
      ))}
      <SkillsCard data={data} m={m} draft={draft} />
    </div>
  );
}
