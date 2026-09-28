"use client";

import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchResumeBullets,
  createResumeBullet,
  uploadResumeFile,
  deleteResumeBullet,
  fetchDiscoveredJobs,
  tailorResume,
  generateCoverLetter,
  TailoredResumeData,
  CoverLetterData,
} from "../../lib/api";
import { ResumeBullet, DiscoveredJob } from "../../types";
import JakesResumePreview from "@/components/JakesResumePreview";
import {
  FileText,
  UploadCloud,
  Plus,
  Trash2,
  Sparkles,
  Layers,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Loader2,
  Copy,
  Check,
  Building,
  Briefcase,
  Target,
  Wand2,
  Mail,
  Printer,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function ResumePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab switcher
  const [activeTab, setActiveTab] = useState<"TAILOR" | "COVER_LETTER" | "BULLETS">("TAILOR");

  // Fetch jobs for target job selector
  const { data: discoveredJobs = [] } = useQuery({
    queryKey: ["discoveredJobsForTailor"],
    queryFn: () => fetchDiscoveredJobs({ province: "ALL" }),
  });

  // ---------------------------------------------------------------------------
  // TAB 1: TAILOR RESUME (JAKE'S TEMPLATE) STATE
  // ---------------------------------------------------------------------------
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [customCompany, setCustomCompany] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customJD, setCustomJD] = useState("");
  const [tailorResult, setTailorResult] = useState<TailoredResumeData | null>(null);

  // When a job is picked from dropdown, fill in defaults
  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    if (!jobId) {
      setCustomCompany("");
      setCustomRole("");
      setCustomJD("");
      return;
    }
    const found = discoveredJobs.find((j) => j.id === jobId);
    if (found) {
      setCustomCompany(found.company_name);
      setCustomRole(found.role_title);
      setCustomJD(found.description || `${found.role_title} at ${found.company_name} in ${found.city}, ${found.province}. Requirements: ${found.requirements?.join(", ") || ""}`);
    }
  };

  const tailorMutation = useMutation({
    mutationFn: () =>
      tailorResume({
        company_name: customCompany || "Target Company",
        role_title: customRole || "Software Engineer Intern",
        job_description: customJD || "Software development internship",
      }),
    onSuccess: (data) => {
      setTailorResult(data);
    },
  });

  // ---------------------------------------------------------------------------
  // TAB 2: COVER LETTER GENERATOR STATE
  // ---------------------------------------------------------------------------
  const [clJobId, setClJobId] = useState<string>("");
  const [clCompany, setClCompany] = useState("");
  const [clRole, setClRole] = useState("");
  const [clJD, setClJD] = useState("");
  const [clHiringManager, setClHiringManager] = useState("");
  const [clInitiative, setClInitiative] = useState("");
  const [clResult, setClResult] = useState<CoverLetterData | null>(null);
  const [clCopied, setClCopied] = useState(false);

  const handleClJobSelect = (jobId: string) => {
    setClJobId(jobId);
    if (!jobId) {
      setClCompany("");
      setClRole("");
      setClJD("");
      return;
    }
    const found = discoveredJobs.find((j) => j.id === jobId);
    if (found) {
      setClCompany(found.company_name);
      setClRole(found.role_title);
      setClJD(found.description || `${found.role_title} at ${found.company_name}`);
    }
  };

  const coverLetterMutation = useMutation({
    mutationFn: () =>
      generateCoverLetter({
        company_name: clCompany || "Target Company",
        role_title: clRole || "Software Engineer Intern",
        job_description: clJD,
        hiring_manager_name: clHiringManager.trim() || undefined,
        company_initiative: clInitiative.trim() || undefined,
      }),
    onSuccess: (data) => {
      setClResult(data);
    },
  });

  const handleCopyCoverLetter = async () => {
    if (!clResult?.content) return;
    await navigator.clipboard.writeText(clResult.content);
    setClCopied(true);
    setTimeout(() => setClCopied(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // TAB 3: BULLET LIBRARY STATE
  // ---------------------------------------------------------------------------
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("EXPERIENCE");
  const [content, setContent] = useState("");
  const [formSuccessMsg, setFormSuccessMsg] = useState("");
  const [formErrorMsg, setFormErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState("");
  const [uploadErrorMsg, setUploadErrorMsg] = useState("");

  const { data: bullets = [], isLoading: bulletsLoading } = useQuery({
    queryKey: ["resumeBullets"],
    queryFn: fetchResumeBullets,
  });

  const createBulletMutation = useMutation({
    mutationFn: (newBullet: { category: string; content: string }) =>
      createResumeBullet(newBullet.category, newBullet.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
      setContent("");
      setFormErrorMsg("");
      setFormSuccessMsg("Bullet point saved & indexed!");
      setTimeout(() => setFormSuccessMsg(""), 4000);
    },
    onError: (err: any) => {
      setFormSuccessMsg("");
      setFormErrorMsg(err.message || "Failed to save bullet");
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadResumeFile(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
      setSelectedFile(null);
      setUploadErrorMsg("");
      setUploadSuccessMsg(`Extracted ${data.count || "multiple"} discrete achievement highlights!`);
      setTimeout(() => setUploadSuccessMsg(""), 5000);
    },
    onError: (err: any) => {
      setUploadSuccessMsg("");
      setUploadErrorMsg(err.message || "Failed to process resume file");
    },
  });

  const deleteBulletMutation = useMutation({
    mutationFn: (id: string) => deleteResumeBullet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
    },
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createBulletMutation.mutate({ category, content: content.trim() });
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      uploadMutation.mutate(file);
    }
  };

  const filteredBullets = useMemo(() => {
    return bullets.filter((b) => {
      const matchesCategory = activeFilter === "ALL" || b.category === activeFilter;
      const matchesSearch =
        searchQuery === "" ||
        b.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [bullets, activeFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Resume Studio &amp; Documents
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Jake&apos;s Template ATS Standard
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Tailor your single-page resume to any job, generate high-converting cover letters, and manage your vector bullet library.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab("TAILOR")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "TAILOR"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            Tailor (Jake&apos;s Resume)
          </button>
          <button
            onClick={() => setActiveTab("COVER_LETTER")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "COVER_LETTER"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            Cover Letter Generator
          </button>
          <button
            onClick={() => setActiveTab("BULLETS")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "BULLETS"
                ? "bg-white text-blue-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Bullet Library
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* TAB 1: TAILOR RESUME (JAKE'S TEMPLATE)                                  */}
      {/* ======================================================================= */}
      {activeTab === "TAILOR" && (
        <div className="space-y-6">
          {/* Target Job Selector & Inputs */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Target Position &amp; Job Description
                </h2>
                <p className="text-xs text-slate-500">
                  Select any live Canadian job from your feed or input a custom company and job description.
                </p>
              </div>

              {/* Quick Preset Selector */}
              <div className="w-full sm:w-80">
                <select
                  value={selectedJobId}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="">-- Choose from Live Canadian Feed --</option>
                  {discoveredJobs.slice(0, 50).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company_name} — {job.role_title} ({job.province})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shopify, Hootsuite, Clio..."
                  value={customCompany}
                  onChange={(e) => setCustomCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Backend Software Engineer Intern (Co-op)"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Job Description / Core Responsibilities
              </label>
              <textarea
                rows={3}
                placeholder="Paste the 'What you'll do' section or requirements here to auto-match keywords and achievements..."
                value={customJD}
                onChange={(e) => setCustomJD(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Formats directly into standard single-page Jake&apos;s Resume LaTeX layout.
              </span>
              <button
                onClick={() => tailorMutation.mutate()}
                disabled={tailorMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {tailorMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Tailoring to Job...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Tailor Resume (Jake&apos;s Format)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {tailorMutation.isError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to tailor resume: {(tailorMutation.error as any)?.message}</span>
            </div>
          )}

          {/* Results Display */}
          {tailorResult && (
            <div className="space-y-5">
              {/* ATS Score & Match Overview Bar */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-600 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-blue-700 leading-none">
                      {tailorResult.match_score}%
                    </span>
                    <span className="text-[9px] font-semibold text-blue-600 uppercase">Match</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      ATS Alignment: {customCompany || "Target Role"}
                    </h3>
                    <p className="text-xs text-slate-600 max-w-xl">
                      {tailorResult.tailoring_summary}
                    </p>
                  </div>
                </div>

                {/* Matched Keywords Tags */}
                <div className="flex flex-wrap gap-1.5 max-w-md justify-end">
                  {tailorResult.matched_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                    >
                      ✓ {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Jake's Resume Rendered Preview Component */}
              <JakesResumePreview
                resume={tailorResult}
                companyName={customCompany || "Company"}
                roleTitle={customRole || "Role"}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 2: COVER LETTER GENERATOR (HIGH-CONVERTING TEMPLATE)                 */}
      {/* ======================================================================= */}
      {activeTab === "COVER_LETTER" && (
        <div className="space-y-6">
          {/* Cover Letter Config Form */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  High-Converting Cover Letter Generator
                </h2>
                <p className="text-xs text-slate-500">
                  Follows our proven 4-step framework: pain points first, matching technical dialect, real company values, and concise human tone.
                </p>
              </div>

              {/* Quick Preset Selector */}
              <div className="w-full sm:w-80">
                <select
                  value={clJobId}
                  onChange={(e) => handleClJobSelect(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                >
                  <option value="">-- Choose from Live Canadian Feed --</option>
                  {discoveredJobs.slice(0, 50).map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company_name} — {job.role_title} ({job.province})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  placeholder="e.g. Shopify, Hootsuite, Clio..."
                  value={clCompany}
                  onChange={(e) => setClCompany(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="e.g. Backend Software Engineer Intern"
                  value={clRole}
                  onChange={(e) => setClRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Hiring Manager Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Leave blank for 'Hi [Company] Hiring Team,'"
                  value={clHiringManager}
                  onChange={(e) => setClHiringManager(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <span className="text-[11px] text-slate-500">
                  Tip: Never guess a name; if not publicly listed on LinkedIn, leave blank.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Specific Project or Value <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. open-source tooling, mentorship culture, scalable infrastructure"
                  value={clInitiative}
                  onChange={(e) => setClInitiative(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <span className="text-[11px] text-slate-500">
                  Mention a real team initiative from their blog/engineering posts.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Job Description / &quot;What You&apos;ll Do&quot; Section
              </label>
              <textarea
                rows={3}
                placeholder="Paste the responsibilities here. We will isolate the top 3 pain points and match your metrics to their dialect..."
                value={clJD}
                onChange={(e) => setClJD(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500">
                Generates a clean, customized draft following your exact human template.
              </span>
              <button
                onClick={() => coverLetterMutation.mutate()}
                disabled={coverLetterMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {coverLetterMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Crafting Letter...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Cover Letter
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Box */}
          {clResult && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Header & Copy Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {clResult.subject}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tailored specifically for {clResult.company_name} • Salutation: <span className="font-semibold text-slate-700">{clResult.salutation}</span>
                  </p>
                </div>

                <button
                  onClick={handleCopyCoverLetter}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                >
                  {clCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {clCopied ? "Copied to Clipboard!" : "Copy Full Text"}
                </button>
              </div>

              {/* Matched Pain Points Breakdown */}
              <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wider block mb-2">
                  Pain Points &amp; Technical Matches Addressed:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  {clResult.candidate_matches.map((m, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded border border-slate-200">
                      <span className="font-semibold text-slate-700">Their Need: </span>
                      <span className="text-slate-600">{m.employer_need}</span>
                      <div className="mt-1 text-slate-900">
                        <span className="font-semibold text-blue-600">Your Dialect: </span>
                        <span>{m.candidate_proof}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Letter Body */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Cover Letter Text (Editable)
                </label>
                <textarea
                  rows={14}
                  value={clResult.content}
                  onChange={(e) => setClResult({ ...clResult, content: e.target.value })}
                  className="w-full p-4 text-sm font-sans bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>
                  Tip: Always spend 2 minutes reviewing before sending to ensure your tone resonates with their team culture.
                </span>
                <button
                  onClick={handleCopyCoverLetter}
                  className="text-blue-600 font-semibold hover:underline"
                >
                  Copy &amp; Paste into Application →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* TAB 3: BULLET LIBRARY & VECTOR INDEX                                    */}
      {/* ======================================================================= */}
      {activeTab === "BULLETS" && (
        <div className="space-y-6">
          {/* Top Ingestion / Add Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Drag & Drop Upload */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/30"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-3 border border-blue-100">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">
                Upload PDF or DOCX Resume
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Auto-extracts every bullet point and computes 768d vector embeddings into your database.
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="mt-4 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Parsing &amp; Embedding...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                    Browse Files
                  </>
                )}
              </button>

              {uploadSuccessMsg && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {uploadSuccessMsg}
                </div>
              )}
              {uploadErrorMsg && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-red-700 bg-red-50 px-3 py-1.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {uploadErrorMsg}
                </div>
              )}
            </div>

            {/* 2. Manual Add Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  Add Achievement Bullet Manually
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-3">
                  Index a specific quantified metric to feed your semantic resume matcher.
                </p>

                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="EXPERIENCE">Work Experience</option>
                      <option value="PROJECT">Project Achievement</option>
                      <option value="SKILL">Technical Skills &amp; Tools</option>
                      <option value="LEADERSHIP">Leadership &amp; Community</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Bullet Content</label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Engineered distributed message queues in Go and Redis, reducing latency by 45% for 100k+ daily events..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    {formSuccessMsg ? (
                      <span className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {formSuccessMsg}
                      </span>
                    ) : formErrorMsg ? (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {formErrorMsg}
                      </span>
                    ) : (
                      <span />
                    )}

                    <button
                      type="submit"
                      disabled={createBulletMutation.isPending || !content.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {createBulletMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Indexing...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          Save Bullet
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {["ALL", "EXPERIENCE", "PROJECT", "SKILL", "LEADERSHIP"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeFilter === cat
                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search indexed achievements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Bullets List */}
          {bulletsLoading ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              Loading achievement bullets...
            </div>
          ) : filteredBullets.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
              <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">No bullets found</p>
              <p className="text-xs text-slate-400 mt-1">
                Upload your resume or add custom achievements to populate your studio.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredBullets.map((bullet) => (
                <div
                  key={bullet.id}
                  className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        {bullet.category}
                      </span>
                      <button
                        onClick={() => deleteBulletMutation.mutate(bullet.id)}
                        className="text-slate-300 hover:text-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                        title="Delete bullet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {bullet.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
