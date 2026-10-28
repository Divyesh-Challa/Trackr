"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type KeyboardCoordinateGetter,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertCircle, BarChart3, Download, LayoutGrid, List, Loader2, Plus, Search, Upload } from "lucide-react";
import { COLUMNS, STATUS_LABEL, matchesSearch, positionBetween, sortByPosition } from "@/lib/board";
import { importCsv, toCsv } from "@/lib/csv";
import { importApplications } from "@/lib/api";
import { useApplications, useMoveApplication, keys } from "@/lib/tracker-hooks";
import { useToast } from "../ui/Toast";
import { OverlayCard, SortableCard, StaticCard } from "./ApplicationCard";
import AddApplicationDialog from "./AddApplicationDialog";
import ApplicationDrawer from "./ApplicationDrawer";
import InsightsView from "./InsightsView";
import ListView from "./ListView";
import { useQueryClient } from "@tanstack/react-query";
import type { Application, ApplicationStatus } from "@/types";

type Columns = Record<ApplicationStatus, string[]>;

function groupIds(apps: Application[]): Columns {
  const cols = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as string[]])) as unknown as Columns;
  for (const a of sortByPosition(apps)) cols[a.status]?.push(a.id);
  return cols;
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

function Column({
  id,
  title,
  accent,
  ids,
  byId,
  onOpen,
  onAdd,
}: {
  id: ApplicationStatus;
  title: string;
  accent: string;
  ids: string[];
  byId: Map<string, Application>;
  onOpen: (id: string) => void;
  onAdd: (status: ApplicationStatus) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${id}`, data: { status: id } });
  return (
    <section
      aria-label={`${title} column, ${ids.length} applications`}
      className={`flex w-[280px] shrink-0 flex-col rounded-2xl border bg-slate-50/80 ${isOver ? "border-[#0066FF]/50" : "border-slate-200"}`}
    >
      <header className="flex items-center justify-between px-3 py-2.5">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-slate-800">
          <span className={`h-2 w-2 rounded-full ${accent}`} aria-hidden />
          {title}
          <span className="font-normal text-slate-500">{ids.length}</span>
        </h2>
        <button
          type="button"
          onClick={() => onAdd(id)}
          aria-label={`Add to ${title}`}
          className="rounded-lg p-1 text-slate-500 hover:bg-surface hover:text-slate-900"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </header>
      <SortableContext id={id} items={ids} strategy={verticalListSortingStrategy}>
        <ul ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-3">
          {ids.map((appId) => {
            const app = byId.get(appId);
            return app ? <SortableCard key={appId} app={app} onOpen={onOpen} /> : null;
          })}
        </ul>
      </SortableContext>
    </section>
  );
}

export default function TrackerBoard() {
  const { data: apps = [], isLoading, isError, error, refetch } = useApplications();
  const move = useMoveApplication();
  const toast = useToast();
  const qc = useQueryClient();
  const desktop = useIsDesktop();

  const [view, setView] = useState<"board" | "list" | "insights">("board");
  const [search, setSearch] = useState("");
  const [workModel, setWorkModel] = useState<"ALL" | "REMOTE" | "HYBRID" | "ONSITE">("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [addStatus, setAddStatus] = useState<ApplicationStatus | null>(null);
  const [mobileColumn, setMobileColumn] = useState<ApplicationStatus>("APPLIED");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(
    () => apps.filter((a) => matchesSearch(a, search) && (workModel === "ALL" || a.work_model === workModel)),
    [apps, search, workModel]
  );
  const byId = useMemo(() => new Map(apps.map((a) => [a.id, a])), [apps]);

  // While dragging, columns live in local state so cards can move between lists freely.
  const [dragCols, setDragCols] = useState<Columns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const justDragged = useRef(false);
  const columns = dragCols ?? groupIds(visible);
  const dragColsRef = useRef<Columns | null>(null);
  dragColsRef.current = dragCols;

  // Left/right jump to the neighbouring column; up/down reorder within one. The stock
  // sortable getter doesn't reliably cross columns inside a horizontally scrolling board.
  const coordinateGetter = useRef<KeyboardCoordinateGetter>((event, args) => {
    if (event.code !== "ArrowLeft" && event.code !== "ArrowRight") {
      return sortableKeyboardCoordinates(event, args);
    }
    event.preventDefault();
    const { active, over, droppableRects } = args.context;
    const cols = dragColsRef.current;
    if (!active || !cols) return undefined;
    const current = containerOf(String(over?.id ?? active.id), cols) ?? containerOf(String(active.id), cols);
    const index = COLUMNS.findIndex((c) => c.id === current);
    const next = COLUMNS[index + (event.code === "ArrowRight" ? 1 : -1)];
    if (!next) return undefined;
    const rect = droppableRects.get(`col:${next.id}`);
    return rect ? { x: rect.left + 8, y: rect.top + 8 } : undefined;
  }).current;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const containerOf = (id: string, cols: Columns): ApplicationStatus | undefined => {
    if (id.startsWith("col:")) return id.slice(4) as ApplicationStatus;
    return (Object.keys(cols) as ApplicationStatus[]).find((k) => cols[k].includes(id));
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    setDragCols(groupIds(visible));
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragCols) return;
    const from = containerOf(String(active.id), dragCols);
    const to = containerOf(String(over.id), dragCols);
    if (!from || !to || from === to) return;
    setDragCols((cols) => {
      if (!cols) return cols;
      const target = cols[to];
      const overIndex = target.indexOf(String(over.id));
      const insertAt = overIndex >= 0 ? overIndex : target.length;
      return {
        ...cols,
        [from]: cols[from].filter((x) => x !== active.id),
        [to]: [...target.slice(0, insertAt), String(active.id), ...target.slice(insertAt)],
      };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const id = String(active.id);
    const cols = dragCols;
    setActiveId(null);
    setDragCols(null);
    justDragged.current = true;
    setTimeout(() => (justDragged.current = false), 250);
    if (!over || !cols) return;

    const to = containerOf(String(over.id), cols);
    if (!to) return;
    let list = cols[to];
    const oldIndex = list.indexOf(id);
    const overIndex = list.indexOf(String(over.id));
    if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) list = arrayMove(list, oldIndex, overIndex);
    const index = list.indexOf(id);

    const original = byId.get(id);
    if (!original) return;
    const neighbours = (i: number) => (list[i] ? byId.get(list[i])?.position : undefined);
    const position = positionBetween(neighbours(index - 1), neighbours(index + 1));
    const sameSpot =
      original.status === to &&
      groupIds(visible)[to].indexOf(id) === index;
    if (!sameSpot) move.mutate({ id, status: to, position });
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${byId.get(String(active.id))?.role_title ?? "application"}.`,
    onDragOver: ({ over }) => {
      if (!over || !dragCols) return undefined;
      const col = containerOf(String(over.id), dragCols);
      return col ? `Over ${STATUS_LABEL[col]}.` : undefined;
    },
    onDragEnd: ({ over }) => {
      if (!over || !dragCols) return "Dropped.";
      const col = containerOf(String(over.id), dragCols);
      return col ? `Dropped in ${STATUS_LABEL[col]}.` : "Dropped.";
    },
    onDragCancel: () => "Move cancelled.",
  };

  const open = (id: string) => {
    if (!justDragged.current) setOpenId(id);
  };

  const exportCsv = () => {
    const blob = new Blob([toCsv(apps)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trackr-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File) => {
    if (file.size > 2_000_000) {
      toast("That file is over 2 MB. Split it and try again.", "error");
      return;
    }
    const { rows, errors } = importCsv(await file.text());
    if (!rows.length) {
      toast(errors[0]?.message ?? "No rows to import.", "error");
      return;
    }
    setImporting(true);
    try {
      const n = await importApplications(rows);
      await qc.invalidateQueries({ queryKey: keys.applications, exact: true });
      qc.invalidateQueries({ queryKey: keys.allHistory });
      toast(
        errors.length
          ? `Imported ${n} applications. Skipped ${errors.length} row${errors.length === 1 ? "" : "s"} (first: line ${errors[0].line}, ${errors[0].message})`
          : `Imported ${n} applications`,
        errors.length ? "info" : "success"
      );
    } catch (err) {
      const message = (err as Error).message;
      await qc.invalidateQueries({ queryKey: keys.applications, exact: true });
      toast(
        message.includes("free_plan_limit")
          ? "Import stopped at the free plan's 50 active applications. Upgrade to Pro for unlimited."
          : message,
        message.includes("free_plan_limit") ? "info" : "error"
      );
    } finally {
      setImporting(false);
    }
  };

  const tabButton = (id: typeof view, label: string, Icon: typeof LayoutGrid) => (
    <button
      type="button"
      role="tab"
      aria-selected={view === id}
      onClick={() => setView(id)}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ${
        view === id ? "bg-surface text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">Applications</h1>
          <p className="text-sm text-slate-600">
            {apps.length} tracked · {apps.filter((a) => a.status !== "WISHLIST").length} applied
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="View" className="flex rounded-xl bg-slate-100 p-1">
            {tabButton("board", "Board", LayoutGrid)}
            {tabButton("list", "List", List)}
            {tabButton("insights", "Insights", BarChart3)}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) onImportFile(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {importing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
            Import CSV
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={!apps.length}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-surface px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden /> Export CSV
          </button>
          <button
            type="button"
            onClick={() => setAddStatus("APPLIED")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-[13px] font-medium text-white hover:bg-[#0052cc]"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add application
          </button>
        </div>
      </header>

      {view !== "insights" && apps.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <label htmlFor="board-search" className="sr-only">
              Search applications
            </label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="board-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role, city"
              className="w-full rounded-xl border border-slate-300 bg-surface py-2 pl-9 pr-3 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
            />
          </div>
          <label className="sr-only" htmlFor="work-model">
            Work model
          </label>
          <select
            id="work-model"
            value={workModel}
            onChange={(e) => setWorkModel(e.target.value as typeof workModel)}
            className="rounded-xl border border-slate-300 bg-surface px-3 py-2 text-sm text-slate-700"
          >
            <option value="ALL">Any work model</option>
            <option value="REMOTE">Remote</option>
            <option value="HYBRID">Hybrid</option>
            <option value="ONSITE">On-site</option>
          </select>
        </div>
      )}

      {isError ? (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-surface p-5 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 text-rose-600" aria-hidden />
          <div>
            <p className="font-medium text-rose-700">Couldn&apos;t load your applications.</p>
            <p className="mt-0.5 text-slate-600">{(error as Error).message}</p>
            <button type="button" onClick={() => refetch()} className="mt-3 font-medium text-[#0066FF] hover:underline">
              Try again
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label="Loading applications">
          {COLUMNS.slice(0, 4).map((c) => (
            <div key={c.id} className="h-64 w-[280px] shrink-0 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-surface p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Nothing tracked yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Save roles from the jobs feed, paste a posting link, or import the spreadsheet you&apos;ve been using.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/discover" className="rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc]">
              Browse jobs
            </Link>
            <button type="button" onClick={() => setAddStatus("APPLIED")} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Add one
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
              Import CSV
            </button>
          </div>
        </div>
      ) : view === "insights" ? (
        <InsightsView apps={apps} />
      ) : view === "list" ? (
        <ListView apps={visible} onOpen={setOpenId} />
      ) : desktop ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={() => {
            setActiveId(null);
            setDragCols(null);
          }}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable:
                "To move an application, press space to pick it up, use the arrow keys to move it between columns, and press space again to drop it. Press escape to cancel. Press enter to open it.",
            },
          }}
        >
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {COLUMNS.map((c) => (
              <Column key={c.id} {...c} ids={columns[c.id]} byId={byId} onOpen={open} onAdd={setAddStatus} />
            ))}
          </div>
          <DragOverlay>{activeId && byId.get(activeId) ? <OverlayCard app={byId.get(activeId)!} /> : null}</DragOverlay>
        </DndContext>
      ) : (
        <div className="space-y-3">
          <div role="tablist" aria-label="Column" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
            {COLUMNS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={mobileColumn === c.id}
                onClick={() => setMobileColumn(c.id)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 text-[13px] font-medium ${
                  mobileColumn === c.id ? "border-[#0066FF] bg-blue-50 text-[#0066FF]" : "border-slate-200 bg-surface text-slate-700"
                }`}
              >
                {c.title} <span className="text-slate-500">{columns[c.id].length}</span>
              </button>
            ))}
          </div>
          <ul className="space-y-2">
            {columns[mobileColumn].length === 0 && (
              <li className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                Nothing in {STATUS_LABEL[mobileColumn]}.
              </li>
            )}
            {columns[mobileColumn].map((id) => {
              const app = byId.get(id)!;
              return (
                <StaticCard
                  key={id}
                  app={app}
                  onOpen={setOpenId}
                  onMove={(status) => move.mutate({ id, status, position: positionBetween(undefined, byId.get(columns[status][0])?.position) })}
                />
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => setAddStatus(mobileColumn)}
            className="w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600"
          >
            + Add to {STATUS_LABEL[mobileColumn]}
          </button>
        </div>
      )}

      <AddApplicationDialog
        status={addStatus}
        onClose={() => setAddStatus(null)}
        topPosition={(s) => positionBetween(undefined, byId.get(groupIds(apps)[s][0] ?? "")?.position)}
      />
      <ApplicationDrawer id={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
