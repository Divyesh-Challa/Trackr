"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "./supabase/client";
import { useToast } from "../components/ui/Toast";
import type { ResumeBulletRow, ResumeContact, ResumeEntryRow } from "./resume";

export const resumeKeys = {
  data: ["resume"] as const,
};

export type ResumeData = {
  contact: ResumeContact & { id: string };
  entries: ResumeEntryRow[];
  bullets: ResumeBulletRow[];
};

async function loadResume(): Promise<ResumeData> {
  const sb = createClient();
  const [{ data: profile, error: e1 }, { data: entries, error: e2 }, { data: bullets, error: e3 }] = await Promise.all([
    sb.from("profiles").select("id, full_name, email, phone, location, linkedin_url, github_url, website_url").single(),
    sb.from("resume_entries").select("id, section, title, organization, location, start_date, end_date, tech, details, position").order("position"),
    sb.from("resume_bullets").select("id, entry_id, section, heading, content, position").order("position"),
  ]);
  const err = e1 ?? e2 ?? e3;
  if (err) throw new Error(err.message);
  return {
    contact: { ...profile!, name: profile!.full_name },
    entries: (entries ?? []) as ResumeEntryRow[],
    bullets: (bullets ?? []) as ResumeBulletRow[],
  };
}

export function useResume() {
  return useQuery({ queryKey: resumeKeys.data, queryFn: loadResume });
}

/**
 * Field edits patch the cached resume in place (`patch`), so an in-flight refetch can't
 * reset what the user is typing elsewhere; structural changes (add, delete) refetch.
 */
function useResumeMutation<V>(
  fn: (v: V) => PromiseLike<{ error: { message: string } | null }>,
  failure: string,
  patch?: (data: ResumeData, v: V) => ResumeData
) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: async (v: V) => {
      const { error } = await fn(v);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_r, v) => {
      if (patch) qc.setQueryData<ResumeData>(resumeKeys.data, (d) => (d ? patch(d, v) : d));
      else qc.invalidateQueries({ queryKey: resumeKeys.data });
    },
    onError: (err: Error) =>
      toast(err.message.includes("check constraint") ? `${failure}: check the format (links must start with https://)` : `${failure}: ${err.message}`, "error"),
  });
}

export type ContactPatch = { full_name?: string } & Partial<Record<"email" | "phone" | "location" | "linkedin_url" | "github_url" | "website_url", string | null>>;
export type EntryPatch = Partial<Omit<ResumeEntryRow, "id" | "section">>;
export type BulletPatch = Partial<Pick<ResumeBulletRow, "content" | "heading" | "position" | "entry_id">>;
export type NewBullet = { entry_id: string | null; section: string; heading?: string; content: string; position: number };

export function useResumeMutations() {
  const sb = createClient();
  return {
    saveContact: useResumeMutation(
      ({ id, patch }: { id: string; patch: ContactPatch }) => sb.from("profiles").update(patch).eq("id", id),
      "Couldn't save your details",
      (d, { patch }) => ({
        ...d,
        contact: { ...d.contact, ...patch, name: patch.full_name ?? d.contact.name } as ResumeData["contact"],
      })
    ),
    addEntry: useResumeMutation(
      (v: { section: ResumeEntryRow["section"]; title: string; position: number }) => sb.from("resume_entries").insert(v),
      "Couldn't add it"
    ),
    updateEntry: useResumeMutation(
      ({ id, patch }: { id: string; patch: EntryPatch }) => sb.from("resume_entries").update(patch).eq("id", id),
      "Couldn't save",
      (d, { id, patch }) => ({ ...d, entries: d.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
    ),
    deleteEntry: useResumeMutation((id: string) => sb.from("resume_entries").delete().eq("id", id), "Couldn't delete it"),
    addBullets: useResumeMutation((rows: NewBullet[]) => sb.from("resume_bullets").insert(rows), "Couldn't add the bullet"),
    updateBullet: useResumeMutation(
      ({ id, patch }: { id: string; patch: BulletPatch }) => sb.from("resume_bullets").update(patch).eq("id", id),
      "Couldn't save the bullet",
      (d, { id, patch }) => ({ ...d, bullets: d.bullets.map((b) => (b.id === id ? { ...b, ...patch } : b)) })
    ),
    deleteBullet: useResumeMutation((id: string) => sb.from("resume_bullets").delete().eq("id", id), "Couldn't delete the bullet"),
    // Turns a group of older, entry-less bullets (grouped by heading) into an entry.
    importGroup: useResumeMutation(
      async (v: { section: ResumeEntryRow["section"]; title: string; position: number; bulletIds: string[] }) => {
        const { data, error } = await sb
          .from("resume_entries")
          .insert({ section: v.section, title: v.title, position: v.position })
          .select("id")
          .single();
        if (error) return { error };
        return sb.from("resume_bullets").update({ entry_id: data.id, section: v.section }).in("id", v.bulletIds);
      },
      "Couldn't move those bullets"
    ),
  };
}
