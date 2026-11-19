"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, FileUp, Loader2 } from "lucide-react";
import { parseResumePdf, saveParsedResume, type ParsedResume } from "@/app/actions/resume-import";
import { getAiStatus } from "@/app/actions/ai";
import { fetchApplicationProfile, fetchProfile, saveApplicationProfile, updateProfile, type ApplicationProfilePatch } from "@/lib/api";
import { AiFreeTierNotice } from "@/components/AiFreeTierNotice";
import { inputClass, normalizeUrl } from "@/components/resume/fields";

const STEPS = ["Resume", "Contact", "Work authorization", "Logistics", "Self-identification", "How we help"] as const;

const WHY: Record<(typeof STEPS)[number], string> = {
  Resume: "Your resume drives job matches, tailoring and the apply kit. We read it once and you can edit everything after.",
  Contact: "Every application asks for these. Answer once and the apply kit fills them in for you.",
  "Work authorization": "Almost every form asks whether you can work in the country and whether you'll need sponsorship. We answer from what you say here, never from a guess.",
  Logistics: "Common screener questions. Your notes are used when a form asks something open-ended.",
  "Self-identification": "Optional and voluntary. Leave anything blank and the kit answers \"Prefer not to say\".",
  "How we help": "You always review and press Submit yourself. This sets how far tailoring may rephrase your bullets.",
};

const COUNTRIES = ["Canada", "United States"] as const;
const BASES = ["Citizen", "Permanent resident", "Study permit", "Work permit (PGWP, open)", "Other"];
const YES_NO = [
  { v: "", label: "Not sure" },
  { v: "yes", label: "Yes" },
  { v: "no", label: "No" },
];
const EEO: { key: "gender" | "race_ethnicity" | "indigenous" | "veteran" | "disability"; label: string; options: string[] }[] = [
  { key: "gender", label: "Gender", options: ["Woman", "Man", "Non-binary", "Another gender"] },
  { key: "race_ethnicity", label: "Race / ethnicity", options: ["Black", "East Asian", "South Asian", "Southeast Asian", "Hispanic or Latino", "Middle Eastern or North African", "White", "Two or more", "Another"] },
  { key: "indigenous", label: "Indigenous identity", options: ["First Nations", "Métis", "Inuit", "Not Indigenous"] },
  { key: "veteran", label: "Veteran status", options: ["Veteran", "Not a veteran"] },
  { key: "disability", label: "Disability", options: ["Yes, I have a disability", "No disability"] },
];

type WorkAuth = Record<string, { authorized?: boolean; needs_sponsorship?: boolean; basis?: string }>;
const toBool = (v: string) => (v === "yes" ? true : v === "no" ? false : undefined);
const fromBool = (v: boolean | null | undefined) => (v === true ? "yes" : v === false ? "no" : "");

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...rest } = props;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700">{label}</label>
      <input id={id} className={inputClass} {...rest} />
    </div>
  );
}

function Select({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  );
}

