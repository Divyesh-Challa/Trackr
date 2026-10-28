"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Compass, FileText, Layers, LogIn, LogOut, Menu, Sparkles, User, X } from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { AI_FEATURES_ENABLED } from "../lib/ai-legacy";
import { springs } from "../lib/motion-tokens";
import DecryptedText from "./ui/DecryptedText";
import Magnet from "./ui/Magnet";

export default function Navbar() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authKnown, setAuthKnown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthKnown(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const navItems = [
    ...(user ? [{ href: "/board", label: "Applications", icon: Layers }] : []),
    { href: "/discover", label: "Discover", icon: Compass },
    ...(user && AI_FEATURES_ENABLED
      ? [
          { href: "/resume", label: "Resume Studio", icon: FileText },
          { href: "/simulator", label: "Interview Practice", icon: Sparkles },
        ]
      : []),
    ...(user ? [{ href: "/profile", label: "Profile", icon: User }] : []),
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const authControl = !authKnown ? null : user ? (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        title={user.email ?? undefined}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Sign out
      </button>
    </form>
  ) : (
    <Magnet>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 rounded-xl bg-[#0066FF] px-3.5 py-2 text-[13px] font-medium text-white shadow-sm transition hover:bg-[#0052cc]"
      >
        <LogIn className="h-4 w-4" aria-hidden /> Sign in
      </Link>
    </Magnet>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href={user ? "/board" : "/"} className="group flex items-center gap-2.5" aria-label="Trackr home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0066FF] text-sm font-black text-white shadow-sm transition-transform group-hover:scale-105">
              Tr.
            </span>
            <DecryptedText
              text="trackr"
              animateOn="hover"
              className="text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-[#0066FF]"
            />
          </Link>

          <nav aria-label="Main" className="relative hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    active ? "text-[#0066FF]" : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-xl border border-blue-200/70 bg-blue-50/80"
                      transition={springs.glide}
                    />
                  )}
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:block">{authControl}</div>

        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ opacity: 0, y: reduce ? 0 : -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -8 }}
            transition={springs.snappy}
            className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden"
          >
            <ul className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium ${
                      isActive(href) ? "bg-blue-50 text-[#0066FF]" : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-slate-100 pt-3">{authControl}</div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
