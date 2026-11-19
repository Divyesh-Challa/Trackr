// Copy-ready answers for the open posting, for boards the extension can't fill (Workday, Jobvite…).
import { copyAnswers } from "../../frontend/src/lib/autofill";
import { COMMON_QUESTIONS } from "../../frontend/src/lib/apply-kit";
import { send, type KitPayload } from "./shared";

const status = document.getElementById("status")!;
const list = document.getElementById("answers")!;

async function render() {
  const { panelUrl = "" } = (await chrome.storage.session.get("panelUrl")) as { panelUrl?: string };
  if (!/^https?:\/\//.test(panelUrl)) {
    status.textContent = "Open a job posting, then click the Trackr button.";
    return;
  }
  const res = await send<KitPayload>({ type: "kit", url: panelUrl });
  list.replaceChildren();
  if (!res.ok) {
    status.textContent = res.error;
    return;
  }
  const kit = res.data;
  status.textContent = kit.application
    ? `${kit.application.role} at ${kit.application.company}. Copy each answer into the form; you press Submit.`
    : "This job isn't in your tracker, so these come from your profile. Copy each into the form; you press Submit.";
  let section = "";
  for (const row of copyAnswers(kit, COMMON_QUESTIONS)) {
    if (row.section !== section) {
      section = row.section;
      const h = document.createElement("h2");
      h.textContent = section;
      list.append(h);
    }
    const div = document.createElement("div");
    div.className = "row";
    const label = document.createElement("b");
    label.textContent = row.label;
    const value = document.createElement("p");
    value.textContent = row.value;
    const copy = document.createElement("button");
    copy.type = "button";
    copy.textContent = "Copy";
    copy.setAttribute("aria-label", `Copy ${row.label}`);
    copy.addEventListener("click", () => navigator.clipboard.writeText(row.value).then(() => (copy.textContent = "Copied")));
    div.append(label, value, copy);
    list.append(div);
  }
}

render();
chrome.storage.session.onChanged.addListener((changes) => {
  if (changes.panelUrl) render();
});
