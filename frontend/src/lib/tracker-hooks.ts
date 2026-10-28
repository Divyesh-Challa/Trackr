"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import {
  createApplication,
  createContact,
  createNote,
  createTask,
  deleteApplication,
  deleteContact,
  deleteNote,
  deleteTask,
  fetchAllTransitions,
  fetchApplications,
  fetchContacts,
  fetchNotes,
  fetchTasks,
  fetchTransitions,
  moveApplication,
  toggleTask,
  updateApplication,
  type ApplicationPatch,
} from "./api";
import { STATUS_LABEL } from "./board";
import { useToast } from "../components/ui/Toast";
import type { Application, ApplicationStatus } from "../types";

export const keys = {
  applications: ["applications"] as const,
  tasks: (id: string) => ["applications", id, "tasks"] as const,
  contacts: (id: string) => ["applications", id, "contacts"] as const,
  notes: (id: string) => ["applications", id, "notes"] as const,
  history: (id: string) => ["applications", id, "history"] as const,
  allHistory: ["transitions"] as const,
};

export function useApplications() {
  return useQuery({ queryKey: keys.applications, queryFn: fetchApplications });
}

/** The live copy of one application from the board cache (never a stale snapshot). */
export function useApplication(id: string | null): Application | undefined {
  const { data } = useApplications();
  return id ? data?.find((a) => a.id === id) : undefined;
}

function celebrate() {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confetti({ particleCount: 90, spread: 75, origin: { y: 0.6 } });
}

function patchCache(qc: QueryClient, id: string, patch: Partial<Application>) {
  qc.setQueryData<Application[]>(keys.applications, (old = []) =>
    old.map((a) => (a.id === id ? { ...a, ...patch } : a))
  );
}

export function useMoveApplication() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, status, position }: { id: string; status: ApplicationStatus; position?: number }) =>
      moveApplication(id, status, position),
    onMutate: async ({ id, status, position }) => {
      await qc.cancelQueries({ queryKey: keys.applications, exact: true });
      const previous = qc.getQueryData<Application[]>(keys.applications);
      const before = previous?.find((a) => a.id === id);
      patchCache(qc, id, { status, ...(position !== undefined ? { position } : {}) });
      if (status === "OFFER" && before?.status !== "OFFER") celebrate();
      return { previous, statusChanged: before?.status !== status };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.applications, ctx.previous);
      toast(`Couldn't move it: ${err.message}`, "error");
    },
    onSuccess: (saved, { status }, ctx) => {
      patchCache(qc, saved.id, saved);
      if (ctx?.statusChanged) toast(`Moved to ${STATUS_LABEL[status]}`);
      qc.invalidateQueries({ queryKey: keys.history(saved.id) });
      qc.invalidateQueries({ queryKey: keys.allHistory });
    },
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: createApplication,
    onSuccess: (created) => {
      qc.setQueryData<Application[]>(keys.applications, (old = []) => [created, ...old]);
      qc.invalidateQueries({ queryKey: keys.allHistory });
      toast(`Added ${created.company_name}`);
    },
    onError: (err: Error) => {
      if (err.message.includes("free_plan_limit")) {
        toast("The free plan tracks up to 50 active applications. Move finished ones to Rejected or Withdrawn, or upgrade.", "info", {
          label: "See Pro",
          run: () => window.location.assign("/pricing"),
        });
        return;
      }
      toast(
        err.message.includes("duplicate key") ? "That job is already on your board." : `Couldn't add it: ${err.message}`,
        "error"
      );
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ApplicationPatch }) => updateApplication(id, patch),
    onSuccess: (saved) => {
      patchCache(qc, saved.id, saved);
      toast("Saved");
    },
    onError: (err: Error) => toast(`Couldn't save: ${err.message}`, "error"),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: keys.applications, exact: true });
      const previous = qc.getQueryData<Application[]>(keys.applications);
      qc.setQueryData<Application[]>(keys.applications, (old = []) => old.filter((a) => a.id !== id));
      return { previous };
    },
    onError: (err: Error, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.applications, ctx.previous);
      toast(`Couldn't delete it: ${err.message}`, "error");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.allHistory });
      toast("Application deleted", "info");
    },
  });
}

// --- Tasks, contacts, notes, history (keyed by application id) --------------

export function useTasks(appId: string) {
  return useQuery({ queryKey: keys.tasks(appId), queryFn: () => fetchTasks(appId) });
}
export function useContacts(appId: string) {
  return useQuery({ queryKey: keys.contacts(appId), queryFn: () => fetchContacts(appId) });
}
export function useNotes(appId: string) {
  return useQuery({ queryKey: keys.notes(appId), queryFn: () => fetchNotes(appId) });
}
export function useHistory(appId: string) {
  return useQuery({ queryKey: keys.history(appId), queryFn: () => fetchTransitions(appId) });
}
export function useAllHistory() {
  return useQuery({ queryKey: keys.allHistory, queryFn: fetchAllTransitions });
}

/** Mutation that refreshes one child list plus the board (whose cards show counts). */
function useChildMutation<V>(fn: (v: V) => Promise<unknown>, listKey: readonly unknown[], failure: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey, exact: true });
      qc.invalidateQueries({ queryKey: keys.applications, exact: true });
    },
    onError: (err: Error) => toast(`${failure}: ${err.message}`, "error"),
  });
}

export function useTaskMutations(appId: string) {
  const k = keys.tasks(appId);
  return {
    add: useChildMutation((v: { title: string; due?: string }) => createTask(appId, v.title, v.due), k, "Couldn't add the task"),
    toggle: useChildMutation((v: { id: string; done: boolean }) => toggleTask(v.id, v.done), k, "Couldn't update the task"),
    remove: useChildMutation((id: string) => deleteTask(id), k, "Couldn't delete the task"),
  };
}

export function useContactMutations(appId: string) {
  const k = keys.contacts(appId);
  return {
    add: useChildMutation((v: Parameters<typeof createContact>[1]) => createContact(appId, v), k, "Couldn't add the contact"),
    remove: useChildMutation((id: string) => deleteContact(id), k, "Couldn't delete the contact"),
  };
}

export function useNoteMutations(appId: string) {
  const k = keys.notes(appId);
  return {
    add: useChildMutation((v: { title: string; content: string }) => createNote(appId, v), k, "Couldn't add the note"),
    remove: useChildMutation((id: string) => deleteNote(id), k, "Couldn't delete the note"),
  };
}
