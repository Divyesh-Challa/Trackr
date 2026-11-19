// Runs on Greenhouse, Lever and Ashby forms. "Fill with Trackr" fills what the profile and the
// apply kit know and attaches the résumé. It never submits: when the user presses Submit
// themselves, it records what the form said as a receipt in Trackr.
import { answerField } from "../../frontend/src/lib/autofill";
import { pickOption, type KitQuestion } from "../../frontend/src/lib/apply-kit";
import { send, type FilledField, type KitPayload, type Settings } from "./shared";

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Field = { el: Control; group?: HTMLInputElement[]; question: KitQuestion };

const FILLED = "2px solid #2563eb";
const clean = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const visible = (el: Element) => (el as HTMLElement).offsetParent !== null || el.getClientRects().length > 0;

/** The question a control answers: its <label>, ARIA name, fieldset legend, or a nearby label-ish element. */
function labelOf(el: Control): string {
  const own = el.labels?.[0] ? clean(el.labels[0].innerText) : "";
  // Radio, checkbox and file labels name the choice or the button ("Attach"), not the question.
  if (own && !(el instanceof HTMLInputElement && /^(radio|checkbox|file)$/.test(el.type))) return own;
  const by = el.getAttribute("aria-labelledby");
  if (by) {
    const text = clean(by.split(/\s+/).map((id) => document.getElementById(id)?.innerText ?? "").join(" "));
    if (text) return text;
  }
  const legend = el.closest("fieldset")?.querySelector("legend");
  if (legend) return clean(legend.innerText);
  if (el.getAttribute("aria-label")) return clean(el.getAttribute("aria-label"));
  let node: Element | null = el.parentElement;
  for (let i = 0; node && i < 5; i++, node = node.parentElement) {
    const label = node.querySelector(":scope > label, :scope > [class*='label' i], :scope > [class*='question' i]");
    if (label && !label.contains(el)) return clean((label as HTMLElement).innerText);
  }
  return own || clean(el.getAttribute("placeholder") || el.getAttribute("name"));
}

const sectionOf = (el: Element) =>
  clean(el.closest("fieldset")?.querySelector("legend")?.textContent) || (/eeo|demographic|self.?ident|voluntary/i.test(el.closest("section, [class*='section' i]")?.textContent?.slice(0, 200) ?? "") ? "Self-identification" : "Application");

/** Every answerable control on the page, radios grouped by name. */
function scan(): Field[] {
  const fields: Field[] = [];
  const groups = new Map<string, HTMLInputElement[]>();
  for (const el of document.querySelectorAll<Control>("input, textarea, select")) {
    if (el.closest("#trackr-autofill")) continue;
    if (el instanceof HTMLInputElement) {
      if (/^(hidden|submit|button|reset|image|password|search)$/.test(el.type)) continue;
      if (el.type === "radio") {
        const key = el.name || labelOf(el);
        if (!groups.has(key)) {
          groups.set(key, []);
          fields.push({ el, group: groups.get(key), question: { section: sectionOf(el), label: labelOf(el), required: el.required, kind: "select" } });
        }
        groups.get(key)!.push(el);
        continue;
      }
      if (el.type === "checkbox") continue; // consent boxes are the user's call
    }
    if (el.type !== "file" && !visible(el)) continue;
    const kind: KitQuestion["kind"] =
      el instanceof HTMLSelectElement ? "select" : el instanceof HTMLTextAreaElement ? "textarea" : el.type === "file" ? "file" : "text";
    const options = el instanceof HTMLSelectElement ? [...el.options].map((o) => clean(o.text)).filter((t) => t && !/^(select|choose|please select)\b/i.test(t)) : undefined;
    fields.push({ el, question: { section: sectionOf(el), label: labelOf(el), required: el.required || el.getAttribute("aria-required") === "true", kind, ...(options ? { options } : {}) } });
  }
  for (const f of fields) {
    if (f.group) f.question.options = f.group.map((r) => clean(r.labels?.[0]?.innerText || r.value));
  }
  return fields.filter((f) => f.question.label);
}

/** Sets a value the way typing would, so React and Vue forms see it. */
function setValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("blur", { bubbles: true }));
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Only this combobox's own listbox: pages keep other option lists (phone country codes) in the DOM.
const optionsOf = (el: HTMLInputElement) => [
  ...(document.getElementById(el.getAttribute("aria-controls") ?? "")?.querySelectorAll<HTMLElement>("[role='option']") ?? []),
];

/** Some comboboxes (Greenhouse's react-select) only open for real clicks, so say what to pick. */
function suggest(el: HTMLElement, value: string) {
  const anchor = el.closest("[class*='control' i]") ?? el;
  if (anchor.nextElementSibling?.classList.contains("trackr-hint")) return;
  const hint = document.createElement("p");
  hint.className = "trackr-hint";
  hint.style.cssText = "margin:4px 0 0;font:13px system-ui,sans-serif;color:#1d4ed8";
  hint.textContent = `Trackr suggests: ${value}`;
  anchor.after(hint);
}

/** react-select style comboboxes: open the menu (or type, for search-as-you-type ones), then click the matching option. */
async function fillCombobox(el: HTMLInputElement, value: string): Promise<boolean> {
  el.focus();
  el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true }));
  await wait(200);
  let options = optionsOf(el);
  if (!options.length) {
    setValue(el, value);
    await wait(800);
    options = optionsOf(el);
  }
  const choice = pickOption(value, options.map((o) => clean(o.innerText)));
  const option = options.find((o) => clean(o.innerText) === choice);
  if (!option) {
    setValue(el, "");
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true }));
    return false;
  }
  option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  option.click();
  await wait(100);
  return true;
}

