"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type Kind = "success" | "error" | "info";
type ToastItem = { id: number; text: string; kind: Kind; action?: { label: string; run: () => void } };
type ShowToast = (text: string, kind?: Kind, action?: ToastItem["action"]) => void;

const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback<ShowToast>(
    (text, kind = "success", action) => {
      const id = nextId.current++;
      setToasts((t) => [...t.slice(-2), { id, text, kind, action }]);
      setTimeout(() => dismiss(id), kind === "error" ? 7000 : 4000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-[#0f172a] px-4 py-3 text-sm text-white shadow-xl ring-1 ring-white/10"
            >
              <Icon
                className={`mt-0.5 h-4 w-4 shrink-0 ${t.kind === "error" ? "text-rose-400" : t.kind === "info" ? "text-sky-300" : "text-emerald-400"}`}
                aria-hidden
              />
              <span className="flex-1">{t.text}</span>
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action!.run();
                    dismiss(t.id);
                  }}
                  className="font-semibold text-sky-300 hover:text-sky-200"
                >
                  {t.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-[#94a3b8] hover:text-white">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
