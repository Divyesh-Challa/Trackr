// Messages between the content script, the side panel and the service worker, and stored settings.
import type { FilledField, KitPayload } from "../../frontend/src/lib/autofill";

export const DEFAULT_BASE_URL = "https://trackr-portal.vercel.app";

export type Settings = { baseUrl?: string; token?: string; resume?: { name: string; dataUrl: string } };

export type Message =
  | { type: "kit"; url: string }
  | { type: "receipt"; body: { job_url: string; answers: FilledField[]; cover_letter?: string; company?: string; role?: string } };

export type Reply<T> = { ok: true; data: T } | { ok: false; error: string };

export function send<T>(msg: Message): Promise<Reply<T>> {
  return chrome.runtime.sendMessage(msg).catch((e: Error) => ({ ok: false as const, error: e.message }));
}

export type { FilledField, KitPayload };
