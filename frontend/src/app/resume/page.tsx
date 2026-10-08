"use client";


import React, { useState, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchResumeBullets,
  createResumeBullet,
  updateResumeBullet,
  uploadResumeFile,
  deleteResumeBullet,
  fetchDiscoveredJobs,
  tailorResume,
  generateCoverLetter,
  fetchUserProfile,
  updateUserProfile,
  TailoredResumeData,
  CoverLetterData,
} from "../../lib/api";
import { ResumeBullet, DiscoveredJob, UserProfile, ExperienceItem } from "../../types";
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
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  FileUp,
  CheckSquare,
  Square,
  MapPin,
  Calendar,
  Building2,
} from "lucide-react";
import SpotlightCard from "../../components/ui/SpotlightCard";
import ShinyBadge from "../../components/ui/ShinyBadge";
import Magnet from "../../components/ui/Magnet";
import DecryptedText from "../../components/ui/DecryptedText";
import VantaBackground from "../../components/ui/VantaBackground";

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
  // TAB 3: WORK EXPERIENCE & HIGHLIGHTS CRUD + PARSER STATE
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsingStage, setParsingStage] = useState("");

  // Dynamic Work Experience State
  const [isAddingExperience, setIsAddingExperience] = useState(false);
  const [newExpCompany, setNewExpCompany] = useState("");
  const [newExpRole, setNewExpRole] = useState("");
  const [newExpLocation, setNewExpLocation] = useState("");
  const [newExpStartDate, setNewExpStartDate] = useState("");
  const [newExpEndDate, setNewExpEndDate] = useState("");
  const [newExpIsCurrent, setNewExpIsCurrent] = useState(false);
  const [newExpBullet, setNewExpBullet] = useState("");

  const [editingExpIndex, setEditingExpIndex] = useState<number | null>(null);
  const [editExpData, setEditExpData] = useState<ExperienceItem | null>(null);

  const [editingBulletKey, setEditingBulletKey] = useState<string | null>(null);
  const [editingBulletText, setEditingBulletText] = useState("");
  const [addingBulletExpIndex, setAddingBulletExpIndex] = useState<number | null>(null);
  const [newBulletText, setNewBulletText] = useState("");

  const [showRawBulletLibrary, setShowRawBulletLibrary] = useState(false);

  // Queries
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
  });

  const { data: bullets = [], isLoading: bulletsLoading } = useQuery({
    queryKey: ["resumeBullets"],
    queryFn: fetchResumeBullets,
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: (updated: Partial<UserProfile>) => updateUserProfile(updated),
    onSuccess: (data) => {
      queryClient.setQueryData(["userProfile"], data);
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });

  // Bullet Mutations
  const createBulletMutation = useMutation({
    mutationFn: (newBullet: { category: string; content: string }) =>
      createResumeBullet(newBullet.category, newBullet.content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
      setContent("");
      setFormErrorMsg("");
      setFormSuccessMsg("Bullet point saved & indexed into pgvector!");
      setTimeout(() => setFormSuccessMsg(""), 4000);
    },
    onError: (err: any) => {
      setFormSuccessMsg("");
      setFormErrorMsg(err.message || "Failed to save bullet");
    },
  });

  const updateBulletMutation = useMutation({
    mutationFn: ({ id, content, category }: { id: string; content: string; category?: string }) =>
      updateResumeBullet(id, content, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
    },
  });

  const deleteBulletMutation = useMutation({
    mutationFn: (id: string) => deleteResumeBullet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
    },
  });

  // Resume Document Upload with Stage Transitions
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadProgress(20);
      setParsingStage("Reading document structure (PDF / DOCX / TXT)...");
      await new Promise((r) => setTimeout(r, 300));
      setUploadProgress(55);
      setParsingStage("Extracting work history & STAR achievement highlights...");
      const res = await uploadResumeFile(file);
      setUploadProgress(88);
      setParsingStage("Computing 768d dense vector embeddings into pgvector...");
      await new Promise((r) => setTimeout(r, 300));
      setUploadProgress(100);
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resumeBullets"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setSelectedFile(null);
      setUploadProgress(0);
      setParsingStage("");
      setUploadErrorMsg("");
      const expCount = data.profile?.experiences?.length || 0;
      setUploadSuccessMsg(
        `Parsed "${data.filename}"! Extracted ${data.count} STAR highlights and updated work history.`
      );
      setTimeout(() => setUploadSuccessMsg(""), 6000);
    },
    onError: (err: any) => {
      setUploadProgress(0);
      setParsingStage("");
      setUploadSuccessMsg("");
      setUploadErrorMsg(err.message || "Failed to process resume file");
    },
  });

  // Experience Handlers
  const handleAddExperience = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpCompany.trim() || !newExpRole.trim()) return;

    const newExp: ExperienceItem = {
      company: newExpCompany.trim(),
      role: newExpRole.trim(),
      location: newExpLocation.trim() || undefined,
      start_date: newExpStartDate.trim() || undefined,
      end_date: newExpIsCurrent ? "Present" : newExpEndDate.trim() || undefined,
      is_current: newExpIsCurrent,
      bullets: newExpBullet.trim() ? [newExpBullet.trim()] : [],
    };

    const currentExps = userProfile?.experiences || [];
    const updated = [newExp, ...currentExps];
    updateProfileMutation.mutate({ experiences: updated });

    if (newExpBullet.trim()) {
      createBulletMutation.mutate({ category: "EXPERIENCE", content: newExpBullet.trim() });
    }

    setNewExpCompany("");
    setNewExpRole("");
    setNewExpLocation("");
    setNewExpStartDate("");
    setNewExpEndDate("");
    setNewExpIsCurrent(false);
    setNewExpBullet("");
    setIsAddingExperience(false);
  };

  const handleDeleteExperience = (idx: number) => {
    if (!window.confirm("Are you sure you want to remove this work experience?")) return;
    const currentExps = [...(userProfile?.experiences || [])];
    currentExps.splice(idx, 1);
    updateProfileMutation.mutate({ experiences: currentExps });
  };

  const handleStartEditExperience = (idx: number, exp: ExperienceItem) => {
    setEditingExpIndex(idx);
    setEditExpData({ ...exp });
  };

  const handleSaveEditExperience = (idx: number) => {
    if (!editExpData) return;
    const currentExps = [...(userProfile?.experiences || [])];
    currentExps[idx] = editExpData;
    updateProfileMutation.mutate({ experiences: currentExps });
    setEditingExpIndex(null);
    setEditExpData(null);
  };

  const handleAddBulletToExperience = (expIdx: number) => {
    if (!newBulletText.trim()) return;
    const currentExps = [...(userProfile?.experiences || [])];
    const targetExp = { ...currentExps[expIdx] };
    targetExp.bullets = [...(targetExp.bullets || []), newBulletText.trim()];
    currentExps[expIdx] = targetExp;
    updateProfileMutation.mutate({ experiences: currentExps });

    createBulletMutation.mutate({ category: "EXPERIENCE", content: newBulletText.trim() });
    setNewBulletText("");
    setAddingBulletExpIndex(null);
  };

  const handleSaveEditBullet = (expIdx: number, bulletIdx: number) => {
    if (!editingBulletText.trim()) return;
    const currentExps = [...(userProfile?.experiences || [])];
    const targetExp = { ...currentExps[expIdx] };
    const oldBulletText = targetExp.bullets[bulletIdx];
    const updatedBullets = [...targetExp.bullets];
    updatedBullets[bulletIdx] = editingBulletText.trim();
    targetExp.bullets = updatedBullets;
    currentExps[expIdx] = targetExp;
    updateProfileMutation.mutate({ experiences: currentExps });

    const foundBullet = bullets.find((b) => b.content.trim() === oldBulletText.trim());
    if (foundBullet) {
      updateBulletMutation.mutate({
        id: foundBullet.id,
        content: editingBulletText.trim(),
        category: "EXPERIENCE",
      });
    } else {
      createBulletMutation.mutate({
        category: "EXPERIENCE",
        content: editingBulletText.trim(),
      });
    }

    setEditingBulletKey(null);
    setEditingBulletText("");
  };

  const handleDeleteBulletFromExperience = (expIdx: number, bulletIdx: number) => {
    const currentExps = [...(userProfile?.experiences || [])];
    const targetExp = { ...currentExps[expIdx] };
    const bulletText = targetExp.bullets[bulletIdx];
    const updatedBullets = [...targetExp.bullets];
    updatedBullets.splice(bulletIdx, 1);
    targetExp.bullets = updatedBullets;
    currentExps[expIdx] = targetExp;
    updateProfileMutation.mutate({ experiences: currentExps });

    const foundBullet = bullets.find((b) => b.content.trim() === bulletText.trim());
    if (foundBullet) {
      deleteBulletMutation.mutate(foundBullet.id);
    }
  };

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
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
            Experience &amp; Highlights
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
      {/* TAB 3: WORK EXPERIENCE, BULLET CRUD & PARSER                            */}
      {/* ======================================================================= */}
      {activeTab === "BULLETS" && (
        <div className="space-y-8">
          {/* 1. INTERACTIVE RESUME DOCUMENT UPLOADER & PARSER */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all bg-white ${
              isDragging
                ? "border-[#0066FF] bg-blue-50/40 shadow-simplify-hover"
                : "border-slate-200/90 hover:border-slate-300 shadow-simplify-card"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0066FF] mb-3 border border-blue-100 shadow-xs">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">
              Upload Resume Document (.pdf, .docx, .txt)
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Automatically parses work history, education, and technical skills, and computes 768d vector embeddings for every STAR achievement highlight.
            </p>

            {/* Active File Card */}
            {selectedFile && (
              <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 w-full max-w-md flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-900 truncate">{selectedFile.name}</span>
                  <span className="text-slate-400 shrink-0">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-[10px] uppercase">
                  {selectedFile.name.split(".").pop() || "FILE"}
                </span>
              </div>
            )}

            {/* Progress Bar & Stage Indicator */}
            {uploadMutation.isPending && (
              <div className="mt-4 w-full max-w-md space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0066FF]" />
                    {parsingStage || "Processing document..."}
                  </span>
                  <span className="text-[#0066FF]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#0066FF] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="mt-4 px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Parsing &amp; Indexing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 text-[#0066FF]" />
                  Choose Resume File
                </>
              )}
            </button>

            {uploadSuccessMsg && (
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccessMsg}</span>
              </div>
            )}
            {uploadErrorMsg && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-700 bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{uploadErrorMsg}</span>
              </div>
            )}
          </div>

          {/* 2. DYNAMIC WORK EXPERIENCE & STAR HIGHLIGHTS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-simplify-card">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#0066FF]" />
                  Work Experience &amp; STAR Highlights
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage career roles and achievement bullets. All edits auto-sync with the pgvector vector store for instant RAG tailoring.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingExperience(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Experience
              </button>
            </div>

            {/* Expandable Add Experience Form */}
            {isAddingExperience && (
              <form
                onSubmit={handleAddExperience}
                className="bg-white p-5 rounded-2xl border-2 border-blue-200 shadow-simplify-hover space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#0066FF]" />
                    Add New Work Position
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingExperience(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amazon, Clio, Shopify"
                      value={newExpCompany}
                      onChange={(e) => setNewExpCompany(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Job Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Software Development Engineer Intern"
                      value={newExpRole}
                      onChange={(e) => setNewExpRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Vancouver, BC or Remote"
                      value={newExpLocation}
                      onChange={(e) => setNewExpLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="text"
                      placeholder="e.g. May 2025"
                      value={newExpStartDate}
                      onChange={(e) => setNewExpStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="text"
                      placeholder="e.g. Aug 2025"
                      disabled={newExpIsCurrent}
                      value={newExpIsCurrent ? "Present" : newExpEndDate}
                      onChange={(e) => setNewExpEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newExpIsCurrent"
                    checked={newExpIsCurrent}
                    onChange={(e) => setNewExpIsCurrent(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="newExpIsCurrent" className="text-xs text-slate-700 font-medium cursor-pointer">
                    I currently work in this position
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Achievement Bullet (STAR Format)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Architected distributed Redis cache invalidation, cutting p95 response time by 42%..."
                    value={newExpBullet}
                    onChange={(e) => setNewExpBullet(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddingExperience(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending || !newExpCompany.trim() || !newExpRole.trim()}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Save Position &amp; Bullets
                  </button>
                </div>
              </form>
            )}

            {/* List of Experiences */}
            {profileLoading ? (
              <div className="p-12 text-center text-slate-500 text-sm bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0066FF]" />
                Loading candidate experience history...
              </div>
            ) : (!userProfile?.experiences || userProfile.experiences.length === 0) ? (
              <div className="p-10 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-simplify-card">
                <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-800">No work experiences found</p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload a resume or click &quot;+ Add Experience&quot; above to add your employment history.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {userProfile.experiences.map((exp, expIdx) => {
                  const isEditingThisExp = editingExpIndex === expIdx;
                  const isAddingBulletToThis = addingBulletExpIndex === expIdx;

                  return (
                    <div
                      key={expIdx}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-simplify-card p-5 space-y-4 hover:border-slate-300 transition-all"
                    >
                      {/* Experience Top Row */}
                      {isEditingThisExp && editExpData ? (
                        <div className="space-y-3 pb-3 border-b border-slate-100">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editExpData.company}
                              onChange={(e) => setEditExpData({ ...editExpData, company: e.target.value })}
                              placeholder="Company"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                            />
                            <input
                              type="text"
                              value={editExpData.role}
                              onChange={(e) => setEditExpData({ ...editExpData, role: e.target.value })}
                              placeholder="Role / Title"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={editExpData.location || ""}
                              onChange={(e) => setEditExpData({ ...editExpData, location: e.target.value })}
                              placeholder="Location"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            />
                            <input
                              type="text"
                              value={editExpData.start_date || ""}
                              onChange={(e) => setEditExpData({ ...editExpData, start_date: e.target.value })}
                              placeholder="Start Date"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            />
                            <input
                              type="text"
                              value={editExpData.end_date || ""}
                              onChange={(e) => setEditExpData({ ...editExpData, end_date: e.target.value })}
                              placeholder="End Date"
                              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingExpIndex(null)}
                              className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEditExperience(expIdx)}
                              className="px-3 py-1 text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-slate-900">{exp.role}</h3>
                              <span className="text-slate-400 font-semibold text-xs">@</span>
                              <span className="font-semibold text-xs text-[#0066FF]">{exp.company}</span>
                              {exp.is_current && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Current Role
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                              {exp.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  {exp.location}
                                </span>
                              )}
                              {(exp.start_date || exp.end_date) && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {exp.start_date} – {exp.end_date || "Present"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleStartEditExperience(expIdx, exp)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit position"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteExperience(expIdx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete position"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STAR Achievement Bullets */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            STAR Achievement Highlights ({exp.bullets?.length || 0})
                          </span>
                          {!isAddingBulletToThis && (
                            <button
                              type="button"
                              onClick={() => {
                                setAddingBulletExpIndex(expIdx);
                                setNewBulletText("");
                              }}
                              className="text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                              Add Bullet
                            </button>
                          )}
                        </div>

                        {/* Bullets List */}
                        <div className="space-y-2">
                          {(exp.bullets || []).map((bulletText, bIdx) => {
                            const bulletKey = `${expIdx}-${bIdx}`;
                            const isEditingThisBullet = editingBulletKey === bulletKey;

                            if (isEditingThisBullet) {
                              return (
                                <div key={bIdx} className="p-3 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2">
                                  <textarea
                                    rows={2}
                                    value={editingBulletText}
                                    onChange={(e) => setEditingBulletText(e.target.value)}
                                    className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                                  />
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => setEditingBulletKey(null)}
                                      className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveEditBullet(expIdx, bIdx)}
                                      className="px-3 py-1 text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <Save className="w-3 h-3" />
                                      Save Bullet
                                    </button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={bIdx}
                                className="group flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-white hover:border-slate-300 transition-all text-xs"
                              >
                                <div className="flex items-start gap-2 text-slate-800 leading-relaxed">
                                  <span className="text-[#0066FF] font-bold shrink-0 mt-0.5">•</span>
                                  <span>{bulletText}</span>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingBulletKey(bulletKey);
                                      setEditingBulletText(bulletText);
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                                    title="Edit bullet"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteBulletFromExperience(expIdx, bIdx)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                    title="Delete bullet"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* Inline Add Bullet Field */}
                          {isAddingBulletToThis && (
                            <div className="p-3 rounded-xl bg-blue-50/50 border-2 border-blue-200 space-y-2 mt-2">
                              <textarea
                                rows={2}
                                autoFocus
                                placeholder="Engineered high-throughput service reducing query latency by 45%..."
                                value={newBulletText}
                                onChange={(e) => setNewBulletText(e.target.value)}
                                className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAddingBulletExpIndex(null)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAddBulletToExperience(expIdx)}
                                  disabled={!newBulletText.trim()}
                                  className="px-3 py-1 text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                                >
                                  <Save className="w-3 h-3" />
                                  Save &amp; Index Bullet
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. ATOMIC BULLET VECTOR LIBRARY (COLLAPSIBLE) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-simplify-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0066FF]" />
                  Atomic Vector Bullet Library ({bullets.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Raw 768d vector embeddings stored in PostgreSQL (pgvector) used for semantic RAG matching.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRawBulletLibrary(!showRawBulletLibrary)}
                className="text-xs font-semibold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showRawBulletLibrary ? (
                  <>Hide Library <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>View Raw Vectors <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {showRawBulletLibrary && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                {/* Manual Bullet Ingestion */}
                <form onSubmit={handleManualSubmit} className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="sm:w-48 shrink-0">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                      >
                        <option value="EXPERIENCE">Work Experience</option>
                        <option value="PROJECT">Project Achievement</option>
                        <option value="SKILL">Technical Skills &amp; Tools</option>
                        <option value="LEADERSHIP">Leadership &amp; Community</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Standalone Bullet Content</label>
                      <input
                        type="text"
                        placeholder="e.g. Optimized PostgreSQL queries via HNSW index, reducing latency by 70%..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>

                    <div className="sm:self-end">
                      <button
                        type="submit"
                        disabled={createBulletMutation.isPending || !content.trim()}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-blue-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shrink-0"
                      >
                        {createBulletMutation.isPending ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Indexing...
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Index Bullet
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {formSuccessMsg && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {formSuccessMsg}
                    </span>
                  )}
                  {formErrorMsg && (
                    <span className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {formErrorMsg}
                    </span>
                  )}
                </form>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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

                {/* Bullets Grid */}
                {bulletsLoading ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading indexed vectors...
                  </div>
                ) : filteredBullets.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                    No bullets found matching filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                    {filteredBullets.map((bullet) => (
                      <div
                        key={bullet.id}
                        className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between group text-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white text-slate-600 border border-slate-200">
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
                          <p className="text-slate-800 leading-relaxed font-sans">{bullet.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
