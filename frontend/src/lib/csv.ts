// CSV import/export for the tracker, so people can move over from a spreadsheet.
import type { Application, ApplicationStatus } from "../types";

export const CSV_COLUMNS = [
  "company",
  "role",
  "status",
  "location",
  "work_model",
  "applied_on",
  "deadline",
  "follow_up",
  "pay",
  "job_url",
] as const;

function escapeCell(value: string): string {
  // Prefix formula-like values so spreadsheets don't execute them (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(apps: Application[]): string {
  const rows = apps.map((a) =>
    [
      a.company_name,
      a.role_title,
      a.status.toLowerCase(),
      a.job_location ?? "",
      a.work_model?.toLowerCase() ?? "",
      a.status === "WISHLIST" ? "" : a.applied_date ?? "",
      a.deadline_at ?? "",
      a.follow_up_at ?? "",
      a.salary_range ?? "",
      a.job_description_url ?? "",
    ].map((v) => escapeCell(String(v)))
  );
  return [CSV_COLUMNS.join(","), ...rows.map((r) => r.join(","))].join("\r\n") + "\r\n";
}

/** RFC 4180 parser: quoted fields, escaped quotes, newlines inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

// Header names people commonly use in their own spreadsheets.
const HEADER_ALIASES: Record<(typeof CSV_COLUMNS)[number], string[]> = {
  company: ["company", "company name", "employer", "organization"],
  role: ["role", "title", "position", "job title", "role title"],
  status: ["status", "stage"],
  location: ["location", "city"],
  work_model: ["work_model", "work model", "remote", "workplace"],
  applied_on: ["applied_on", "applied on", "applied", "date applied", "applied date"],
  deadline: ["deadline", "due", "closing date"],
  follow_up: ["follow_up", "follow up", "follow-up"],
  pay: ["pay", "salary", "compensation"],
  job_url: ["job_url", "url", "link", "job link", "posting"],
};

const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  wishlist: "WISHLIST", saved: "WISHLIST", "to apply": "WISHLIST", interested: "WISHLIST",
  applied: "APPLIED", submitted: "APPLIED",
  oa: "OA_SCHEDULED", oa_scheduled: "OA_SCHEDULED", assessment: "OA_SCHEDULED", "online assessment": "OA_SCHEDULED",
  interview: "INTERVIEWING", interviewing: "INTERVIEWING", "phone screen": "INTERVIEWING",
  offer: "OFFER", accepted: "OFFER",
  rejected: "REJECTED", declined: "REJECTED", "no response": "REJECTED", ghosted: "REJECTED",
  withdrawn: "WITHDRAWN", withdrew: "WITHDRAWN",
};

export type ImportRow = {
  company_name: string;
  role_title: string;
  status: ApplicationStatus;
  job_location?: string;
  work_model?: "REMOTE" | "HYBRID" | "ONSITE";
  applied_at?: string;
  deadline_at?: string;
  follow_up_at?: string;
  salary_range?: string;
  job_url?: string;
};

export type ImportResult = { rows: ImportRow[]; errors: { line: number; message: string }[] };

function toIsoDate(value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

function unescapeCell(v: string): string {
  return v.startsWith("'") && /^'[=+\-@]/.test(v) ? v.slice(1) : v;
}

export function importCsv(text: string, maxRows = 1000): ImportResult {
  const [header, ...body] = parseCsv(text);
  if (!header) return { rows: [], errors: [{ line: 1, message: "The file is empty." }] };

  const normalized = header.map((h) => h.trim().toLowerCase());
  const index = Object.fromEntries(
    CSV_COLUMNS.map((col) => [col, normalized.findIndex((h) => HEADER_ALIASES[col].includes(h))])
  ) as Record<(typeof CSV_COLUMNS)[number], number>;
  if (index.company < 0 || index.role < 0) {
    return { rows: [], errors: [{ line: 1, message: "Needs a 'company' and a 'role' column." }] };
  }

  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  body.slice(0, maxRows).forEach((cells, i) => {
    const line = i + 2;
    const get = (col: (typeof CSV_COLUMNS)[number]) =>
      index[col] >= 0 ? unescapeCell((cells[index[col]] ?? "").trim()) : "";
    const company = get("company");
    const role = get("role");
    if (!company || !role) {
      errors.push({ line, message: "Missing company or role." });
      return;
    }
    const rawStatus = get("status").toLowerCase();
    const status = rawStatus ? STATUS_ALIASES[rawStatus] : "WISHLIST";
    if (!status) {
      errors.push({ line, message: `Unknown status "${get("status")}".` });
      return;
    }
    const model = get("work_model").toLowerCase();
    const work_model =
      model === "remote" || model === "yes" ? "REMOTE" : model === "hybrid" ? "HYBRID" : model === "onsite" || model === "on-site" || model === "in person" ? "ONSITE" : undefined;
    const url = get("job_url");
    rows.push({
      company_name: company.slice(0, 200),
      role_title: role.slice(0, 200),
      status,
      job_location: get("location").slice(0, 200) || undefined,
      work_model,
      applied_at: toIsoDate(get("applied_on")),
      deadline_at: toIsoDate(get("deadline")),
      follow_up_at: toIsoDate(get("follow_up")),
      salary_range: get("pay").slice(0, 120) || undefined,
      job_url: /^https?:\/\//i.test(url) ? url.slice(0, 2048) : undefined,
    });
  });
  if (body.length > maxRows) {
    errors.push({ line: maxRows + 2, message: `Only the first ${maxRows} rows were imported.` });
  }
  return { rows, errors };
}