export default function OnboardingWizard({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const { data: existing, isLoading } = useQuery({ queryKey: ["application-profile"], queryFn: fetchApplicationProfile });
  const { data: ai } = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  const [contact, setContact] = useState({ full_name: "", email: "", phone: "", linkedin_url: "", github_url: "", school: "", grad_term: "" });
  const [app, setApp] = useState<ApplicationProfilePatch>({});
  const [workAuth, setWorkAuth] = useState<WorkAuth>({});

  useEffect(() => {
    if (profile)
      setContact({
        full_name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        github_url: profile.github_url ?? "",
        school: profile.school ?? "",
        grad_term: profile.grad_term ?? "",
      });
  }, [profile]);
  useEffect(() => {
    if (existing) {
      setApp(existing);
      setWorkAuth((existing.work_auth as WorkAuth) ?? {});
    }
  }, [existing]);

  // Resume step
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [replace, setReplace] = useState(false);
  const [imported, setImported] = useState<number | null>(null);

  const setA = <K extends keyof ApplicationProfilePatch>(k: K, v: ApplicationProfilePatch[K]) => setApp((p) => ({ ...p, [k]: v }));
  const setAuth = (country: string, patch: WorkAuth[string]) =>
    setWorkAuth((w) => ({ ...w, [country]: { ...w[country], ...patch } }));

  async function readResume() {
    if (!file) return;
    setParsing(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const result = await parseResumePdf(form);
    setParsing(false);
    if (result.ok) setParsed(result.data);
    else setError(result.error);
  }

  /** Saves the current step, then moves on. Every step saves, so leaving halfway keeps the answers. */
  async function advance(by: 1 | -1, finish = false) {
    setSaving(true);
    setError(null);
    try {
      const name = STEPS[step];
      if (name === "Resume" && parsed && imported == null && by === 1) {
        const r = await saveParsedResume(parsed, replace);
        if (!r.ok) throw new Error(r.error);
        setImported(r.entries);
      }
      if (name === "Contact") {
        await updateProfile({
          full_name: contact.full_name.trim(),
          email: contact.email.trim() || null,
          phone: contact.phone.trim() || null,
          linkedin_url: contact.linkedin_url.trim() ? normalizeUrl(contact.linkedin_url.trim()) : null,
          github_url: contact.github_url.trim() ? normalizeUrl(contact.github_url.trim()) : null,
          school: contact.school.trim(),
          grad_term: /^[WSF]\d{4}$/.test(contact.grad_term) ? contact.grad_term : null,
        });
      }
      if (name !== "Resume" && name !== "Contact") {
        await saveApplicationProfile({ ...app, work_auth: workAuth, ...(finish ? { onboarded_at: new Date().toISOString() } : {}) });
      }
      if (finish) {
        router.push(next);
        router.refresh();
        return;
      }
      setStep((s) => Math.min(STEPS.length - 1, Math.max(0, s + by)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function skipAll() {
    setSaving(true);
    try {
      await saveApplicationProfile({ onboarded_at: new Date().toISOString() });
      router.push(next);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mt-16 flex justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  const name = STEPS[step];
  const last = step === STEPS.length - 1;
  const year = new Date().getFullYear();

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1fr_16rem]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void advance(1, last);
        }}
        className="space-y-5 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm"
        aria-labelledby="step-title"
      >
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Step {step + 1} of {STEPS.length}
          </p>
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-accent" : "bg-slate-200"}`} />
            ))}
          </div>
          <h1 id="step-title" className="text-xl font-semibold text-slate-900">{name}</h1>
        </div>

        {name === "Resume" && (
          <div className="space-y-4">
            {imported != null ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                <Check className="h-4 w-4" aria-hidden /> Saved {imported} {imported === 1 ? "entry" : "entries"} to your resume.
              </p>
            ) : parsed ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Here&apos;s what we read. You can fix anything later on the Resume page.
                </p>
                <ul className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3 text-sm">
                  {parsed.entries.map((e, i) => (
                    <li key={i}>
                      <span className="font-medium text-slate-900">{e.title}</span>
                      {e.organization && <span className="text-slate-600">, {e.organization}</span>}
                      <span className="text-slate-500"> · {e.section}{e.bullets.length ? ` · ${e.bullets.length} bullets` : ""}</span>
                    </li>
                  ))}
                  {parsed.skills.map((s, i) => (
                    <li key={`s${i}`} className="text-slate-700">
                      <span className="font-medium">{s.heading || "Skills"}:</span> {s.content}
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                  Replace what&apos;s already on my Resume page
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="resume-file"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-600 hover:border-accent"
                >
                  <FileUp className="h-6 w-6 text-slate-500" aria-hidden />
                  {file ? <span className="font-medium text-slate-900">{file.name}</span> : "Choose your resume (PDF, up to 4 MB)"}
                </label>
                <input id="resume-file" type="file" accept="application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                {ai?.allowed === false || ai?.enabled === false ? (
                  <p className="text-sm text-slate-600">Resume reading isn&apos;t available right now. Skip this and add your resume on the Resume page.</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={readResume}
                      disabled={!file || parsing}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {parsing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      {parsing ? "Reading your resume…" : "Read my resume"}
                    </button>
                    {ai?.freeTier && <AiFreeTierNotice />}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {name === "Contact" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput id="full_name" label="Full name" value={contact.full_name} maxLength={120} autoComplete="name" onChange={(e) => setContact({ ...contact, full_name: e.target.value })} />
            <TextInput id="email" label="Email for applications" type="email" value={contact.email} maxLength={255} autoComplete="email" onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <TextInput id="phone" label="Phone" type="tel" value={contact.phone} maxLength={40} autoComplete="tel" onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <TextInput id="linkedin" label="LinkedIn" value={contact.linkedin_url} maxLength={300} placeholder="linkedin.com/in/you" onChange={(e) => setContact({ ...contact, linkedin_url: e.target.value })} />
            <TextInput id="github" label="GitHub or portfolio" value={contact.github_url} maxLength={300} placeholder="github.com/you" onChange={(e) => setContact({ ...contact, github_url: e.target.value })} />
            <TextInput id="school" label="School" value={contact.school} maxLength={160} onChange={(e) => setContact({ ...contact, school: e.target.value })} />
            <Select
              id="grad_term"
              label="Expected graduation"
              value={contact.grad_term}
              onChange={(v) => setContact({ ...contact, grad_term: v })}
              options={[
                { v: "", label: "Choose…" },
                ...Array.from({ length: 6 }, (_, i) => year - 1 + i).flatMap((y) =>
                  (["W", "S", "F"] as const).map((t) => ({ v: `${t}${y}`, label: `${{ W: "Winter", S: "Summer", F: "Fall" }[t]} ${y}` }))
                ),
              ]}
            />
          </div>
        )}

        {name === "Work authorization" && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput id="street" label="Street address" value={app.street ?? ""} maxLength={200} autoComplete="street-address" onChange={(e) => setA("street", e.target.value)} />
              <TextInput id="city" label="City" value={app.city ?? ""} maxLength={120} autoComplete="address-level2" onChange={(e) => setA("city", e.target.value)} />
              <TextInput id="region" label="Province / state" value={app.region ?? ""} maxLength={120} autoComplete="address-level1" onChange={(e) => setA("region", e.target.value)} />
              <TextInput id="postal" label="Postal code" value={app.postal_code ?? ""} maxLength={20} autoComplete="postal-code" onChange={(e) => setA("postal_code", e.target.value)} />
            </div>
            {COUNTRIES.map((c) => (
              <fieldset key={c} className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-3">
                <legend className="px-1 text-sm font-medium text-slate-800">{c}</legend>
                <Select id={`${c}-auth`} label="Legally allowed to work?" value={fromBool(workAuth[c]?.authorized)} onChange={(v) => setAuth(c, { authorized: toBool(v) })} options={YES_NO} />
                <Select id={`${c}-spons`} label="Need visa sponsorship?" value={fromBool(workAuth[c]?.needs_sponsorship)} onChange={(v) => setAuth(c, { needs_sponsorship: toBool(v) })} options={YES_NO} />
                <Select id={`${c}-basis`} label="On what basis?" value={workAuth[c]?.basis ?? ""} onChange={(v) => setAuth(c, { basis: v || undefined })} options={[{ v: "", label: "—" }, ...BASES.map((b) => ({ v: b, label: b }))]} />
              </fieldset>
            ))}
          </div>
        )}

        {name === "Logistics" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Select id="relocate" label="Willing to relocate?" value={fromBool(app.willing_to_relocate)} onChange={(v) => setA("willing_to_relocate", toBool(v) ?? null)} options={YES_NO} />
            <Select id="in_person" label="OK with in-person or hybrid work?" value={fromBool(app.in_person_ok)} onChange={(v) => setA("in_person_ok", toBool(v) ?? null)} options={YES_NO} />
            <TextInput id="start" label="Earliest start" value={app.earliest_start ?? ""} maxLength={40} placeholder="May 2027" onChange={(e) => setA("earliest_start", e.target.value)} />
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="notes" className="block text-[13px] font-medium text-slate-700">Anything else applications should know</label>
              <textarea id="notes" rows={3} maxLength={2000} value={app.notes ?? ""} onChange={(e) => setA("notes", e.target.value)} className={`${inputClass} resize-y`} placeholder="Co-op program, term length, preferred name…" />
            </div>
          </div>
        )}

        {name === "Self-identification" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {EEO.map((q) => (
              <Select
                key={q.key}
                id={q.key}
                label={q.label}
                value={app[q.key] ?? ""}
                onChange={(v) => setA(q.key, v || null)}
                options={[{ v: "", label: "Prefer not to say" }, ...q.options.map((o) => ({ v: o, label: o }))]}
              />
            ))}
          </div>
        )}

        {name === "How we help" && (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-slate-800">Resume tailoring</legend>
            {([
              ["off", "Off", "Use my resume as written."],
              ["honest", "Honest (recommended)", "Reorder and reword my bullets in the job's language. Never adds anything I didn't write."],
              ["bold", "Bold", "Rewrite more freely for impact. Still never invents facts, and you review every change."],
            ] as const).map(([v, label, hint]) => (
              <label key={v} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${(app.tailoring ?? "honest") === v ? "border-accent ring-2 ring-accent/15" : "border-slate-200"}`}>
                <input type="radio" name="tailoring" value={v} checked={(app.tailoring ?? "honest") === v} onChange={() => setA("tailoring", v)} className="mt-1" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{label}</span>
                  <span className="block text-[13px] text-slate-600">{hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => advance(-1)} disabled={step === 0 || saving} className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 disabled:invisible">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          <div className="flex items-center gap-3">
            {step === 0 && (
              <button type="button" onClick={skipAll} disabled={saving} className="text-sm text-slate-500 underline-offset-2 hover:underline">
                Skip setup for now
              </button>
            )}
            <button type="submit" disabled={saving || parsing} className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {last ? "Finish" : name === "Resume" && parsed && imported == null ? "Save and continue" : "Continue"}
              {!last && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </form>

      <aside className="h-fit rounded-2xl bg-slate-50 p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Why we ask</p>
        <p className="mt-1.5 leading-relaxed">{WHY[name]}</p>
      </aside>
    </div>
  );
}
