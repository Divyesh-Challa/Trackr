"use client";

import React, { useId, useRef, useState } from "react";

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20";

type FieldProps = {
  label: string;
  value: string;
  /** Called on every keystroke, for the live preview. */
  onDraft: (value: string) => void;
  /** Called on blur when the value changed; a rejection restores the "unsaved" state. */
  onSave: (value: string) => Promise<unknown>;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  multiline?: boolean;
  /** Empty isn't allowed: blur restores the last saved value. */
  required?: boolean;
  /** Applied on blur before saving, e.g. adding https:// to a bare link. */
  normalize?: (value: string) => string;
  className?: string;
  hideLabel?: boolean;
};

/**
 * A text field that keeps its own state while focused and saves on blur, so a refetch
 * elsewhere on the page never resets what the user is typing.
 */
export function Field({ label, value, onDraft, onSave, placeholder, maxLength = 200, type = "text", multiline, required, normalize, className, hideLabel }: FieldProps) {
  const id = useId();
  const [v, setV] = useState(value);
  const saved = useRef(value);

  const commit = () => {
    let next = normalize ? normalize(v.trim()) : v.trim();
    if (required && !next) next = saved.current;
    if (next !== v) {
      setV(next);
      onDraft(next);
    }
    if (next === saved.current) return;
    const prev = saved.current;
    saved.current = next;
    onSave(next).catch(() => {
      saved.current = prev;
    });
  };

  const props = {
    id,
    value: v,
    placeholder,
    maxLength,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setV(e.target.value);
      onDraft(e.target.value);
    },
    onBlur: commit,
    className: inputClass,
  };

  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "block text-[13px] font-medium text-slate-700"}>
        {label}
      </label>
      {multiline ? <textarea rows={2} {...props} className={`${inputClass} resize-y leading-snug`} /> : <input type={type} {...props} />}
    </div>
  );
}

/** Adds https:// to a bare link like "github.com/me", which the database would reject. */
export function normalizeUrl(value: string): string {
  if (!value) return value;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Splits pasted text into bullets, dropping list markers and blank lines. */
export function splitBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:[-•*·▪◦–]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

/** New positions after moving one item, as updates for the rows whose position changed. */
export function reorder<T extends { id: string; position: number }>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return [];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.flatMap((row, i) => (row.position === i ? [] : [{ id: row.id, position: i }]));
}
