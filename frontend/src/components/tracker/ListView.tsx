"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { STATUS_LABEL, nextDue } from "@/lib/board";
import type { Application } from "@/types";

type SortKey = "company" | "status" | "applied" | "due";

export default function ListView({ apps, onOpen }: { apps: Application[]; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: "applied", asc: false });
  const rows = useMemo(() => {
    const value = (a: Application): string | number => {
      switch (sort.key) {
        case "company": return a.company_name.toLowerCase();
        case "status": return Object.keys(STATUS_LABEL).indexOf(a.status);
        case "applied": return a.status === "WISHLIST" ? "" : a.applied_date;
        case "due": return nextDue(a, new Date(), 3650)?.days ?? Number.MAX_SAFE_INTEGER;
      }
    };
    return [...apps].sort((a, b) => {
      const x = value(a), y = value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.asc ? 1 : -1);
    });
  }, [apps, sort]);

  const header = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.asc ? "ascending" : "descending") : "none"} className="px-3 py-2 text-left font-medium">
      <button type="button" onClick={() => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }))} className="inline-flex items-center gap-1 hover:text-slate-900">
        {label} <ArrowUpDown className="h-3.5 w-3.5" aria-hidden />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-[13px] text-slate-600">
          <tr>
            {header("company", "Company & role")}
            {header("status", "Status")}
            <th scope="col" className="px-3 py-2 text-left font-medium">Location</th>
            {header("applied", "Applied")}
            {header("due", "Next date")}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((a) => {
            const due = nextDue(a, new Date(), 3650);
            return (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => onOpen(a.id)} className="text-left">
                    <span className="block font-medium text-slate-900 hover:text-[#0066FF]">{a.role_title}</span>
                    <span className="text-[13px] text-slate-600">{a.company_name}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-slate-700">{STATUS_LABEL[a.status]}</td>
                <td className="px-3 py-2.5 text-slate-600">{a.job_location ?? "—"}</td>
                <td className="px-3 py-2.5 text-slate-600">{a.status === "WISHLIST" ? "—" : a.applied_date}</td>
                <td className={`px-3 py-2.5 ${due && due.days < 0 ? "text-rose-700" : "text-slate-600"}`}>{due ? due.label : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
