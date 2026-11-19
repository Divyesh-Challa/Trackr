"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Search, Sparkles, type LucideIcon } from "lucide-react";
import { springs } from "../lib/motion-tokens";

export type PaletteLink = { href: string; label: string; icon: LucideIcon };
type Item = { id: string; label: string; hint?: string; icon: LucideIcon; run: () => void };

/** Opens the palette from anywhere (the nav's search button dispatches this). */
export const openPalette = () => window.dispatchEvent(new Event("palette:open"));

/**
 * ⌘K / Ctrl+K: jump to a page, search the job feed, or hand the text to Scout.
 * Arrow keys move, Enter runs, Escape closes.
 */
export default function CommandPalette({ links, signedIn }: { links: PaletteLink[]; signedIn: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    // Reset in the same update that opens it: a quick reopen reuses the element still animating out.
    const show = () => {
      setQ("");
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("palette:open", show);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("palette:open", show);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => prev?.focus?.();
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      setOpen(false);
      router.push(href);
    };
    const text = q.trim();
    const needle = text.toLowerCase();
    const pages = links
      .filter((l) => !needle || l.label.toLowerCase().includes(needle))
      .map((l) => ({ id: l.href, label: l.label, hint: "Go to", icon: l.icon, run: go(l.href) }));
    if (!text) return pages;
    const actions: Item[] = [{ id: "search", label: `Search jobs for “${text}”`, icon: Search, run: go(`/discover?q=${encodeURIComponent(text)}`) }];
    if (signedIn)
      actions.push({
        id: "scout",
        label: `Ask Scout: ${text}`,
        icon: Sparkles,
        run: () => {
          setOpen(false);
          window.dispatchEvent(new CustomEvent("scout:open", { detail: text }));
        },
      });
    return [...pages, ...actions];
  }, [q, links, signedIn, router]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") items[active]?.run();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/30 px-4 pt-[12vh] backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
            transition={springs.modal}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-surface shadow-2xl"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4">
              <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                placeholder="Jump to a page, search jobs, ask Scout…"
                aria-label="Command"
                aria-controls="palette-list"
                aria-activedescendant={items[active] ? `palette-${items[active].id}` : undefined}
                className="h-14 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-500 focus-visible:outline-none"
              />
              <kbd className="hidden rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 sm:block">Esc</kbd>
            </div>
            <ul id="palette-list" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto p-2">
              {items.map((it, i) => (
                <li
                  key={it.id}
                  id={`palette-${it.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={it.run}
                  className={`relative isolate flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${i === active ? "text-slate-900" : "text-slate-700"}`}
                >
                  {i === active && (
                    <motion.span layoutId="palette-active" transition={springs.glide} className="absolute inset-0 -z-10 rounded-lg bg-slate-100" />
                  )}
                  <it.icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                  <span className="min-w-0 flex-1 truncate font-medium">{it.label}</span>
                  {it.hint && <span className="text-xs text-slate-500">{it.hint}</span>}
                  {i === active && <ArrowRight className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
                </li>
              ))}
              {!items.length && <li className="px-3 py-6 text-center text-sm text-slate-500">Nothing matches.</li>}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
