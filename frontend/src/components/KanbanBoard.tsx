"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { Application, ApplicationMilestone, ApplicationStatus } from "../types";
import {
  fetchApplications,
  fetchMilestones,
  updateApplicationStatus,
  createApplication,
  deleteApplication,
} from "../lib/api";
import ApplicationCard from "./ApplicationCard";
import ApplicationDetailModal from "./ApplicationDetailModal";
import JDIngestModal from "./JDIngestModal";
import { springs } from "../lib/motion-tokens";
import { INITIAL_APPLICATIONS } from "../lib/initial-data";
import SpotlightCard from "./ui/SpotlightCard";
import Magnet from "./ui/Magnet";
import ShinyBadge from "./ui/ShinyBadge";
import VantaBackground from "./ui/VantaBackground";
import {
  Plus,
  Sparkles,
  Search,
  Download,
  AlertCircle,
  Trophy,
  Activity,
  Layers,
  ArrowUpDown,
  X,
  CheckCircle2,
  Calendar,
  Flame,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  CheckSquare,
  Users,
  FileText,
  ChevronRight,
  TrendingUp,
  MapPin,
  Check,
  Briefcase,
  ExternalLink,
} from "lucide-react";

const STAGE_ORDER: ApplicationStatus[] = [
  "WISHLIST",
  "APPLIED",
  "OA_SCHEDULED",
  "INTERVIEWING",
  "OFFER",
  "REJECTED",
  "WITHDRAWN",
];

const COLUMNS: { id: ApplicationStatus; title: string }[] = [
  { id: "WISHLIST", title: "Wishlist" },
  { id: "APPLIED", title: "Applied" },
  { id: "OA_SCHEDULED", title: "OA Scheduled" },
  { id: "INTERVIEWING", title: "Interviewing" },
  { id: "OFFER", title: "Offer" },
  { id: "REJECTED", title: "Rejected" },
  { id: "WITHDRAWN", title: "Withdrawn" },
];

