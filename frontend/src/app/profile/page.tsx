"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { fetchProfile, updateProfile } from "../../lib/api";
import { Profile } from "../../types";

const CANADIAN_UNIVERSITIES = [
  "University of British Columbia (UBC)",
  "Simon Fraser University (SFU)",
  "University of Victoria (UVic)",
  "University of Alberta (U of A)",
  "University of Calgary (U of C)",
  "University of Waterloo",
  "University of Toronto",
  "McGill University",
  "McMaster University",
];

const PROVINCES: { code: string; label: string }[] = [
  { code: "BC", label: "British Columbia" },
  { code: "AB", label: "Alberta" },
  { code: "SK", label: "Saskatchewan" },
  { code: "MB", label: "Manitoba" },
  { code: "ON", label: "Ontario" },
  { code: "QC", label: "Quebec" },
  { code: "NS", label: "Nova Scotia" },
  { code: "NB", label: "New Brunswick" },
];

const TERMS = [
  { code: "W", label: "Winter" },
  { code: "S", label: "Summer" },
  { code: "F", label: "Fall" },
];

type FormState = {
  full_name: string;
  school: string;
  grad_season: string;
  grad_year: string;
  target_roles: string;
  target_provinces: string[];
};

function toForm(p: Profile): FormState {
  return {
    full_name: p.full_name,
    school: p.school,
    grad_season: p.grad_term?.[0] ?? "",
    grad_year: p.grad_term?.slice(1) ?? "",
    target_roles: p.target_roles.join(", "),
    target_provinces: p.target_provinces,
  };
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(toForm(profile));
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: (f: FormState) =>
      updateProfile({
        full_name: f.full_name.trim(),
        school: f.school.trim(),
        grad_term: f.grad_season && f.grad_year ? `${f.grad_season}${f.grad_year}` : null,
        target_roles: f.target_roles
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean),
        target_provinces: f.target_provinces,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["profile"], updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isError) {
    return (
      <p role="alert" className="mx-auto mt-10 max-w-xl text-sm text-red-700">
        Couldn&apos;t load your profile: {(error as Error).message}
      </p>
    );
  }

  if (isLoading || !form) {
    return (
      <div className="mt-16 flex justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading profile" />
      </div>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const currentYear = new Date().getFullYear();
  const inputClass =
    "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveMutation.mutate(form);
      }}
      className="mx-auto max-w-xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">
          Used to set your default filters on the jobs feed.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="full_name" className="block text-sm font-medium text-slate-700">
          Name
        </label>
        <input
          id="full_name"
          value={form.full_name}
          maxLength={120}
          onChange={(e) => set("full_name", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="school" className="block text-sm font-medium text-slate-700">
          School
        </label>
        <input
          id="school"
          list="schools"
          value={form.school}
          maxLength={160}
          onChange={(e) => set("school", e.target.value)}
          className={inputClass}
        />
        <datalist id="schools">
          {CANADIAN_UNIVERSITIES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </div>

      <fieldset className="space-y-1.5">
        <legend className="block text-sm font-medium text-slate-700">Expected graduation</legend>
        <div className="flex gap-3">
          <label className="sr-only" htmlFor="grad_season">
            Term
          </label>
          <select
            id="grad_season"
            value={form.grad_season}
            onChange={(e) => set("grad_season", e.target.value)}
            className={inputClass}
          >
            <option value="">Term</option>
            {TERMS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="grad_year">
            Year
          </label>
          <select
            id="grad_year"
            value={form.grad_year}
            onChange={(e) => set("grad_year", e.target.value)}
            className={inputClass}
          >
            <option value="">Year</option>
            {Array.from({ length: 7 }, (_, i) => String(currentYear - 1 + i)).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <label htmlFor="target_roles" className="block text-sm font-medium text-slate-700">
          Target roles
        </label>
        <input
          id="target_roles"
          value={form.target_roles}
          placeholder="Software engineering, Data, Hardware"
          onChange={(e) => set("target_roles", e.target.value)}
          className={inputClass}
          aria-describedby="target_roles_hint"
        />
        <p id="target_roles_hint" className="text-xs text-slate-500">
          Separate with commas.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-slate-700">Target provinces</legend>
        <div className="flex flex-wrap gap-2">
          {PROVINCES.map((p) => {
            const checked = form.target_provinces.includes(p.code);
            return (
              <label
                key={p.code}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-sm ${
                  checked
                    ? "border-[#0066FF] bg-blue-50 text-[#0066FF]"
                    : "border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    set(
                      "target_provinces",
                      checked
                        ? form.target_provinces.filter((c) => c !== p.code)
                        : [...form.target_provinces, p.code]
                    )
                  }
                />
                {p.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-[#0066FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0052cc] disabled:opacity-60"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="h-4 w-4" aria-hidden />
          )}
          Save
        </button>
        <span role="status" className="text-sm">
          {saved && <span className="text-emerald-700">Saved</span>}
          {saveMutation.isError && (
            <span className="text-red-600">{(saveMutation.error as Error).message}</span>
          )}
        </span>
      </div>
    </form>
  );
}
