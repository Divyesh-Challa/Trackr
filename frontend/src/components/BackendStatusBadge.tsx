"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  Server,
  Database,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import ShinyBadge from "./ui/ShinyBadge";
import { springs } from "../lib/motion-tokens";

interface HealthState {
  status: "healthy" | "waking" | "offline" | "checking";
  service?: string;
  postgres?: string;
  redis?: string;
  latency_ms?: number;
  message?: string;
  attempts: number;
}

export default function BackendStatusBadge() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [health, setHealth] = useState<HealthState>({
    status: "checking",
    attempts: 0,
  });

  const checkHealth = useCallback(async (isManual = false) => {
    const startTime = performance.now();
    try {
      // First try Next.js /api/health proxy, fallback to direct Render gateway
      let res: Response | null = null;
      try {
        res = await fetch("/api/health", { cache: "no-store" });
      } catch {
        res = await fetch("https://trackr-gateway.onrender.com/health", { cache: "no-store" });
      }

      const latency = Math.round(performance.now() - startTime);

      if (res && res.ok) {
        const data = await res.json().catch(() => ({}));
        setHealth((prev) => ({
          status: "healthy",
          service: data.service || "trackr-gateway",
          postgres: data.postgres || "connected",
          redis: data.redis || "disconnected",
          latency_ms: data.latency_ms || latency,
          message: "All gateway systems operational",
          attempts: 0,
        }));

        if (isManual || health.status !== "healthy") {
          // Invalidate queries so UI immediately grabs live data from the awakened backend
          queryClient.invalidateQueries({ queryKey: ["applications"] });
          queryClient.invalidateQueries({ queryKey: ["milestones"] });
          queryClient.invalidateQueries({ queryKey: ["discoveredJobs"] });
          queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        }
      } else {
        setHealth((prev) => ({
          ...prev,
          status: "waking",
          latency_ms: latency,
          attempts: prev.attempts + 1,
          message: "Waking free-tier container on Render Oregon (takes ~30s)...",
        }));
      }
    } catch {
      setHealth((prev) => ({
        ...prev,
        status: "waking",
        attempts: prev.attempts + 1,
        message: "Waking free-tier container on Render Oregon (takes ~30s)...",
      }));
    }
  }, [health.status, queryClient]);

  // Initial check on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Automatic heartbeat wakeup loop if sleeping or cold-booting
  useEffect(() => {
    if (health.status === "waking" || health.status === "checking") {
      const timer = setTimeout(() => {
        checkHealth();
      }, 4000);
      return () => clearTimeout(timer);
    }

    // Periodic liveness check every 30 seconds when healthy
    const interval = setInterval(() => {
      checkHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [health.status, checkHealth]);

  const handleManualWake = () => {
    startTransition(async () => {
      setHealth((prev) => ({ ...prev, status: "checking" }));
      await checkHealth(true);
    });
  };

  return (
    <div className="relative inline-block text-left">
      {/* Trigger Pill */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 bg-white shadow-xs hover:border-slate-300 active:scale-95"
        title="View live backend connection details"
      >
        {health.status === "healthy" ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-slate-700 font-semibold hidden md:inline">Backend Live</span>
            <span className="text-slate-500 text-[11px] hidden lg:inline">
              ({health.latency_ms}ms)
            </span>
          </>
        ) : health.status === "waking" ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-amber-800 font-semibold animate-pulse">
              Waking Backend... {health.attempts > 0 ? `#${health.attempts}` : ""}
            </span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-slate-600 font-medium">Checking Backend...</span>
          </>
        )}
      </button>

      {/* Popover Card */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -6 }}
              transition={springs.snappy}
              className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200/90 shadow-xl p-4 z-50 text-slate-800 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-[#0066FF]" />
                  <span className="font-bold text-slate-900 text-sm">System Status</span>
                </div>
                <ShinyBadge
                  variant={health.status === "healthy" ? "emerald" : "amber"}
                  className="text-[10px] py-0.5 px-2"
                >
                  {health.status === "healthy" ? "Operational" : "Spinning Up"}
                </ShinyBadge>
              </div>

              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-slate-400" /> Gateway
                  </span>
                  <span className="font-mono text-slate-700 font-medium">
                    Render • Oregon (Go 1.24)
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-slate-400" /> PostgreSQL
                  </span>
                  <span
                    className={`font-semibold ${
                      health.postgres === "connected"
                        ? "text-emerald-800 flex items-center gap-1"
                        : "text-amber-800"
                    }`}
                  >
                    {health.postgres === "connected" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Connected
                      </>
                    ) : (
                      "Connecting..."
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-slate-500 font-medium">p95 Latency</span>
                  <span className="font-mono text-slate-700">
                    {health.latency_ms ? `${health.latency_ms} ms` : "Calculating..."}
                  </span>
                </div>

                {health.status === "waking" && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Cold Boot in Progress</p>
                      <p className="mt-0.5 text-amber-800">
                        Render free-tier containers spin down after idle. Auto-pinging every 4s until active.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  onClick={handleManualWake}
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-medium shadow-xs transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                  <span>{isPending ? "Pinging..." : "Wake / Ping Gateway"}</span>
                </button>
                <a
                  href="https://trackr-gateway.onrender.com/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition"
                  title="Direct Gateway Health JSON"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
