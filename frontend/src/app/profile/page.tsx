"use client";


import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
  fetchUserProfile,
  updateUserProfile,
  syncProfileFromResume,
  exportProfileForATS,
} from "../../lib/api";
import { UserProfile, ATSAutofillExport } from "../../types";
import {
  User,
  GraduationCap,
  ShieldCheck,
  Briefcase,
  FolderGit2,
  Cpu,
  RefreshCw,
  Download,
  Save,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  X,
  MapPin,
  Sparkles,
} from "lucide-react";
import SpotlightCard from "../../components/ui/SpotlightCard";
import ShinyBadge from "../../components/ui/ShinyBadge";
import Magnet from "../../components/ui/Magnet";
import DecryptedText from "../../components/ui/DecryptedText";
import VantaBackground from "../../components/ui/VantaBackground";

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

const CANADIAN_PROVINCES = [
  "British Columbia",
  "Alberta",
  "Ontario",
  "Quebec",
  "Saskatchewan",
  "Manitoba",
];

export default function ProfilePage() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"personal" | "education" | "work_auth" | "experience" | "skills">("personal");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ATS Export Modal state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportData, setExportData] = useState<ATSAutofillExport | null>(null);
  const [copied, setCopied] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Profile Query
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
  });

  // Local Form State
  const [formData, setFormData] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (updated: Partial<UserProfile>) => updateUserProfile(updated),
    onSuccess: (data) => {
      queryClient.setQueryData(["userProfile"], data);
      showToast("Profile changes saved successfully!");
    },
    onError: (err: any) => {
      showToast(`Error: ${err.message || "Failed to save profile"}`);
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => syncProfileFromResume(),
    onSuccess: (data) => {
      queryClient.setQueryData(["userProfile"], data);
      setFormData(data);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#3b82f6", "#f59e0b"],
      });
      showToast("Profile updated from your resume highlights!");
    },
    onError: (err: any) => {
      showToast(`Sync failed: ${err.message || "Failed to sync"}`);
    },
  });

  const handleOpenExport = async () => {
    try {
      const data = await exportProfileForATS();
      setExportData(data);
      setIsExportModalOpen(true);
    } catch (err: any) {
      showToast("Failed to generate ATS autofill export");
    }
  };

  const handleCopyJSON = () => {
    if (!exportData) return;
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    const currentSkills = formData.skills || [];
    if (!currentSkills.includes(newSkillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...currentSkills, newSkillInput.trim()],
      }));
    }
    setNewSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skillToRemove),
    }));
  };

  if (isLoading || !formData) {
    return (
      <div className="p-12 text-center text-xs text-slate-400">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 right-6 z-50 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-xs font-medium shadow-lg flex items-center gap-2"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Action Controls */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white font-bold text-lg shadow-xs shrink-0">
            {formData.full_name?.slice(0, 1).toUpperCase() || "C"}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                Master Job Application Profile, <span className="italic font-normal text-slate-500">Autofill Ready.</span>
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                🇨🇦 Co-op Verified
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Master Job Application Profile. Fill out your details once and use them across all your applications.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 shadow-xs"
            title="Update profile from resume highlights"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin text-[#0066FF]" : ""}`} />
            <span>Sync from Resume Studio</span>
          </button>

          <button
            type="button"
            onClick={handleOpenExport}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export for ATS Autofill</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white shadow-xs transition flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{saveMutation.isPending ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Profile Sections Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Navigation Tabs (3 cols) */}
        <div className="md:col-span-3 space-y-1">
          {[
            { id: "personal", label: "Personal Details", icon: User },
            { id: "education", label: "Education & Co-op", icon: GraduationCap },
            { id: "work_auth", label: "Canadian Work Auth", icon: ShieldCheck },
            { id: "experience", label: "Work History & Projects", icon: Briefcase },
            { id: "skills", label: "Technical Skills", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition text-left ${
                  isActive
                    ? "bg-white text-[#0066FF] border border-slate-200 shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-[#0066FF]" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Form Body (9 cols) */}
        <div className="md:col-span-9">
          <form onSubmit={handleSave} className="rounded-2xl bg-white border border-slate-200 shadow-xs p-6 space-y-6">
            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === "personal" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-[#30363d]">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Primary contact info used for auto-populating job applications
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Full Name</label>
                    <input
                      type="text"
                      value={formData.full_name || ""}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Email Address</label>
                    <input
                      type="email"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (604) 555-0184"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">City & Province</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={formData.city || ""}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Vancouver"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                      <select
                        value={formData.province || "British Columbia"}
                        onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        {CANADIAN_PROVINCES.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={formData.linkedin_url || ""}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">GitHub Profile URL</label>
                    <input
                      type="url"
                      value={formData.github_url || ""}
                      onChange={(e) => setFormData({ ...formData, github_url: e.target.value })}
                      placeholder="https://github.com/..."
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EDUCATION & CO-OP */}
            {activeTab === "education" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-[#30363d]">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Education & Academic Standing
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Canadian post-secondary academic credentials and Co-op enrollment details
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">University / College</label>
                    <input
                      type="text"
                      list="uni-suggestions"
                      value={formData.education?.school || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education!, school: e.target.value },
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                    <datalist id="uni-suggestions">
                      {CANADIAN_UNIVERSITIES.map((u) => (
                        <option key={u} value={u} />
                      ))}
                    </datalist>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Degree & Major</label>
                    <input
                      type="text"
                      value={formData.education?.degree ? `${formData.education.degree} in ${formData.education.major}` : ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData({
                          ...formData,
                          education: { ...formData.education!, major: val, degree: "B.Sc." },
                        });
                      }}
                      placeholder="Bachelor of Science in Computer Science"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Cumulative GPA</label>
                    <input
                      type="text"
                      value={formData.education?.gpa || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education!, gpa: e.target.value },
                        })
                      }
                      placeholder="3.85 / 4.00"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Graduation Term</label>
                    <input
                      type="text"
                      value={formData.education?.grad_term || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education!, grad_term: e.target.value },
                        })
                      }
                      placeholder="Spring 2027"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="is_coop"
                      checked={formData.education?.is_coop_enrolled ?? true}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          education: { ...formData.education!, is_coop_enrolled: e.target.checked },
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="is_coop" className="text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                      Enrolled in recognized Canadian University Co-op Program
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CANADIAN WORK AUTHORIZATION */}
            {activeTab === "work_auth" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-[#30363d]">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Canadian Work Authorization Disclosures
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Crucial legal disclosures required by Canadian employers for tax credits (e.g. SWPP)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] space-y-2">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      Legal Canadian Status
                    </label>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.work_authorization?.work_auth_status === "CITIZEN_OR_PR"}
                          onChange={() =>
                            setFormData({
                              ...formData,
                              work_authorization: {
                                ...formData.work_authorization!,
                                work_auth_status: "CITIZEN_OR_PR",
                                canadian_work_eligible: true,
                                requires_sponsorship: false,
                              },
                            })
                          }
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Canadian Citizen or Permanent Resident (Eligible for SWPP wage subsidies)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="status"
                          checked={formData.work_authorization?.work_auth_status === "COOP_WORK_PERMIT"}
                          onChange={() =>
                            setFormData({
                              ...formData,
                              work_authorization: {
                                ...formData.work_authorization!,
                                work_auth_status: "COOP_WORK_PERMIT",
                                canadian_work_eligible: true,
                                coop_work_permit: true,
                              },
                            })
                          }
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>International Student with Valid Canadian Co-op Work Permit</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Target Co-op Term</label>
                      <input
                        type="text"
                        value={formData.work_authorization?.target_term_length || "4 or 8 Months (Fall 2026 / Winter 2027)"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            work_authorization: {
                              ...formData.work_authorization!,
                              target_term_length: e.target.value,
                            },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Visa Sponsorship Required?</label>
                      <select
                        value={formData.work_authorization?.requires_sponsorship ? "YES" : "NO"}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            work_authorization: {
                              ...formData.work_authorization!,
                              requires_sponsorship: e.target.value === "YES",
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                      >
                        <option value="NO">No - Legally eligible to work in Canada</option>
                        <option value="YES">Yes - Will require employer sponsorship</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: WORK EXPERIENCE & PROJECTS */}
            {activeTab === "experience" && (
              <div className="space-y-5">
                <div className="pb-3 border-b border-slate-200 dark:border-[#30363d] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Work Experience & Highlights
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Synchronized achievement records extracted by the Resume Studio parser
                    </p>
                  </div>
                  <a
                    href="/resume"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0066FF]/10 text-[#0066FF] hover:bg-[#0066FF]/20 transition"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Manage in Resume Studio</span>
                  </a>
                </div>

                <div className="space-y-3">
                  {(formData.experiences || []).map((exp, idx) => (
                    <div key={idx} className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">{exp.role}</span>
                          <span className="text-slate-400 text-xs"> @ {exp.company}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {exp.start_date} - {exp.end_date} • {exp.location}
                        </span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        {exp.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="leading-relaxed">{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] space-y-2">
                    <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Featured Projects</span>
                    {(formData.projects || []).map((proj, pIdx) => (
                      <div key={pIdx} className="pt-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs text-emerald-600 dark:text-emerald-400">{proj.name}</span>
                          {proj.link && (
                            <a href={proj.link} target="_blank" rel="noreferrer" className="text-[11px] text-slate-400 hover:underline">
                              {proj.link}
                            </a>
                          )}
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600 dark:text-slate-300">
                          {proj.bullets.map((b, bIdx) => (
                            <li key={bIdx}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: TECHNICAL SKILLS */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="pb-3 border-b border-slate-200 dark:border-[#30363d]">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Technical Skills Inventory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    ATS keyword tags automatically matched against Job Descriptions
                  </p>
                </div>

                {/* Add Skill Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSkill())}
                    placeholder="Add a new skill (e.g. React, Python, Docker)..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Active Skill Chips */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(formData.skills || []).map((skill) => (
                    <span
                      key={skill}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-[#21262d] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-slate-400 hover:text-rose-500 transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ATS Autofill Export Modal */}
      {isExportModalOpen && exportData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#30363d]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ATS Autofill Export Payload
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standardized schema for Workday, Greenhouse, Lever, and Simplify Chrome extensions
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ATS Compatibility Badges */}
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300">Compatible ATS:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Workday</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Greenhouse</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">Lever</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">iCIMS</span>
            </div>

            {/* JSON Code Box */}
            <div className="relative rounded-lg bg-slate-950 p-3.5 border border-slate-800 font-mono text-[11px] text-slate-200 max-h-80 overflow-y-auto">
              <button
                type="button"
                onClick={handleCopyJSON}
                className="absolute top-3 right-3 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition shadow-sm"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
              <pre>{JSON.stringify(exportData, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
