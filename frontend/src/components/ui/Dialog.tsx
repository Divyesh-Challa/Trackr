"use client";

import React, { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal built on the native <dialog>: the browser handles focus trapping, Escape and the
 * inert background. `variant="drawer"` slides in from the right on wide screens.
 */
export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = "center",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  variant?: "center" | "drawer";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const layout =
    variant === "drawer"
      ? "m-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl rounded-none sm:rounded-l-2xl"
      : "m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl";

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose(); // backdrop click
      }}
      className={`${layout} border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40`}
    >
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold leading-tight">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-sm text-slate-600">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}
