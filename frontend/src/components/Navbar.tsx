"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Layers,
  Compass,
  User,
  FileText,
  Sparkles,
  Sun,
  Moon,
  Download,
  MapPin,
} from "lucide-react";
import { springs } from "../lib/motion-tokens";
import DecryptedText from "./ui/DecryptedText";
import ShinyBadge from "./ui/ShinyBadge";
import Magnet from "./ui/Magnet";

export default function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains("dark");
    setIsDark(isDarkMode);
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  };

  const navItems = [
    { href: "/", label: "Tracker", icon: Layers },
    { href: "/discover", label: "Discover", icon: Compass, badge: "🇨🇦 Internships" },
    { href: "/resume", label: "Resume Studio", icon: FileText },
    { href: "/simulator", label: "Interview Practice", icon: Sparkles },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-x-auto">
      <div className="max-w-[1720px] mx-auto flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 gap-4">
        {/* Left: Brand & Nav Links */}
        <div className="flex items-center gap-3 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl bg-[#0066FF] flex items-center justify-center text-white font-black text-sm shadow-sm group-hover:scale-105 transition-transform">
              Tr.
            </div>
            <div className="flex items-center gap-2">
              <DecryptedText
                text="trackr"
                className="font-bold text-base tracking-tight text-slate-900 group-hover:text-[#0066FF] transition-colors"
                animateOn="hover"
              />
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Canada
              </span>
            </div>
          </Link>

          {/* Navigation Links with Gliding Selection Ring */}
          <nav className="flex items-center gap-1 relative" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "text-[#0066FF] font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="navPillHighlight"
                      className="absolute inset-0 bg-blue-50/80 border border-blue-200/70 rounded-xl -z-10 shadow-xs"
                      transition={springs.glide}
                    />
                  )}
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#0066FF]" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <ShinyBadge variant="emerald" className="text-[9px] py-0 px-2 font-medium">
                      {item.badge}
                    </ShinyBadge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Regional Scope, Autofill Profile Link & Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
              <MapPin className="h-3 w-3 text-[#0066FF]" />
              <span>Vancouver • Calgary • Toronto • Remote</span>
            </span>
          </div>

          <Magnet radius={50} pullFactor={0.25}>
            <Link
              href="/profile"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-[#0066FF] hover:bg-blue-700 text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Master Profile</span>
            </Link>
          </Magnet>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
          </button>
        </div>
      </div>
    </header>
  );
}
