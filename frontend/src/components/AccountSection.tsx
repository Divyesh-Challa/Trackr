"use client";

import React, { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { deleteMyAccount, exportMyData } from "@/lib/api";
import { useToast } from "./ui/Toast";
import Dialog from "./ui/Dialog";

export default function AccountSection() {
  const toast = useToast();
  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `trackr-my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setExporting(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      window.location.assign("/?deleted=1");
    } catch (err) {
      toast((err as Error).message, "error");
      setDeleting(false);
    }
  };

  return (
    <section aria-labelledby="your-data" className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 id="your-data" className="text-lg font-semibold text-slate-900">Your data</h2>
        <p className="mt-1 text-sm text-slate-600">
          Download everything Trackr stores about you, or delete your account. See the{" "}
          <a href="/privacy" className="text-[#0066FF] underline">privacy policy</a>.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          Download my data
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> Delete account
        </button>
      </div>

      <Dialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setTyped("");
        }}
        title="Delete your account?"
        description="This permanently deletes your profile, applications, tasks, contacts and notes. It can't be undone."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (typed === "DELETE") remove();
          }}
          className="space-y-3"
        >
          <label htmlFor="confirm-delete" className="block text-sm text-slate-700">
            Type <strong>DELETE</strong> to confirm.
          </label>
          <input
            id="confirm-delete"
            autoComplete="off"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={typed !== "DELETE" || deleting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Delete forever
            </button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