export default function KanbanBoard() {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState<"BOARD" | "LIST" | "METRICS">("BOARD");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [activeDragTarget, setActiveDragTarget] = useState<ApplicationStatus | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Column quick-add state
  const [quickAddColumn, setQuickAddColumn] = useState<ApplicationStatus | null>(null);
  const [quickCompany, setQuickCompany] = useState("");
  const [quickRole, setQuickRole] = useState("");

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [workModelFilter, setWorkModelFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"DATE" | "SCORE" | "COMPANY">("SCORE");

  const { data: applications = INITIAL_APPLICATIONS, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: fetchApplications,
    initialData: INITIAL_APPLICATIONS,
    refetchInterval: 5000,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones"],
    queryFn: fetchMilestones,
  });

  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const triggerOfferCelebration = () => {
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#00b4d8", "#4f46e5", "#10b981", "#fbbf24"],
    });
  };

  // Optimistic Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, toStatus }: { id: string; toStatus: ApplicationStatus }) =>
      updateApplicationStatus(id, toStatus),
    onMutate: async ({ id, toStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });
      const previousApps = queryClient.getQueryData<Application[]>(["applications"]);

      queryClient.setQueryData<Application[]>(["applications"], (old = []) =>
        old.map((app) => (app.id === id ? { ...app, status: toStatus } : app))
      );

      if (toStatus === "OFFER") {
        triggerOfferCelebration();
      }

      return { previousApps };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(["applications"], context.previousApps);
      }
      showToast(`Network error: ${err.message}. State rolled back.`, "error");
    },
    onSuccess: (data, variables) => {
      showToast(`Moved to ${variables.toStatus.replace("_", " ")}`, "success");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  // Quick-Add Mutation
  const createMutation = useMutation({
    mutationFn: (payload: { company_name: string; role_title: string; status: ApplicationStatus }) =>
      createApplication(payload),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      showToast(`Added ${created.company_name} to pipeline!`, "success");
      setQuickCompany("");
      setQuickRole("");
      setQuickAddColumn(null);
    },
    onError: (err: any) => {
      showToast(`Failed to add application: ${err.message}`, "error");
    },
  });

  // Optimistic Delete Mutation (<16ms instant removal)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteApplication(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ["applications"] });
      const previousApps = queryClient.getQueryData<Application[]>(["applications"]);
      queryClient.setQueryData<Application[]>(["applications"], (old = []) =>
        old.filter((app) => app.id !== id)
      );
      return { previousApps };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousApps) {
        queryClient.setQueryData(["applications"], context.previousApps);
      }
      showToast(`Failed to delete application: ${err.message}`, "error");
    },
    onSuccess: () => {
      showToast("Application removed from board", "info");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedAppId(id);
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, colId: ApplicationStatus) => {
    e.preventDefault();
    if (activeDragTarget !== colId) {
      setActiveDragTarget(colId);
    }
  };

  const handleDragLeave = () => {
    setActiveDragTarget(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    setActiveDragTarget(null);
    const id = draggedAppId || e.dataTransfer.getData("text/plain");
    if (!id) return;

    const currentApp = applications.find((a) => a.id === id);
    if (currentApp && currentApp.status !== targetStatus) {
      statusMutation.mutate({ id, toStatus: targetStatus });
    }
    setDraggedAppId(null);
  };

  const handleQuickAdvance = (id: string, currentStatus: ApplicationStatus) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < 4) {
      const nextStatus = STAGE_ORDER[currentIndex + 1];
      statusMutation.mutate({ id, toStatus: nextStatus });
    }
  };

  const handleQuickAddSubmit = (e: React.FormEvent, status: ApplicationStatus) => {
    e.preventDefault();
    if (!quickCompany.trim() || !quickRole.trim()) return;
    createMutation.mutate({
      company_name: quickCompany.trim(),
      role_title: quickRole.trim(),
      status,
    });
  };

  const getMilestoneForApp = (appId: string) => {
    return milestones.find((m) => m.application_id === appId && !m.is_completed);
  };

  // Filtered & Sorted Applications
  const filteredApplications = useMemo(() => {
    return applications
      .filter((app) => {
        const matchesSearch =
          app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          app.role_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (app.job_location && app.job_location.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesModel =
          workModelFilter === "ALL" || app.work_model?.toUpperCase() === workModelFilter;

        return matchesSearch && matchesModel;
      })
      .sort((a, b) => {
        if (sortBy === "SCORE") {
          return (b.match_score || 0) - (a.match_score || 0);
        }
        if (sortBy === "COMPANY") {
          return a.company_name.localeCompare(b.company_name);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [applications, searchQuery, workModelFilter, sortBy]);

  // Comprehensive Pipeline Analytics
  const metrics = useMemo(() => {
    const total = applications.length;
    if (total === 0) {
      return {
        total: 0,
        interviewRate: 0,
        offerRate: 0,
        wishlistCount: 0,
        appliedCount: 0,
        oaCount: 0,
        interviewingCount: 0,
        offers: 0,
        totalTasks: 0,
        completedTasks: 0,
        totalContacts: 0,
      };
    }

    const appliedAndBeyond = applications.filter((a) => a.status !== "WISHLIST").length;
    const interviewCount = applications.filter(
      (a) => a.status === "INTERVIEWING" || a.status === "OA_SCHEDULED" || a.status === "OFFER"
    ).length;
    const offers = applications.filter((a) => a.status === "OFFER").length;

    const interviewRate =
      appliedAndBeyond > 0 ? Math.round((interviewCount / appliedAndBeyond) * 100) : 0;
    const offerRate =
      appliedAndBeyond > 0 ? Math.round((offers / appliedAndBeyond) * 100) : 0;

    const totalTasks = applications.reduce((acc, a) => acc + (a.task_count || 0), 0);
    const completedTasks = applications.reduce((acc, a) => acc + (a.completed_tasks || 0), 0);
    const totalContacts = applications.reduce((acc, a) => acc + (a.contact_count || 0), 0);

    return {
      total,
      interviewRate,
      offerRate,
      wishlistCount: applications.filter((a) => a.status === "WISHLIST").length,
      appliedCount: applications.filter((a) => a.status === "APPLIED").length,
      oaCount: applications.filter((a) => a.status === "OA_SCHEDULED").length,
      interviewingCount: applications.filter((a) => a.status === "INTERVIEWING").length,
      offers,
      totalTasks,
      completedTasks,
      totalContacts,
    };
  }, [applications]);

  // Export Pipeline to JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(applications, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trackr_pipeline_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Exported pipeline JSON successfully!", "success");
  };

  return (
    <div className="flex-1 flex flex-col space-y-6 max-w-[1740px] w-full mx-auto">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl border text-xs shadow-2xl backdrop-blur-xl ${
              toastMessage.type === "error"
                ? "bg-rose-950 text-white border-rose-800"
                : "bg-slate-900 text-white border-slate-800 shadow-xl"
            }`}
          >
            {toastMessage.type === "error" ? (
              <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Simplify View Switcher */}
      <div className="relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-5 p-6 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card">
        <VantaBackground className="opacity-25" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              Your Career Pipeline, <span className="italic font-normal text-slate-500">Accelerated.</span>
            </h1>

            {/* View Switcher Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 backdrop-blur-sm p-1 rounded-xl border border-slate-200/80 text-xs font-medium">
              <button
                onClick={() => setActiveView("BOARD")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeView === "BOARD"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Board</span>
              </button>
              <button
                onClick={() => setActiveView("LIST")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeView === "LIST"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
              <button
                onClick={() => setActiveView("METRICS")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                  activeView === "METRICS"
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span>Metrics & Funnel</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Organize and track your active applications with task checklists, recruiter contacts, and instant job match scores.
          </p>
        </div>

        {/* Live Velocity Metrics Pills */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-50/90 backdrop-blur-sm border border-slate-200 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs text-slate-500">Applications:</span>
            <span className="text-xs font-semibold text-slate-900">{applications.length}</span>
          </div>

          <ShinyBadge variant="blue" className="py-1 px-3">
            <Activity className="h-3.5 w-3.5 text-[#0066FF]" />
            <span className="text-xs text-blue-700">Interview Rate:</span>
            <span className="text-xs font-bold text-[#0066FF]">{metrics.interviewRate}%</span>
          </ShinyBadge>

          <ShinyBadge variant="emerald" className="py-1 px-3">
            <Trophy className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs text-emerald-700">Offers:</span>
            <span className="text-xs font-bold text-emerald-700">{metrics.offers}</span>
          </ShinyBadge>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <button
              onClick={handleExportJSON}
              title="Export Pipeline JSON"
              className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 transition"
            >
              <Download className="h-4 w-4" />
            </button>

            <Magnet radius={50} pullFactor={0.25}>
              <button
                onClick={() => setIsIngestOpen(true)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#0066FF] hover:bg-blue-700 text-white transition-all shadow-sm flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Import Job Posting</span>
              </button>
            </Magnet>
          </div>
        </div>
      </div>

      {/* Interactive Search, Filter & Sort Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card">
        <div className="flex flex-1 items-center gap-2.5 max-w-md">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, role title, or location..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-[#0066FF] focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Work Model Filter & Sort Dropdown */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Work Model Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 text-xs">
            {["ALL", "REMOTE", "HYBRID", "ONSITE"].map((model) => (
              <button
                key={model}
                onClick={() => setWorkModelFilter(model)}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  workModelFilter === model
                    ? "bg-white text-slate-900 font-semibold shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {model === "ALL" ? "All Models" : model.charAt(0) + model.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-900 font-medium outline-none cursor-pointer"
            >
              <option value="SCORE" className="bg-white text-slate-900">Match Score</option>
              <option value="DATE" className="bg-white text-slate-900">Date Added</option>
              <option value="COMPANY" className="bg-white text-slate-900">Company Name</option>
            </select>
          </div>
        </div>
      </div>
      {/* VIEW 1: KANBAN BOARD */}
      {activeView === "BOARD" && (
        <div className="w-full overflow-x-auto pb-6 scrollbar-thin">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-h-[640px] items-start min-w-full sm:min-w-[1200px]">
          {COLUMNS.map((col) => {
            const colApps = filteredApplications.filter((a) => a.status === col.id);
            const isTargeted = activeDragTarget === col.id;
            const isQuickAdding = quickAddColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border p-3.5 min-w-[240px] transition-all duration-200 bg-slate-100/70 border-slate-200/80 shadow-xs ${
                  isTargeted
                    ? "border-[#0066FF] bg-blue-50/40 ring-2 ring-blue-500/20 shadow-[0_0_15px_rgba(0,102,255,0.12)]"
                    : "hover:border-slate-300"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      {col.title}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.2 rounded-full bg-white text-slate-600 border border-slate-200/80">
                      {colApps.length}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setQuickAddColumn(isQuickAdding ? null : col.id);
                      setQuickCompany("");
                      setQuickRole("");
                    }}
                    title={`Add job to ${col.title}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Drop Indicator Line */}
                {isTargeted && (
                  <div className="h-1 w-full bg-[#0066FF] rounded-full shadow-[0_0_10px_rgba(0,102,255,0.6)] my-1.5 animate-pulse" />
                )}

                {/* Inline Quick-Add Card Form */}
                <AnimatePresence>
                  {isQuickAdding && (
                    <motion.form
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={(e) => handleQuickAddSubmit(e, col.id)}
                      className="mb-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm space-y-2 overflow-hidden"
                    >
                      <div className="text-[11px] font-semibold text-[#0066FF]">
                        + Add to {col.title}
                      </div>
                      <input
                        type="text"
                        autoFocus
                        required
                        value={quickCompany}
                        onChange={(e) => setQuickCompany(e.target.value)}
                        placeholder="Company name (e.g. Clio)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#0066FF] focus:bg-white"
                      />
                      <input
                        type="text"
                        required
                        value={quickRole}
                        onChange={(e) => setQuickRole(e.target.value)}
                        placeholder="Role title (e.g. Backend Intern)"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#0066FF] focus:bg-white"
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setQuickAddColumn(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] text-slate-500 hover:text-slate-800"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={createMutation.isPending || !quickCompany.trim() || !quickRole.trim()}
                          className="px-3 py-1 rounded-lg text-[11px] font-medium bg-[#0066FF] hover:bg-blue-700 text-white disabled:opacity-40"
                        >
                          {createMutation.isPending ? "Adding..." : "Add"}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 no-scrollbar min-h-[120px]">
                  <AnimatePresence>
                    {colApps.length === 0 && !isQuickAdding ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`h-24 rounded-xl border border-dashed flex flex-col items-center justify-center text-center p-3 transition-colors ${
                          isTargeted
                            ? "border-[#0066FF] bg-blue-50/50 text-[#0066FF]"
                            : "border-slate-300 text-slate-400 bg-white/40"
                        }`}
                      >
                        <span className="text-[11px]">
                          {isTargeted ? "Drop card here" : "No applications"}
                        </span>
                      </motion.div>
                    ) : (
                      colApps.map((app) => (
                        <ApplicationCard
                          key={app.id}
                          application={app}
                          milestone={getMilestoneForApp(app.id)}
                          onClick={() => setSelectedApp(app)}
                          onDragStart={handleDragStart}
                          onQuickAdvance={handleQuickAdvance}
                          onDelete={(id) => deleteMutation.mutate(id)}
                          onArchive={(id) => statusMutation.mutate({ id, toStatus: "WITHDRAWN" })}
                        />
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* VIEW 2: LIST / TABLE VIEW */}
      {activeView === "LIST" && (
        <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-simplify-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-sans text-[11px] border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Company & Role</th>
                  <th className="py-3.5 px-4 font-semibold">Stage</th>
                  <th className="py-3.5 px-4 font-semibold">Match Score</th>
                  <th className="py-3.5 px-4 font-semibold">Checklist</th>
                  <th className="py-3.5 px-4 font-semibold">Contacts</th>
                  <th className="py-3.5 px-4 font-semibold">Location</th>
                  <th className="py-3.5 px-4 font-semibold">Salary</th>
                  <th className="py-3.5 px-4 font-semibold">Applied</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No applications match the current query
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="group hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      {/* Company & Role */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 shadow-xs">
                            {app.company_name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 group-hover:text-[#0066FF] transition-colors">
                              {app.role_title}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {app.company_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Stage dropdown selector */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={app.status}
                          onChange={(e) =>
                            statusMutation.mutate({
                              id: app.id,
                              toStatus: e.target.value as ApplicationStatus,
                            })
                          }
                          className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-[11px] font-medium text-slate-700 outline-none focus:border-[#0066FF]"
                        >
                          {STAGE_ORDER.map((st) => (
                            <option key={st} value={st} className="bg-white text-slate-900">
                              {st.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Match Score */}
                      <td className="py-3.5 px-4">
                        {app.match_score !== undefined ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700">
                            {Math.round(app.match_score)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Checklist Progress */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {(app.task_count || 0) > 0 ? (
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <CheckSquare className="h-3.5 w-3.5 text-[#0066FF]" />
                            <span>
                              {app.completed_tasks || 0}/{app.task_count}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contacts */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {(app.contact_count || 0) > 0 ? (
                          <span className="flex items-center gap-1.5 text-[#0066FF]">
                            <Users className="h-3.5 w-3.5 text-[#0066FF]" />
                            <span>{app.contact_count}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Location & Model */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        <div>{app.job_location || "—"}</div>
                        <div className="text-[10px] text-slate-400">{app.work_model || "ONSITE"}</div>
                      </td>

                      {/* Salary */}
                      <td className="py-3.5 px-4 text-emerald-700 text-[11px] font-semibold">
                        {app.salary_range || "—"}
                      </td>

                      {/* Applied Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "—"}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#0066FF] hover:text-white text-slate-700 border border-slate-200 transition text-[11px] font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: METRICS & FUNNEL ANALYTICS DASHBOARD */}
      {activeView === "METRICS" && (
        <div className="space-y-6">
          {/* Top Velocity KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SpotlightCard className="p-5 space-y-2 shadow-simplify-card" spotlightColor="rgba(59, 130, 246, 0.1)">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">
                Total Tracked Pipeline
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{metrics.total}</span>
                <span className="text-xs text-slate-500">Jobs</span>
              </div>
              <p className="text-[11px] text-slate-400">Across wishlist, applied, and active interviewing stages</p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2 shadow-simplify-card" spotlightColor="rgba(59, 130, 246, 0.15)">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">
                Interview Response Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-[#0066FF]">{metrics.interviewRate}%</span>
                <span className="text-xs text-[#0066FF]/80">Conversion</span>
              </div>
              <p className="text-[11px] text-slate-400">Percentage of submitted applications reaching OA or Interview</p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2 shadow-simplify-card" spotlightColor="rgba(16, 185, 129, 0.15)">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">
                Offer Win Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-700">{metrics.offerRate}%</span>
                <span className="text-xs text-emerald-700/80">({metrics.offers} Total)</span>
              </div>
              <p className="text-[11px] text-slate-400">Final offer conversion rate from submitted jobs</p>
            </SpotlightCard>

            <SpotlightCard className="p-5 space-y-2 shadow-simplify-card" spotlightColor="rgba(99, 102, 241, 0.15)">
              <span className="text-xs text-slate-500 uppercase tracking-wider block font-medium">
                Tasks Completed
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-indigo-600">
                  {metrics.completedTasks}/{metrics.totalTasks}
                </span>
                <span className="text-xs text-indigo-600/80">Done</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {metrics.totalContacts} networking contacts recorded across pipeline
              </p>
            </SpotlightCard>
          </div>

          {/* Visual Pipeline Conversion Funnel Chart */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/90 space-y-6 shadow-simplify-card">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#0066FF]" />
                Application Conversion Funnel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visual drop-off and conversion rates through the recruitment lifecycle
              </p>
            </div>

            {/* Funnel Progress Bars */}
            <div className="space-y-4">
              {[
                { stage: "Wishlist", count: metrics.wishlistCount, color: "bg-slate-400", text: "text-slate-600" },
                { stage: "Applied", count: metrics.appliedCount, color: "bg-blue-600", text: "text-[#0066FF]" },
                { stage: "OA Scheduled", count: metrics.oaCount, color: "bg-amber-500", text: "text-amber-700" },
                { stage: "Interviewing", count: metrics.interviewingCount, color: "bg-indigo-600", text: "text-indigo-700" },
                { stage: "Offer Received", count: metrics.offers, color: "bg-emerald-600", text: "text-emerald-700" },
              ].map((item) => {
                const percent = metrics.total > 0 ? Math.round((item.count / metrics.total) * 100) : 0;
                return (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-semibold ${item.text}`}>{item.stage}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-900 font-bold">{item.count} applications</span>
                        <span className="text-slate-500 text-[11px]">({percent}%)</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${Math.max(percent, item.count > 0 ? 5 : 0)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      <ApplicationDetailModal
        application={selectedApp}
        onClose={() => setSelectedApp(null)}
        onStatusChange={(id, newStatus) => {
          statusMutation.mutate({ id, toStatus: newStatus });
          setSelectedApp((prev) => (prev ? { ...prev, status: newStatus } : null));
        }}
        onDelete={(id) => {
          deleteMutation.mutate(id);
          setSelectedApp(null);
        }}
        onDataChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["applications"] });
        }}
      />

      {/* AI Ingest Modal */}
      <JDIngestModal
        isOpen={isIngestOpen}
        onClose={() => setIsIngestOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["applications"] });
          showToast("Job description ingested! Analyzing matching skills...", "success");
        }}
      />
    </div>
  );
}
