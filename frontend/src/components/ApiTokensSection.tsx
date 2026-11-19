"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { createApiToken, listApiTokens, revokeApiToken } from "@/app/actions/api-tokens";
import { useToast } from "@/components/ui/Toast";

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" }) : "Never");

/** Personal API tokens for the Trackr Chrome extension. */
export default function ApiTokensSection() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: tokens = [] } = useQuery({ queryKey: ["api-tokens"], queryFn: () => listApiTokens() });
  const [name, setName] = useState("Chrome extension");
  const [created, setCreated] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["api-tokens"] });

  const create = useMutation({
    mutationFn: () => createApiToken(name),
    onSuccess: (res) => {
      if (!res.ok) return toast(res.error);
      setCreated(res.token);
      refresh();
    },
  });
  const revoke = useMutation({ mutationFn: (id: string) => revokeApiToken(id), onSuccess: refresh });

  return (
    <section aria-labelledby="api-tokens-heading" className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-surface p-6 shadow-sm">
      <div>
        <h2 id="api-tokens-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <KeyRound className="h-4 w-4" aria-hidden /> Extension tokens
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          The Trackr Chrome extension uses a token to fill Greenhouse, Lever and Ashby forms from your profile and apply kit. You still press Submit.
        </p>
      </div>

      {created && (
        <div role="status" className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          <p>Copy this token into the extension now. It won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 break-all rounded-lg bg-surface px-2 py-1 text-[13px] text-slate-900" aria-label="New token">{created}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(created).then(() => toast("Copied"))}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-emerald-900 hover:bg-emerald-100"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
            </button>
          </div>
        </div>
      )}

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="token-name" className="block text-sm font-medium text-slate-700">Token name</label>
          <input
            id="token-name"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <button
          type="submit"
          disabled={create.isPending}
          className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {create.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Create token
        </button>
      </form>

      {tokens.length > 0 && (
        <ul aria-label="Your tokens" className="divide-y divide-slate-200 rounded-xl border border-slate-200">
          {tokens.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-slate-900">{t.name}</span>
                <span className="block text-[13px] text-slate-500">Created {when(t.created_at)} · Last used {when(t.last_used_at)}</span>
              </span>
              <button
                type="button"
                aria-label={`Revoke ${t.name}`}
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(t.id)}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
