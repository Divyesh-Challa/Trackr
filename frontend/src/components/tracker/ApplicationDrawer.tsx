"use client";

import React, { useEffect, useState } from "react";
import { ExternalLink, Loader2, Trash2 } from "lucide-react";
import Dialog from "../ui/Dialog";
import { Field, inputClass } from "./AddApplicationDialog";
import AiTab from "./AiTab";
import { COLUMNS, STATUS_LABEL } from "@/lib/board";
import {
  useApplication,
  useContactMutations,
  useContacts,
  useDeleteApplication,
  useHistory,
  useMoveApplication,
  useNoteMutations,
  useNotes,
  useTaskMutations,
  useTasks,
  useUpdateApplication,
} from "@/lib/tracker-hooks";
import type { Application, ApplicationStatus } from "@/types";

type Tab = "details" | "tasks" | "contacts" | "notes" | "ai" | "history";

function formatDate(iso: string) {
  return new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ListState({ loading, error, empty, emptyText }: { loading: boolean; error: unknown; empty: boolean; emptyText: string }) {
  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (error) return <p role="alert" className="text-sm text-rose-700">Couldn&apos;t load: {(error as Error).message}</p>;
  if (empty) return <p className="text-sm text-slate-500">{emptyText}</p>;
  return null;
}

function DetailsTab({ app, onDeleted }: { app: Application; onDeleted: () => void }) {
  const update = useUpdateApplication();
  const remove = useDeleteApplication();
  const move = useMoveApplication();
  const toForm = (a: Application) => ({
    company_name: a.company_name,
    role_title: a.role_title,
    location: a.job_location ?? "",
    work_model: a.work_model ?? "",
    salary_text: a.salary_range ?? "",
    job_url: a.job_description_url ?? "",
    applied_at: a.status === "WISHLIST" ? "" : a.applied_date ?? "",
    deadline_at: a.deadline_at ?? "",
    follow_up_at: a.follow_up_at ?? "",
    description: a.raw_description ?? "",
  });
  const [form, setForm] = useState(() => toForm(app));
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Reset only when switching applications, so a status change doesn't wipe unsaved edits.
  useEffect(() => setForm(toForm(app)), [app.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      id: app.id,
      patch: {
        company_name: form.company_name.trim(),
        role_title: form.role_title.trim(),
        location: form.location.trim() || null,
        work_model: (form.work_model || null) as "REMOTE" | "HYBRID" | "ONSITE" | null,
        salary_text: form.salary_text.trim() || null,
        job_url: form.job_url.trim() || null,
        applied_at: form.applied_at || null,
        deadline_at: form.deadline_at || null,
        follow_up_at: form.follow_up_at || null,
        description: form.description || null,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Status" htmlFor="detail-status">
          <select
            id="detail-status"
            value={app.status}
            onChange={(e) => move.mutate({ id: app.id, status: e.target.value as ApplicationStatus })}
            className={`${inputClass} w-52`}
          >
            {COLUMNS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        {app.job_description_url && (
          <a
            href={app.job_description_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Open posting <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        )}
      </div>

      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Company" htmlFor="d-company">
            <input id="d-company" required maxLength={200} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Role" htmlFor="d-role">
            <input id="d-role" required maxLength={200} value={form.role_title} onChange={(e) => set("role_title", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Location" htmlFor="d-location">
            <input id="d-location" maxLength={200} value={form.location} onChange={(e) => set("location", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Work model" htmlFor="d-model">
            <select id="d-model" value={form.work_model} onChange={(e) => set("work_model", e.target.value)} className={inputClass}>
              <option value="">Not sure</option>
              <option value="ONSITE">On-site</option>
              <option value="HYBRID">Hybrid</option>
              <option value="REMOTE">Remote</option>
            </select>
          </Field>
          <Field label="Pay" htmlFor="d-pay">
            <input id="d-pay" maxLength={120} value={form.salary_text} onChange={(e) => set("salary_text", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Posting link" htmlFor="d-url">
            <input id="d-url" type="url" maxLength={2048} value={form.job_url} onChange={(e) => set("job_url", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Applied on" htmlFor="d-applied">
            <input id="d-applied" type="date" value={form.applied_at} onChange={(e) => set("applied_at", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Application deadline" htmlFor="d-deadline">
            <input id="d-deadline" type="date" value={form.deadline_at} onChange={(e) => set("deadline_at", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Follow up on" htmlFor="d-follow" hint="Shows on the card a week ahead.">
            <input id="d-follow" type="date" value={form.follow_up_at} onChange={(e) => set("follow_up_at", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Job description" htmlFor="d-desc" hint="Keep a copy here; postings often disappear after they close.">
          <textarea id="d-desc" rows={6} maxLength={100000} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </Field>
        <div className="flex items-center justify-between pt-1">
          {confirmDelete ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-700">Delete this application and its tasks, contacts and notes?</span>
              <button
                type="button"
                onClick={() => {
                  remove.mutate(app.id);
                  onDeleted();
                }}
                className="rounded-lg bg-rose-600 px-3 py-1.5 font-medium text-white hover:bg-rose-700"
              >
                Delete
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100">
                Keep
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </button>
          )}
          <button
            type="submit"
            disabled={update.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60"
          >
            {update.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}

function TasksTab({ appId }: { appId: string }) {
  const { data: tasks = [], isLoading, error } = useTasks(appId);
  const m = useTaskMutations(appId);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.add.mutate({ title: title.trim(), due: due || undefined }, { onSuccess: () => { setTitle(""); setDue(""); } });
        }}
        className="flex flex-wrap gap-2"
      >
        <label htmlFor="task-title" className="sr-only">New task</label>
        <input id="task-title" required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Finish the OA" className={`${inputClass} min-w-0 flex-1`} />
        <label htmlFor="task-due" className="sr-only">Due date</label>
        <input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${inputClass} w-40`} />
        <button type="submit" disabled={m.add.isPending} className="rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60">Add</button>
      </form>
      <ListState loading={isLoading} error={error} empty={!tasks.length} emptyText="No tasks yet." />
      <ul className="divide-y divide-slate-100">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <input
              id={`task-${t.id}`}
              type="checkbox"
              checked={t.is_completed}
              onChange={(e) => m.toggle.mutate({ id: t.id, done: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor={`task-${t.id}`} className={`flex-1 text-sm ${t.is_completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
              {t.title}
              {t.due_date && <span className="ml-2 text-xs text-slate-500">due {formatDate(t.due_date)}</span>}
            </label>
            <button type="button" onClick={() => m.remove.mutate(t.id)} aria-label={`Delete task ${t.title}`} className="rounded p-1 text-slate-400 hover:text-rose-600">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactsTab({ appId }: { appId: string }) {
  const { data: contacts = [], isLoading, error } = useContacts(appId);
  const m = useContactMutations(appId);
  const blank = { name: "", role_title: "", email: "", linkedin_url: "", notes: "" };
  const [c, setC] = useState(blank);
  return (
    <div className="space-y-4">
      <ListState loading={isLoading} error={error} empty={!contacts.length} emptyText="No contacts yet. Add recruiters, referrers or interviewers." />
      <ul className="space-y-2">
        {contacts.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{p.name}{p.role_title && <span className="font-normal text-slate-600"> · {p.role_title}</span>}</p>
              <p className="mt-0.5 space-x-3 text-[13px]">
                {p.email && <a className="text-[#0066FF] hover:underline" href={`mailto:${p.email}`}>{p.email}</a>}
                {p.linkedin_url && /^https?:\/\//.test(p.linkedin_url) && (
                  <a className="text-[#0066FF] hover:underline" href={p.linkedin_url} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                )}
              </p>
              {p.notes && <p className="mt-1 whitespace-pre-wrap text-[13px] text-slate-600">{p.notes}</p>}
            </div>
            <button type="button" onClick={() => m.remove.mutate(p.id)} aria-label={`Delete contact ${p.name}`} className="rounded p-1 text-slate-400 hover:text-rose-600">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.add.mutate(
            Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.trim() || undefined])) as { name: string },
            { onSuccess: () => setC(blank) }
          );
        }}
        className="space-y-3 rounded-xl bg-slate-50 p-3"
      >
        <p className="text-[13px] font-medium text-slate-700">Add a contact</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" htmlFor="c-name"><input id="c-name" required maxLength={120} value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} className={inputClass} /></Field>
          <Field label="Role" htmlFor="c-role"><input id="c-role" maxLength={120} value={c.role_title} onChange={(e) => setC({ ...c, role_title: e.target.value })} className={inputClass} /></Field>
          <Field label="Email" htmlFor="c-email"><input id="c-email" type="email" maxLength={255} value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className={inputClass} /></Field>
          <Field label="LinkedIn URL" htmlFor="c-li"><input id="c-li" type="url" maxLength={2048} value={c.linkedin_url} onChange={(e) => setC({ ...c, linkedin_url: e.target.value })} className={inputClass} /></Field>
        </div>
        <Field label="Notes" htmlFor="c-notes"><textarea id="c-notes" rows={2} maxLength={10000} value={c.notes} onChange={(e) => setC({ ...c, notes: e.target.value })} className={inputClass} /></Field>
        <div className="flex justify-end">
          <button type="submit" disabled={m.add.isPending} className="rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60">Add contact</button>
        </div>
      </form>
    </div>
  );
}

function NotesTab({ appId }: { appId: string }) {
  const { data: notes = [], isLoading, error } = useNotes(appId);
  const m = useNoteMutations(appId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          m.add.mutate({ title: title.trim(), content: content.trim() }, { onSuccess: () => { setTitle(""); setContent(""); } });
        }}
        className="space-y-2"
      >
        <label htmlFor="note-title" className="sr-only">Note title</label>
        <input id="note-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className={inputClass} />
        <label htmlFor="note-body" className="sr-only">Note</label>
        <textarea id="note-body" required rows={4} maxLength={50000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Interview questions, what you talked about, salary notes…" className={inputClass} />
        <div className="flex justify-end">
          <button type="submit" disabled={m.add.isPending} className="rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60">Add note</button>
        </div>
      </form>
      <ListState loading={isLoading} error={error} empty={!notes.length} emptyText="No notes yet." />
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">{n.title || formatDate(n.created_at)}</p>
              <button type="button" onClick={() => m.remove.mutate(n.id)} aria-label="Delete note" className="rounded p-1 text-slate-400 hover:text-rose-600">
                <Trash2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{n.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryTab({ appId }: { appId: string }) {
  const { data: history = [], isLoading, error } = useHistory(appId);
  return (
    <div>
      <ListState loading={isLoading} error={error} empty={!history.length} emptyText="No history yet." />
      <ol className="space-y-3 border-l border-slate-200 pl-4">
        {[...history].reverse().map((h) => (
          <li key={h.id} className="relative text-sm">
            <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-[#0066FF]" aria-hidden />
            <p className="text-slate-900">
              {h.from_status
                ? <>Moved from {STATUS_LABEL[h.from_status as ApplicationStatus]} to <strong>{STATUS_LABEL[h.to_status as ApplicationStatus]}</strong></>
                : <>Added to <strong>{STATUS_LABEL[h.to_status as ApplicationStatus]}</strong></>}
            </p>
            <p className="text-xs text-slate-500">{new Date(h.transitioned_at).toLocaleString()}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function ApplicationDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  const app = useApplication(id);
  const [tab, setTab] = useState<Tab>("details");
  useEffect(() => setTab("details"), [id]);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "details", label: "Details" },
    { id: "tasks", label: "Tasks", count: app?.task_count },
    { id: "contacts", label: "Contacts", count: app?.contact_count },
    { id: "notes", label: "Notes", count: app?.note_count },
    { id: "ai", label: "AI" },
    { id: "history", label: "History" },
  ];

  return (
    <Dialog
      open={Boolean(id && app)}
      onClose={onClose}
      variant="drawer"
      title={app ? app.role_title : ""}
      description={app ? `${app.company_name} · ${STATUS_LABEL[app.status]}` : undefined}
    >
      {app && (
        <div key={app.id} className="space-y-4">
          <div role="tablist" aria-label="Application sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-slate-100 pb-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[13px] font-medium ${
                  tab === t.id ? "bg-blue-50 text-[#0066FF]" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t.label}
                {t.count ? <span className="ml-1 text-slate-500">{t.count}</span> : null}
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {tab === "details" && <DetailsTab app={app} onDeleted={onClose} />}
            {tab === "tasks" && <TasksTab appId={app.id} />}
            {tab === "contacts" && <ContactsTab appId={app.id} />}
            {tab === "notes" && <NotesTab appId={app.id} />}
            {tab === "ai" && <AiTab appId={app.id} label={`${app.role_title} at ${app.company_name}`} />}
            {tab === "history" && <HistoryTab appId={app.id} />}
          </div>
        </div>
      )}
    </Dialog>
  );
}
