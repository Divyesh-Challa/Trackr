import { DEFAULT_BASE_URL, type Settings } from "./shared";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const baseUrl = $<HTMLInputElement>("baseUrl");
const token = $<HTMLInputElement>("token");
const resume = $<HTMLInputElement>("resume");
const status = $<HTMLParagraphElement>("status");

chrome.storage.local.get(["baseUrl", "token", "resume"]).then((s: Settings) => {
  baseUrl.value = s.baseUrl ?? DEFAULT_BASE_URL;
  token.value = s.token ?? "";
  $("resumeName").textContent = s.resume ? `Attaching ${s.resume.name}` : "No résumé yet; forms will ask you to attach one.";
});

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

$("settings").addEventListener("submit", async (e) => {
  e.preventDefault();
  const origin = new URL(baseUrl.value).origin;
  // Addresses other than trackr-portal and localhost need the user's OK to be contacted.
  if (!(await chrome.permissions.contains({ origins: [`${origin}/*`] })) && !(await chrome.permissions.request({ origins: [`${origin}/*`] }))) {
    status.textContent = `The extension needs permission to reach ${origin}.`;
    return;
  }
  const next: Settings = { baseUrl: origin, token: token.value.trim() };
  const file = resume.files?.[0];
  if (file) {
    if (file.size > 5_000_000) {
      status.textContent = "That PDF is over 5 MB. Most forms won't take it either.";
      return;
    }
    next.resume = { name: file.name, dataUrl: await readAsDataUrl(file) };
    $("resumeName").textContent = `Attaching ${file.name}`;
  }
  await chrome.storage.local.set(next);
  status.textContent = "Saved.";
});
