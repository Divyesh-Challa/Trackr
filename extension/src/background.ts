// Talks to the Trackr API (pages can't, because of CORS) and opens the answers side panel.
import { DEFAULT_BASE_URL, type Message, type Reply, type Settings } from "./shared";

async function api(path: string, init: RequestInit = {}): Promise<unknown> {
  const { baseUrl = DEFAULT_BASE_URL, token } = (await chrome.storage.local.get(["baseUrl", "token"])) as Settings;
  if (!token) throw new Error("Add your Trackr token in the extension's options first.");
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? `Trackr answered ${res.status}.`);
  return body;
}

async function handle(msg: Message): Promise<unknown> {
  if (msg.type === "kit") return api(`/api/v1/kit?url=${encodeURIComponent(msg.url)}`);
  if (msg.type === "receipt") return api("/api/v1/receipts", { method: "POST", body: JSON.stringify(msg.body) });
  throw new Error("Unknown request.");
}

chrome.runtime.onMessage.addListener((msg: Message, _sender, reply: (r: Reply<unknown>) => void) => {
  handle(msg).then(
    (data) => reply({ ok: true, data }),
    (e: Error) => reply({ ok: false, error: e.message || "Couldn't reach Trackr." })
  );
  return true; // reply asynchronously
});

// The action opens copy-ready answers for whatever posting is open, on any ATS.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  chrome.sidePanel.open({ tabId: tab.id });
  chrome.storage.session.set({ panelUrl: tab.url ?? "" });
});