async function attachResume(el: HTMLInputElement, resume: Settings["resume"]): Promise<boolean> {
  if (!resume) return false;
  const blob = await (await fetch(resume.dataUrl)).blob();
  const dt = new DataTransfer();
  dt.items.add(new File([blob], resume.name, { type: "application/pdf" }));
  el.files = dt.files;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

async function fill(kit: KitPayload): Promise<{ filled: number; left: number }> {
  const { resume } = (await chrome.storage.local.get("resume")) as Settings;
  let filled = 0;
  let left = 0;
  for (const { el, group, question } of scan()) {
    let done = false;
    if (question.kind === "file") {
      const names = `${question.label} ${el.id} ${el.name}`;
      if (/resume|résumé|\bcv\b/i.test(names) && !/cover/i.test(names) && !(el as HTMLInputElement).files?.length) done = await attachResume(el as HTMLInputElement, resume);
      else if ((el as HTMLInputElement).files?.length) continue;
    } else if (el.value && !group) {
      continue; // the user (or the board) already answered it
    } else {
      const value = answerField(question, kit);
      if (value && group) {
        const radio = group.find((r) => clean(r.labels?.[0]?.innerText || r.value) === value);
        if (radio && !radio.checked) radio.click();
        done = Boolean(radio);
      } else if (value && el instanceof HTMLSelectElement) {
        const option = [...el.options].find((o) => clean(o.text) === value);
        if (option) setValue(el, option.value);
        done = Boolean(option);
      } else if (value && el.getAttribute("role") === "combobox") {
        done = await fillCombobox(el as HTMLInputElement, value);
        if (!done) suggest(el, value);
      } else if (value) {
        setValue(el, value);
        done = true;
      }
    }
    if (done) {
      filled++;
      (group?.[0]?.closest("fieldset") as HTMLElement | null ?? el).style.outline = FILLED;
    } else if (question.required) left++;
  }
  return { filled, left };
}

/** The form as the user is about to send it, for the receipt. */
function snapshot(): FilledField[] {
  return scan().map(({ el, group, question }) => {
    const value = group
      ? clean(group.find((r) => r.checked)?.labels?.[0]?.innerText ?? "")
      : el instanceof HTMLInputElement && el.type === "file"
        ? [...(el.files ?? [])].map((f) => f.name).join(", ")
        : el instanceof HTMLSelectElement
          ? clean(el.selectedOptions[0]?.text)
          : el.getAttribute("role") === "combobox"
            ? clean(el.closest("[class*='container' i], [class*='select' i]")?.textContent) || el.value
            : el.value;
    return { section: question.section, label: question.label, value, ...(question.options ? { options: question.options } : {}) };
  });
}

let kitCache: KitPayload | null = null;
let armed = false;
let recorded = false;

/** After a fill, the next Submit press saves a receipt. Nothing is recorded if Trackr didn't fill. */
function armReceipt() {
  if (armed) return;
  armed = true;
  const record = () => {
    if (recorded) return;
    recorded = true;
    const letter = snapshot().find((f) => /cover letter/i.test(f.label) && f.value.length > 40)?.value;
    void send({
      type: "receipt",
      body: {
        job_url: location.href,
        answers: snapshot(),
        ...(letter ? { cover_letter: letter } : {}),
        company: kitCache?.application?.company ?? clean(document.querySelector("meta[property='og:site_name']")?.getAttribute("content")),
        role: kitCache?.application?.role ?? clean(document.querySelector("h1, h2")?.textContent).slice(0, 200),
      },
    });
  };
  document.addEventListener("submit", record, true);
  document.addEventListener(
    "click",
    (e) => {
      const button = (e.target as Element).closest("button, input[type='submit']");
      if (button && /submit/i.test(clean((button as HTMLElement).innerText || (button as HTMLInputElement).value))) record();
    },
    true
  );
}

// --- The floating button, in a shadow root so the page's CSS can't touch it.
function mount() {
  if (document.getElementById("trackr-autofill")) return;
  const host = document.createElement("div");
  host.id = "trackr-autofill";
  host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      .box{font:14px/1.4 system-ui,sans-serif;background:#fff;color:#0f172a;border:1px solid #cbd5e1;border-radius:14px;box-shadow:0 8px 24px rgba(15,23,42,.18);padding:10px;max-width:280px}
      button{font:inherit;font-weight:600;background:#2563eb;color:#fff;border:0;border-radius:10px;padding:8px 12px;cursor:pointer}
      button:disabled{opacity:.6}
      p{margin:8px 0 0}
    </style>
    <div class="box" role="region" aria-label="Trackr autofill">
      <button type="button">Fill with Trackr</button>
      <p role="status" aria-live="polite"></p>
    </div>`;
  const button = root.querySelector("button")!;
  const status = root.querySelector("p")!;
  button.addEventListener("click", async () => {
    button.disabled = true;
    status.textContent = "Filling…";
    const res = await send<KitPayload>({ type: "kit", url: location.href });
    if (!res.ok) {
      status.textContent = res.error;
      button.disabled = false;
      return;
    }
    kitCache = res.data;
    const { filled, left } = await fill(res.data);
    armReceipt();
    status.textContent = `Filled ${filled} field${filled === 1 ? "" : "s"}${left ? `, ${left} required left for you` : ""}. Check everything, then press Submit yourself.`;
    button.disabled = false;
  });
  document.body.append(host);
}

// Forms render late on single-page boards (Ashby), so keep looking for a few seconds.
let tries = 0;
const timer = setInterval(() => {
  const inputs = [...document.querySelectorAll("input:not([type='hidden']), textarea")].filter(visible);
  if (inputs.length >= 3) {
    mount();
    clearInterval(timer);
  } else if (++tries > 20) clearInterval(timer);
}, 750);
