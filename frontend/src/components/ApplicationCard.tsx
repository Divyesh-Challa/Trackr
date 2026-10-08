"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Application, ApplicationMilestone, ApplicationStatus } from "../types";
import {
  Clock,
  CheckSquare,
  ChevronRight,
  Sparkles,
  MoreHorizontal,
  Trash2,
  Archive,
} from "lucide-react";
import { springs } from "../lib/motion-tokens";
import SpotlightCard from "./ui/SpotlightCard";
import ShinyBadge from "./ui/ShinyBadge";
import DecryptedText from "./ui/DecryptedText";

interface ApplicationCardProps {
  application: Application;
  milestone?: ApplicationMilestone;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onQuickAdvance?: (id: string, currentStatus: ApplicationStatus) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}

// Known domain mappings for logo resolution
const KNOWN_DOMAINS: Record<string, string> = {
  amazon: "amazon.com",
  "amazon vancouver": "amazon.com",
  clio: "clio.com",
  "electronic arts": "ea.com",
  ea: "ea.com",
  "electronic arts (ea)": "ea.com",
  "d-wave": "dwavesys.com",
  "d-wave quantum": "dwavesys.com",
  benevity: "benevity.com",
  "neo financial": "neofinancial.com",
  jobber: "getjobber.com",
  altaml: "altaml.com",
  garmin: "garmin.com",
  "garmin canada": "garmin.com",
  shopify: "shopify.com",
  wealthsimple: "wealthsimple.com",
  hootsuite: "hootsuite.com",
  telus: "telus.com",
  rivian: "rivian.com",
  databricks: "databricks.com",
  stripe: "stripe.com",
  palantir: "palantir.com",
  tesla: "tesla.com",
  cloudflare: "cloudflare.com",
  cohere: "cohere.com",
  stackadapt: "stackadapt.com",
  nokia: "nokia.com",
  "definity financial": "definityfinancial.com",
  intel: "intel.com",
  manulife: "manulife.ca",
  td: "td.com",
  "td bank": "td.com",
  cenovus: "cenovus.com",
  "cenovus energy": "cenovus.com",
  acuity: "acuity.com",
  trc: "trccompanies.com",
};

export default function ApplicationCard({
  application,
  milestone,
  onClick,
  onDragStart,
  onQuickAdvance,
  onDelete,
  onArchive,
}: ApplicationCardProps) {
  const [imgError, setImgError] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  // Derive domain for company logo
  const normalized = application.company_name.toLowerCase().trim();
  const domain =
    KNOWN_DOMAINS[normalized] ||
    `${normalized.replace(/[^a-z0-9]/g, "")}.com`;
  const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

  const renderMatchScore = (score?: number) => {
    if (score === undefined || score === null) return null;
    const rounded = Math.round(score);
    if (rounded >= 85) {
      return (
        <ShinyBadge variant="emerald" className="text-[10px] py-0.5 px-2 font-bold">
          <Sparkles className="h-2.5 w-2.5 inline mr-1" />
          {rounded}% Match
        </ShinyBadge>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Sparkles className="h-3 w-3" />
        <span>{rounded}% Match</span>
      </span>
    );
  };

  // Build compact location & compensation string
  const locCompParts: string[] = [];
  if (application.job_location) locCompParts.push(application.job_location);
  if (application.work_model) {
    const wm =
      application.work_model === "REMOTE"
        ? "Remote"
        : application.work_model === "HYBRID"
        ? "Hybrid"
        : "Onsite";
    locCompParts.push(wm);
  }
  if (application.salary_range) locCompParts.push(application.salary_range);
  const locCompString = locCompParts.join(" • ");

  return (
    <motion.div
      layout
      data-testid="application-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -2, transition: springs.snappy }}
      whileTap={{ scale: 0.98 }}
      draggable
      onDragStart={(e: any) => onDragStart(e, application.id)}
      onClick={onClick}
      className="group relative cursor-grab active:cursor-grabbing select-none"
    >
      <SpotlightCard
        spotlightColor="rgba(0, 102, 255, 0.08)"
        borderColor="rgba(0, 102, 255, 0.3)"
        className="rounded-2xl border border-slate-200/90 hover:border-blue-300 p-4 sm:p-5 space-y-3 transition-all shadow-simplify-card hover:shadow-simplify-hover bg-white"
      >
        {/* Top Row: Company Logo + Name & Match Score */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
              {!imgError ? (
                <img
                  src={logoUrl}
                  alt={application.company_name}
                  onError={() => setImgError(true)}
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-[11px] font-bold text-slate-800">
                  {application.company_name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <DecryptedText
              text={application.company_name}
              className="font-semibold text-xs text-slate-900 truncate"
              animateOn="hover"
            />
          </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {renderMatchScore(application.match_score)}

          {/* Action Menu Trigger (...) */}
          {(onDelete || onArchive) && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen((prev) => !prev);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                aria-label="Application options"
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                title="Options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>

              {/* Action Dropdown Menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1 text-xs z-30"
                    role="menu"
                  >
                    {onArchive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onArchive(application.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-700 hover:bg-slate-50 transition"
                        role="menuitem"
                      >
                        <Archive className="h-3.5 w-3.5 text-slate-400" />
                        <span>Move to Withdrawn</span>
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDelete(application.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50 transition"
                        role="menuitem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete from Board</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Role Title */}
      <div>
        <h4 className="font-semibold text-[13px] text-slate-900 line-clamp-2 leading-snug group-hover:text-[#0066FF] transition-colors">
          {application.role_title}
        </h4>
      </div>

      {/* Location, Work Model & Compensation Row */}
      {locCompString && (
        <div className="text-[11px] text-slate-500 truncate">
          {locCompString}
        </div>
      )}

      {/* Card Footer: Tasks, Deadlines & Quick Advance */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 min-w-0">
          {/* Task Completion Pill */}
          {(application.task_count || 0) > 0 ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                application.completed_tasks === application.task_count
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}
            >
              <CheckSquare className="h-3 w-3" />
              <span>
                {application.completed_tasks || 0}/{application.task_count} tasks
              </span>
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 truncate">
              {application.applied_date
                ? `Applied ${new Date(application.applied_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : ""}
            </span>
          )}

          {/* Milestone Tag */}
          {milestone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <Clock className="h-2.5 w-2.5" />
              <span>{milestone.milestone_type}</span>
            </span>
          )}
        </div>

        {/* Action Controls on Footer */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Quick Trash Icon on Card Hover */}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(application.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
              aria-label="Delete application"
              title="Delete from Board"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Quick Advance Button (Hover only) */}
          {onQuickAdvance && (
            <button
              type="button"
              data-testid="advance-stage-btn"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdvance(application.id, application.status as ApplicationStatus);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              aria-label="Advance stage"
              title="Advance stage"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      </SpotlightCard>
    </motion.div>
  );
}
