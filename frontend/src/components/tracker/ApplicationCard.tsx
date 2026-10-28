"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, CheckSquare, FileText, GripVertical, MapPin, Users } from "lucide-react";
import { COLUMNS, nextDue } from "@/lib/board";
import type { Application, ApplicationStatus } from "@/types";

function CardBody({ app, dragHandle }: { app: Application; dragHandle?: React.ReactNode }) {
  const due = nextDue(app);
  return (
    <>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-slate-600">{app.company_name}</p>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{app.role_title}</h3>
        </div>
        {dragHandle}
      </div>
      {app.job_location && (
        <p className="mt-1.5 flex items-center gap-1 text-[13px] text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{app.job_location}</span>
        </p>
      )}
      {due && (
        <p
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            due.days < 0 ? "bg-rose-50 text-rose-700" : due.days <= 2 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          <CalendarClock className="h-3 w-3" aria-hidden />
          {due.label}
        </p>
      )}
      {(app.task_count || app.contact_count || app.note_count) ? (
        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
          {app.task_count ? (
            <span className="inline-flex items-center gap-1" title="Tasks done">
              <CheckSquare className="h-3.5 w-3.5" aria-hidden />
              {app.completed_tasks}/{app.task_count}
              <span className="sr-only">tasks done</span>
            </span>
          ) : null}
          {app.contact_count ? (
            <span className="inline-flex items-center gap-1" title="Contacts">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {app.contact_count}
              <span className="sr-only">contacts</span>
            </span>
          ) : null}
          {app.note_count ? (
            <span className="inline-flex items-center gap-1" title="Notes">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              {app.note_count}
              <span className="sr-only">notes</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

const cardClass =
  "rounded-xl border border-slate-200 bg-surface p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300";

/** A board card. The whole card is draggable (mouse/touch/keyboard); clicking opens it. */
export function SortableCard({ app, onOpen }: { app: Application; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.id,
    data: { status: app.status },
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : undefined}
    >
      <div
        {...attributes}
        {...listeners}
        role="button"
        aria-roledescription="draggable application"
        aria-label={`${app.role_title} at ${app.company_name}. Press space to pick up, or enter to open.`}
        onClick={() => onOpen(app.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            // Without this, the same keypress lands on the dialog's close button and shuts it.
            e.preventDefault();
            onOpen(app.id);
          }
          listeners?.onKeyDown?.(e);
        }}
        className={`${cardClass} cursor-grab touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] active:cursor-grabbing`}
      >
        <CardBody
          app={app}
          dragHandle={<GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
        />
      </div>
    </li>
  );
}

export function OverlayCard({ app }: { app: Application }) {
  return (
    <div className={`${cardClass} w-[264px] rotate-2 cursor-grabbing shadow-xl`}>
      <CardBody app={app} />
    </div>
  );
}

/** Mobile card: no dragging, a "Move to" menu instead. */
export function StaticCard({
  app,
  onOpen,
  onMove,
}: {
  app: Application;
  onOpen: (id: string) => void;
  onMove: (status: ApplicationStatus) => void;
}) {
  return (
    <li className={cardClass}>
      <button type="button" onClick={() => onOpen(app.id)} className="block w-full text-left">
        <CardBody app={app} />
      </button>
      <label className="mt-2 flex items-center gap-2 text-[13px] text-slate-600">
        Move to
        <select
          value={app.status}
          onChange={(e) => onMove(e.target.value as ApplicationStatus)}
          className="flex-1 rounded-lg border border-slate-200 bg-surface px-2 py-1.5 text-[13px] text-slate-800"
        >
          {COLUMNS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>
    </li>
  );
}
