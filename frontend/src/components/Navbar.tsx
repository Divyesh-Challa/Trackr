"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BookOpen, Compass, FileText, Layers, LogIn, LogOut, Menu, Search, Sparkles, User, X } from "lucide-react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase/client";
import { springs } from "../lib/motion-tokens";
import ThemeToggle from "./ThemeToggle";
import CommandPalette, { openPalette } from "./CommandPalette";

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
    ...(user
      ? [
          { href: "/board", label: "Applications", icon: Layers },
          { href: "/resume", label: "Resume", icon: FileText },
        ]
      : []),
    { href: "/discover", label: "Discover", icon: Compass },
    { href: "/guide", label: "Guide", icon: BookOpen },
    { href: "/pricing", label: "Pricing", icon: Sparkles },
    ...(user ? [{ href: "/profile", label: "Profile", icon: User }] : []),
  ];

  const tabItems = navItems.filter((i) => ["/board", "/resume", "/discover", "/profile"].includes(i.href));

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const authControl = !authKnown ? null : user ? (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        title={user.email ?? undefined}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-900/5 hover:text-slate-900 active:scale-[0.97]"
      >
        <LogOut className="h-4 w-4" aria-hidden /> Sign out
      </button>
    </form>
  ) : (
    <Link
      href="/login"
      className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink shadow-sm transition hover:bg-accent-hover active:scale-[0.97]"
    >
      <LogIn className="h-4 w-4" aria-hidden /> Sign in
    </Link>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-900/[0.06] bg-background/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1720px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link
              href={user ? "/board" : "/"}
              aria-label="Trackr home"
              className="font-wordmark text-2xl font-semibold leading-none text-slate-900 transition-colors hover:text-accent"
            >
              trackr
            </Link>

            <nav aria-label="Main" className="relative hidden items-center gap-1 md:flex">
              {navItems.map(({ href, label }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active ? "text-slate-900" : "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 -z-10 rounded-full bg-surface shadow-sm"
                        transition={springs.glide}
                      />
                    )}
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={openPalette}
              className="inline-flex h-9 w-56 items-center gap-2 rounded-full bg-surface px-3.5 text-sm text-slate-500 shadow-sm transition hover:text-slate-700 lg:w-64"
            >
              <Search className="h-4 w-4" aria-hidden />
              <span className="flex-1 text-left">Search or jump to…</span>
              <kbd className="rounded-md bg-slate-100 px-1.5 text-[11px] font-medium text-slate-600">⌘K</kbd>
            </button>
            <ThemeToggle />
            {authControl}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search or jump to"
              className="rounded-full p-2 text-slate-700 hover:bg-slate-900/5"
            >
              <Search className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="rounded-full p-2 text-slate-700 hover:bg-slate-900/5"
            >
              {menuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
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
              className="border-t border-slate-900/[0.06] px-4 pb-4 pt-2 md:hidden"
            >
              <ul className="space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={isActive(href) ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] font-medium ${
                        isActive(href) ? "bg-surface text-slate-900 shadow-sm" : "text-slate-700 hover:bg-slate-900/5"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-200 pt-3">
                <ThemeToggle />
                {authControl}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Phones: the four places people work live in a floating tab bar, the rest stays in the menu. */}
      {user && (
        <nav
          id="tab-bar"
          aria-label="Sections"
          className="fixed inset-x-3 bottom-3 z-40 rounded-2xl bg-surface/90 p-1.5 shadow-xl backdrop-blur-xl md:hidden"
        >
          <ul className="grid grid-cols-4">
            {tabItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <motion.div whileTap={reduce ? undefined : { scale: 0.92 }} transition={springs.tap}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium ${active ? "text-accent" : "text-slate-600"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="tab-pill"
                          transition={springs.glide}
                          className="absolute inset-0 -z-10 rounded-xl bg-slate-100"
                        />
                      )}
                      <Icon className="h-5 w-5" aria-hidden />
                      {label}
                    </Link>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
      <CommandPalette links={navItems} signedIn={!!user} />
    </>
  );
}
