"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./ui/Toast";

type Bullet = { id: string; section: string; heading: string; content: string; position: number };

const SECTIONS = [
  { id: "experience", label: "Experience" },
  { id: "project", label: "Project" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
  { id: "other", label: "Other" },
];

const input =
  "w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20";

/** The user's own resume bullets: the only material the AI tools are allowed to use. */
export default function ExperienceSection() {
  const qc = useQueryClient();
  const toast = useToast();
  const [heading, setHeading] = useState("");
  const [section, setSection] = useState("experience");
  const [text, setText] = useState("");

  const { data: bullets = [], isLoading } = useQuery({
    queryKey: ["resume-bullets"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("resume_bullets")
        .select("id, section, heading, content, position")
        .order("section")
        .order("heading")
        .order("position");
      if (error) throw new Error(error.message);
      return data as Bullet[];
    },
  });

  const groups = useMemo(() => {
    const map = new Map<string, Bullet[]>();
    for (const b of bullets) {
      const key = `${b.section}::${b.heading}`;
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return [...map.entries()];
  }, [bullets]);

  const add = useMutation({
    mutationFn: async () => {
      const lines = text
        .split("\n")
        .map((l) => l.replace(/^\s*[-•*·]\s*/, "").trim())
        .filter(Boolean);
      if (!lines.length) throw new Error("Write at least one bullet.");
      const tooLong = lines.find((l) => l.length > 600);
      if (tooLong) throw new Error("Keep each bullet under 600 characters.");
      const start = Date.now();
      const { error } = await createClient()
        .from("resume_bullets")
        .insert(lines.map((content, i) => ({ heading: heading.trim(), section, content, position: start + i })));
      if (error) throw new Error(error.message);
      return lines.length;
    },
    onSuccess: (n) => {
      setText("");
      qc.invalidateQueries({ queryKey: ["resume-bullets"] });
      toast(`Added ${n} bullet${n === 1 ? "" : "s"}`);
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("resume_bullets").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resume-bullets"] }),
    onError: (err: Error) => toast(err.message, "error"),
  });

  const headings = [...new Set(bullets.map((b) => b.heading).filter(Boolean))];

  return (
    <section aria-labelledby="experience-title" className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
      <div>
        <h2 id="experience-title" className="text-lg font-semibold text-slate-900">Your experience</h2>
        <p className="mt-1 text-sm text-slate-600">
          Your resume bullets. The AI tools only rewrite and choose from what&apos;s here, so they can&apos;t invent experience.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
        className="space-y-3 rounded-xl bg-slate-50 p-3"
      >
        <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
          <div className="space-y-1">
            <label htmlFor="bullet-heading" className="block text-[13px] font-medium text-slate-700">Role, project or school</label>
            <input id="bullet-heading" list="bullet-headings" maxLength={200} value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="Software Intern, Acme (Summer 2026)" className={input} />
            <datalist id="bullet-headings">{headings.map((h) => <option key={h} value={h} />)}</datalist>
          </div>
          <div className="space-y-1">
            <label htmlFor="bullet-section" className="block text-[13px] font-medium text-slate-700">Section</label>
            <select id="bullet-section" value={section} onChange={(e) => setSection(e.target.value)} className={input}>
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label htmlFor="bullet-text" className="block text-[13px] font-medium text-slate-700">Bullets (one per line)</label>
          <textarea id="bullet-text" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Built a React dashboard used by 12 teammates\nCut API latency by 40% with a Redis cache"} className={input} />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={add.isPending} className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60">
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
            Add bullets
          </button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !bullets.length ? (
        <p className="text-sm text-slate-500">No bullets yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(([key, items]) => (
            <div key={key}>
              <h3 className="text-[13px] font-semibold text-slate-800">
                {items[0].heading || "Untitled"}
                <span className="ml-2 font-normal text-slate-500">{SECTIONS.find((s) => s.id === items[0].section)?.label}</span>
              </h3>
              <ul className="mt-1 space-y-1">
                {items.map((b) => (
                  <li key={b.id} className="group flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                    <span className="flex-1">{b.content}</span>
                    <button type="button" onClick={() => remove.mutate(b.id)} aria-label={`Delete bullet: ${b.content}`} className="rounded p-1 text-slate-400 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
