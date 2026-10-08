"use client";


import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  fetchDiscoveredJobs,
  createApplication,
  fetchResumeBullets,
} from "../../lib/api";
import { DiscoveredJob } from "../../types";
import { springs } from "../../lib/motion-tokens";
import { INITIAL_DISCOVERED_JOBS } from "../../lib/initial-data";
import {
  Search,
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Clock,
  Briefcase,
  Check,
  Filter,
  Layers,
  ArrowRight,
  Share2,
  X,
  Building,
} from "lucide-react";
import VantaBackground from "../../components/ui/VantaBackground";
import ShinyBadge from "../../components/ui/ShinyBadge";
import Magnet from "../../components/ui/Magnet";
import SpotlightCard from "../../components/ui/SpotlightCard";
import DecryptedText from "../../components/ui/DecryptedText";
import { useGSAPStagger } from "../../lib/useGSAPStagger";

// Known domain mappings for logo resolution
const KNOWN_DOMAINS: Record<string, string> = {
  nokia: "nokia.com",
  "definity financial": "definityfinancial.com",
  definity: "definityfinancial.com",
  intel: "intel.com",
  manulife: "manulife.ca",
  td: "td.com",
  "td bank": "td.com",
  cenovus: "cenovus.com",
  "cenovus energy": "cenovus.com",
  acuity: "acuity.com",
  "acuity inc": "acuity.com",
  trc: "trccompanies.com",
  "trc companies": "trccompanies.com",
  "amazon vancouver": "amazon.com",
  amazon: "amazon.com",
  clio: "clio.com",
  "electronic arts (ea)": "ea.com",
  "electronic arts": "ea.com",
  ea: "ea.com",
  "d-wave quantum": "dwavesys.com",
  "d-wave": "dwavesys.com",
  benevity: "benevity.com",
  "neo financial": "neofinancial.com",
  jobber: "getjobber.com",
  altaml: "altaml.com",
  "garmin canada": "garmin.com",
  garmin: "garmin.com",
  shopify: "shopify.com",
  wealthsimple: "wealthsimple.com",
  hootsuite: "hootsuite.com",
  cohere: "cohere.com",
  float: "floatcard.com",
  thinkific: "thinkific.com",
  geotab: "geotab.com",
  ritual: "ritual.co",
  unbounce: "unbounce.com",
  stackadapt: "stackadapt.com",
  stripe: "stripe.com",
  palantir: "palantir.com",
  tesla: "tesla.com",
  cloudflare: "cloudflare.com",
  rivian: "rivian.com",
  databricks: "databricks.com",
};

