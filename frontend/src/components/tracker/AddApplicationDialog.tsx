"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Link2, Loader2 } from "lucide-react";
import Dialog from "../ui/Dialog";
import { COLUMNS } from "@/lib/board";
import { useCreateApplication } from "@/lib/tracker-hooks";
import { lookupJobUrl, type JobPrefill } from "@/app/actions/job-url";
import type { ApplicationStatus } from "@/types";

type Form = {
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  job_location: string;
  work_model: "" | "REMOTE" | "HYBRID" | "ONSITE";
  job_url: string;
  deadline_at: string;
  follow_up_at: string;
};

const empty = (status: ApplicationStatus): Form => ({
  company_name: "",
  role_title: "",
  status,
  job_location: "",
  work_model: "",
  job_url: "",
  deadline_at: "",
  follow_up_at: "",
});

export const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20";

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function AddApplicationDialog({
  status,
  onClose,
  topPosition,
}: {
  status: ApplicationStatus | null;
  onClose: () => void;
  topPosition: (status: ApplicationStatus) => number;
}) {
  const create = useCreateApplication();
  const [form, setForm] = useState<Form>(empty("APPLIED"));
  const [link, setLink] = useState("");
  const [lookupMsg, setLookupMsg] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [extra, setExtra] = useState<Pick<JobPrefill, "job_id" | "description">>({});
  const [looking, startLookup] = useTransition();

  useEffect(() => {
    if (status) {
      setForm(empty(status));
      setLink("");
      setLookupMsg(null);
      setExtra({});
    }
  }, [status]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const lookup = () =>
    startLookup(async () => {
      setLookupMsg(null);
      const result = await lookupJobUrl(link);
      if (result.kind === "found") {
        const p = result.prefill;
        setForm((f) => ({
          ...f,
          company_name: p.company_name,
          role_title: p.role_title,
          job_location: p.job_location ?? "",
          work_model: p.work_model ?? "",
          job_url: p.job_url,
        }));
        setExtra({ job_id: p.job_id, description: p.description });
        setLookupMsg({
          text: result.fromFeed ? "Found it in the jobs feed. Check the details below." : "Filled in from the company's job board. Check the details below.",
          tone: "ok",
        });
      } else {
        set("job_url", link.trim());
        setLookupMsg({
          text:
            result.kind === "unsupported"
              ? "We can only read Greenhouse, Lever and Ashby links. Fill in the details yourself; the link is saved."
              : result.message,
          tone: "warn",
        });
      }
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      {
        company_name: form.company_name.trim(),
        role_title: form.role_title.trim(),
        status: form.status,
        job_location: form.job_location.trim() || undefined,
        work_model: form.work_model || undefined,
        job_url: /^https?:\/\//i.test(form.job_url.trim()) ? form.job_url.trim() : undefined,
        deadline_at: form.deadline_at || null,
        follow_up_at: form.follow_up_at || null,
        job_id: extra.job_id,
        description: extra.description,
        position: topPosition(form.status),
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open={status !== null} onClose={onClose} title="Add application">
      <div className="space-y-4">
        <div className="space-y-1.5 rounded-xl bg-slate-50 p-3">
          <label htmlFor="paste-link" className="block text-[13px] font-medium text-slate-700">
            Paste a job link (optional)
          </label>
          <div className="flex gap-2">
            <input
              id="paste-link"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (link.trim()) lookup();
                }
              }}
              placeholder="https://jobs.lever.co/…"
              className={inputClass}
            />
            <button
              type="button"
              onClick={lookup}
              disabled={!link.trim() || looking}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {looking ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
              Fill in
            </button>
          </div>
          {lookupMsg && (
            <p role="status" className={`text-[13px] ${lookupMsg.tone === "ok" ? "text-emerald-700" : "text-amber-800"}`}>
              {lookupMsg.text}
            </p>
          )}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Company" htmlFor="add-company">
              <input id="add-company" required maxLength={200} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Role" htmlFor="add-role">
              <input id="add-role" required maxLength={200} value={form.role_title} onChange={(e) => set("role_title", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Status" htmlFor="add-status">
              <select id="add-status" value={form.status} onChange={(e) => set("status", e.target.value as ApplicationStatus)} className={inputClass}>
                {COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Work model" htmlFor="add-model">
              <select id="add-model" value={form.work_model} onChange={(e) => set("work_model", e.target.value as Form["work_model"])} className={inputClass}>
                <option value="">Not sure</option>
                <option value="ONSITE">On-site</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </Field>
            <Field label="Location" htmlFor="add-location">
              <input id="add-location" maxLength={200} value={form.job_location} onChange={(e) => set("job_location", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Posting link" htmlFor="add-url">
              <input id="add-url" type="url" maxLength={2048} value={form.job_url} onChange={(e) => set("job_url", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Application deadline" htmlFor="add-deadline">
              <input id="add-deadline" type="date" value={form.deadline_at} onChange={(e) => set("deadline_at", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Follow up on" htmlFor="add-follow">
              <input id="add-follow" type="date" value={form.follow_up_at} onChange={(e) => set("follow_up_at", e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Add
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}
