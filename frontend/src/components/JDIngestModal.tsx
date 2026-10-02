"use client";

import React, { useState } from "react";
import { ingestJobDescription, scrapeJobURL } from "../lib/api";
import {
  X,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Loader2,
  CheckCircle2,
  Globe,
  Bot,
  Terminal,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function JDIngestModal({ isOpen, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<"text" | "url">("text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapedPreview, setScrapedPreview] = useState<{
    title: string;
    content: string;
    char_count: number;
    method: string;
  } | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleTestScrape = async () => {
    if (!url.trim()) return;
    setScraping(true);
    setErrorMsg("");
    try {
      const res = await scrapeJobURL(url.trim());
      setScrapedPreview(res);
      // Automatically prefill text if the user wants to inspect or switch
      setText(res.content);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to execute headless browser scrape");
    } finally {
      setScraping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const payload = tab === "url" ? { url } : { text };
      const res = await ingestJobDescription(payload);
      setSuccessMsg(res.message || "Job queued for zero-shot LLM parsing!");
      setTimeout(() => {
        onSuccess();
        onClose();
        setUrl("");
        setText("");
        setScrapedPreview(null);
        setSuccessMsg("");
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to ingest job description");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#0066FF]" />
              Import Job Description
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste a job link or description to automatically extract key role requirements and match with your profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab("text")}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
              tab === "text" ? "bg-white text-[#0066FF] shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            Paste Job Text
          </button>
          <button
            type="button"
            onClick={() => setTab("url")}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 transition ${
              tab === "url" ? "bg-white text-[#0066FF] shadow-xs font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            Import from Link
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "text" ? (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Job Description Text
              </label>
              <textarea
                required
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Stripe is looking for a Backend Engineer Intern in Seattle. Requirements: Go, Python, PostgreSQL, Redis..."
                className="w-full rounded-xl bg-white border border-slate-200 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none resize-none font-sans shadow-xs"
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    Job Posting URL
                  </label>
                  <span className="text-[10px] text-[#0066FF] flex items-center gap-1 font-medium">
                    <Bot className="h-3 w-3" />
                    Automated Link Reader
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    required
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://jobs.lever.co/company/role-id"
                    className="flex-1 rounded-xl bg-white border border-slate-200 focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] p-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    disabled={scraping || !url.trim()}
                    onClick={handleTestScrape}
                    className="px-3.5 py-2 rounded-xl text-xs font-mono font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 disabled:opacity-40 transition flex items-center gap-1.5 shrink-0"
                    title="Test scraping with link reader before ingesting"
                  >
                    {scraping ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Terminal className="h-3.5 w-3.5" />
                    )}
                    <span>Preview</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports client-side rendered boards: Greenhouse, Lever, Workday, LinkedIn, Ashby.
                </p>
              </div>

              {/* Live Preview Box */}
              {scrapedPreview && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                    <span className="text-emerald-700 font-semibold truncate max-w-[240px]">
                      {scrapedPreview.title}
                    </span>
                    <span className="text-slate-500">
                      {scrapedPreview.char_count} chars • {scrapedPreview.method}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono max-h-28 overflow-y-auto whitespace-pre-wrap p-2.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                    {scrapedPreview.content.slice(0, 500)}...
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white shadow-xs disabled:opacity-50 transition flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Enqueuing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Parse & Match</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