export default function DiscoverPage() {
  const queryClient = useQueryClient();

  // Filter States
  const [activeLocationFilter, setActiveLocationFilter] = useState<string>("ALL");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Success Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addedJobs, setAddedJobs] = useState<Record<string, string>>({});

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Queries
  const { data: jobs = INITIAL_DISCOVERED_JOBS, isLoading } = useQuery({
    queryKey: ["discoveredJobs"],
    queryFn: () => fetchDiscoveredJobs(),
    initialData: INITIAL_DISCOVERED_JOBS,
  });

  const { data: resumeBullets = [] } = useQuery({
    queryKey: ["resumeBullets"],
    queryFn: fetchResumeBullets,
  });

  // Extract set of user resume words for ATS client check
  const candidateKeywords = useMemo(() => {
    const text = resumeBullets.map((b) => b.content).join(" ").toLowerCase();
    return new Set(text.match(/[a-z0-9#+.]+/g) || []);
  }, [resumeBullets]);

  // Client-side filtering
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Location filter
      if (activeLocationFilter === "TORONTO") {
        if (
          job.province !== "ON" &&
          !job.city.toLowerCase().includes("toronto") &&
          !job.city.toLowerCase().includes("waterloo") &&
          !job.city.toLowerCase().includes("ottawa") &&
          !job.city.toLowerCase().includes("markham") &&
          !job.city.toLowerCase().includes("mississauga") &&
          !job.city.toLowerCase().includes("kitchener")
        )
          return false;
      } else if (activeLocationFilter === "VANCOUVER") {
        if (
          job.province !== "BC" &&
          !job.city.toLowerCase().includes("vancouver") &&
          !job.city.toLowerCase().includes("burnaby") &&
          !job.city.toLowerCase().includes("victoria") &&
          !job.city.toLowerCase().includes("richmond") &&
          !job.city.toLowerCase().includes("kelowna")
        )
          return false;
      } else if (activeLocationFilter === "MONTREAL") {
        if (
          job.province !== "QC" &&
          !job.city.toLowerCase().includes("montreal") &&
          !job.city.toLowerCase().includes("quebec") &&
          !job.city.toLowerCase().includes("laval")
        )
          return false;
      } else if (activeLocationFilter === "ALBERTA") {
        if (
          job.province !== "AB" &&
          job.province !== "SK" &&
          job.province !== "MB" &&
          !job.city.toLowerCase().includes("calgary") &&
          !job.city.toLowerCase().includes("edmonton")
        )
          return false;
      } else if (activeLocationFilter === "REMOTE") {
        if (
          job.province !== "REMOTE" &&
          job.work_model !== "REMOTE" &&
          !job.city.toLowerCase().includes("remote")
        )
          return false;
      }

      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesCompany = job.company_name.toLowerCase().includes(q);
        const matchesRole = job.role_title.toLowerCase().includes(q);
        const matchesCity = job.city.toLowerCase().includes(q);
        const matchesSkills = (job.skills || []).some((s) => s.toLowerCase().includes(q));
        if (!matchesCompany && !matchesRole && !matchesCity && !matchesSkills) return false;
      }

      return true;
    });
  }, [jobs, activeLocationFilter, searchQuery]);

  // Active selected job (defaults to first filtered result)
  const activeJob = useMemo(() => {
    if (!filteredJobs.length) return null;
    if (selectedJobId) {
      const found = filteredJobs.find((j) => j.id === selectedJobId);
      if (found) return found;
    }
    return filteredJobs[0];
  }, [filteredJobs, selectedJobId]);

  // Add to pipeline mutation
  const addMutation = useMutation({
    mutationFn: async ({ job, status }: { job: DiscoveredJob; status: "WISHLIST" | "APPLIED" }) => {
      return createApplication({
        company_name: job.company_name,
        role_title: job.role_title,
        status,
        salary_range: job.salary_range_cad || undefined,
        job_location: `${job.city}, ${job.province}`,
        work_model: job.work_model,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setAddedJobs((prev) => ({ ...prev, [variables.job.id]: variables.status }));
      showToast(
        `Added "${variables.job.role_title}" to ${
          variables.status === "WISHLIST" ? "Wishlist" : "Applied"
        }!`
      );
    },
    onError: (err: any) => {
      showToast(`Failed to add application: ${err.message}`);
    },
  });

  const getLogoUrl = (name: string, rawDomain?: string) => {
    const norm = name.toLowerCase().trim();
    if (KNOWN_DOMAINS[norm]) {
      return `https://www.google.com/s2/favicons?domain=${KNOWN_DOMAINS[norm]}&sz=64`;
    }
    let domain = rawDomain || "";
    // If domain belongs to an ATS platform or subdomain, derive clean domain
    if (
      !domain ||
      domain.includes("workdayjobs.com") ||
      domain.includes("oraclecloud.com") ||
      domain.includes("greenhouse.io") ||
      domain.includes("lever.co") ||
      domain.includes("workable.com") ||
      domain.includes("ashbyhq.com")
    ) {
      domain = `${norm.replace(/[^a-z0-9]/g, "")}.com`;
    } else {
      const parts = domain.split(".");
      if (parts.length > 2 && !domain.endsWith(".co.uk") && !domain.endsWith(".gc.ca")) {
        domain = parts.slice(-2).join(".");
      }
    }
  };

  const jobsListRef = useGSAPStagger({
    selector: "[data-testid='job-feed-card']",
    triggerDeps: [filteredJobs.length, activeLocationFilter],
    duration: 0.35,
    stagger: 0.04,
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs shadow-2xl border border-slate-800"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="relative overflow-hidden p-6 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card flex flex-col md:flex-row md:items-center justify-between gap-5">
        <VantaBackground className="opacity-25" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              Discover Canadian Tech Roles, <span className="italic font-normal text-slate-500">Curated & Matched.</span>
            </h1>
            <ShinyBadge variant="emerald" className="py-0.5 px-3">
              🇨🇦 100% Verified Canadian Roles (ON, BC, QC, AB & Remote)
            </ShinyBadge>
          </div>
          <p className="text-xs text-slate-600 max-w-3xl">
            Exclusively active Canadian tech internships and co-ops with verified live application links.
          </p>
        </div>

        {/* Quick Search */}
        <div className="relative z-10 w-full md:w-80 shrink-0">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Canadian internships (e.g. Toronto, RBC, Shopify, Go)..."
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

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card text-xs">
        {/* Geographic Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1.5 font-medium">Location:</span>
          {[
            { id: "ALL", label: "All Canada 🇨🇦" },
            { id: "TORONTO", label: "Toronto & ON" },
            { id: "VANCOUVER", label: "Vancouver & BC" },
            { id: "MONTREAL", label: "Montreal & QC" },
            { id: "ALBERTA", label: "Alberta & Prairies" },
            { id: "REMOTE", label: "Canada Remote" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveLocationFilter(chip.id)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                activeLocationFilter === chip.id
                  ? "bg-[#0066FF] text-white font-semibold shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Roles Counter */}
        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="text-slate-900 font-semibold">{filteredJobs.length}</span> verified tech internships & co-ops
        </div>
      </div>

      {/* Dual-Pane Discover Feed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[700px] items-start pb-6">
        {/* Left Pane: Dense Scrollable Job List (5 cols) with Gliding Active Selection */}
        <div ref={jobsListRef} className="lg:col-span-5 space-y-3 max-h-[820px] overflow-y-auto pr-1.5 no-scrollbar momentum-scroll">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card">
              Loading verified tech roles...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card text-center text-xs text-slate-500 space-y-2">
              <p>No internships found matching the selected filters.</p>
              <button
                onClick={() => {
                  setActiveLocationFilter("ALL");
                  setSearchQuery("");
                }}
                className="text-[#0066FF] font-medium hover:underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isSelected = activeJob?.id === job.id;
              const hasAdded = addedJobs[job.id];

              return (
                <motion.div
                  key={job.id}
                  data-testid="job-feed-card"
                  onClick={() => setSelectedJobId(job.id)}
                  whileHover={{ y: -2, transition: springs.snappy }}
                  whileTap={{ scale: 0.99 }}
                  className="group relative cursor-pointer"
                >
                  <SpotlightCard
                    spotlightColor="rgba(0, 102, 255, 0.08)"
                    borderColor="rgba(0, 102, 255, 0.3)"
                    className={`rounded-2xl p-4 sm:p-5 transition-all text-left bg-white border ${
                      isSelected
                        ? "border-[#0066FF] bg-blue-50/20 shadow-simplify-hover"
                        : "border-slate-200/90 hover:border-slate-300 shadow-simplify-card hover:shadow-simplify-hover"
                    }`}
                  >
                    {/* Gliding Active Selection Ring via Framer Motion layoutId */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeJobHighlight"
                        className="absolute inset-0 rounded-2xl border-2 border-[#0066FF] bg-blue-50/20 pointer-events-none shadow-[0_0_16px_rgba(0,102,255,0.12)] z-10"
                        transition={springs.glide}
                      />
                    )}

                    {/* Top Row: Logo + Company + Match Pill */}
                    <div className="flex items-start justify-between gap-2 relative z-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                          <img
                            src={getLogoUrl(job.company_name, job.company_domain)}
                            alt={job.company_name}
                            onError={(e: any) => {
                              e.target.style.display = "none";
                            }}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <DecryptedText
                            text={job.company_name}
                            className="font-semibold text-xs text-slate-900 truncate block"
                            animateOn="hover"
                          />
                        </div>
                      </div>

                      {job.match_score !== undefined && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <Sparkles className="h-3 w-3" />
                          <span>{Math.round(job.match_score)}% Match</span>
                        </span>
                      )}
                    </div>

                    {/* Role Title */}
                    <h3 className="font-semibold text-sm text-slate-900 group-hover:text-[#0066FF] transition-colors mt-2.5 line-clamp-2 leading-snug relative z-0">
                      {job.role_title}
                    </h3>

                    {/* Location & Work Model & Salary */}
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-2 flex-wrap relative z-0">
                      <span>{job.city}, {job.province}</span>
                      <span>•</span>
                      <span>{job.work_model}</span>
                      {job.salary_range_cad && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">
                            {job.salary_range_cad}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Footer Pill Row */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-[10px] relative z-0">
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                        Student / Co-op
                      </span>

                      {hasAdded && (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          In {hasAdded}
                        </span>
                      )}
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Right Pane: Rich Job Details View (7 cols, sticky) */}
        <div className="lg:col-span-7 sticky top-20">
          {activeJob ? (
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card p-6 space-y-6 max-h-[820px] overflow-y-auto no-scrollbar momentum-scroll">
              {/* Header: Company, Role & Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                      <img
                        src={getLogoUrl(activeJob.company_name, activeJob.company_domain)}
                        alt={activeJob.company_name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-slate-900">
                        {activeJob.company_name}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <MapPin className="h-3 w-3 text-[#0066FF]" />
                        <span>{activeJob.city}, {activeJob.province} ({activeJob.work_model})</span>
                      </div>
                    </div>
                  </div>

                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900 pt-1">
                    {activeJob.role_title}
                  </h2>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => addMutation.mutate({ job: activeJob, status: "WISHLIST" })}
                    disabled={addMutation.isPending}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
                  >
                    + Wishlist
                  </button>

                  <Magnet radius={50} pullFactor={0.25}>
                    <button
                      onClick={() => addMutation.mutate({ job: activeJob, status: "APPLIED" })}
                      disabled={addMutation.isPending}
                      className="px-4 py-2 rounded-lg text-xs font-medium bg-[#0066FF] hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add to Applied</span>
                    </button>
                  </Magnet>

                  {activeJob.job_url && (
                    <a
                      href={activeJob.job_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition"
                      title="Apply on employer ATS site"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {/* Highlights Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Compensation</span>
                  <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">
                    {activeJob.salary_range_cad || "Competitive"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Program</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
                    Tech Intern / Co-op
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Match Score</span>
                  <span className="text-xs font-semibold text-emerald-700 mt-0.5 block">
                    {activeJob.match_score ? `${Math.round(activeJob.match_score)}% Match` : "High Match"}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Deadline</span>
                  <span className="text-xs font-semibold text-amber-700 mt-0.5 block">
                    {activeJob.deadline_at
                      ? new Date(activeJob.deadline_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      : "Rolling"}
                  </span>
                </div>
              </div>

              {/* Resume Keyword Checklist */}
              <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#0066FF]" />
                    Resume Keyword Checklist
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Skills you have vs. keywords in the job description
                  </span>
                </div>

                {/* Keyword Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Skills Found */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 uppercase tracking-wider">
                      <CheckCircle2 className="h-3 w-3" />
                      Skills Found in Resume
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {(activeJob.skills || ["Go", "Python", "PostgreSQL", "Docker"]).map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                        >
                          <Check className="h-2.5 w-2.5 text-emerald-600" />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Requirements / JD Highlights */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 uppercase tracking-wider">
                      <AlertTriangle className="h-3 w-3" />
                      Key Role Criteria
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Canadian Work Authorization
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Co-op Term Availability
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        Active University Enrollment
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Job Description */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Role Overview
                </h3>
                <div className="text-xs text-slate-700 leading-relaxed space-y-3 whitespace-pre-wrap">
                  {activeJob.description}
                </div>
              </div>

              {/* Requirements List */}
              {activeJob.requirements && activeJob.requirements.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Core Qualifications
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {activeJob.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-[#0066FF] font-bold mt-0.5">•</span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Direct Apply Call-to-Action Bar */}
              {activeJob.job_url && (
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>Verified active link to employer career portal.</span>
                  </div>
                  <a
                    href={activeJob.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#0066FF] hover:bg-blue-700 text-white shadow-sm transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>Apply Directly at {activeJob.company_name}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-simplify-card p-12 text-center text-xs text-slate-500">
              Select an internship from the feed to view full role details and match breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
