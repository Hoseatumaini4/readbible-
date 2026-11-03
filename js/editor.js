// A sheet that opens the form for any hour (late entries from Review).
import { h, icon } from "./ui.js";
import { THEMES, themeOf, hlabel, parseKey, fmt } from "./data.js";
import { hourForm } from "./form.js";
import * as S from "./store.js";

let open = null;
export function closeEditor() { if (open) { open.close(); } }
export function openEditor(k, hr, opts = {}) {
  closeEditor();
  const ti = themeOf(hr), form = hourForm(k, hr, opts);
  const prev = document.activeElement;
  const closeBtn = h("button", { class: "iconbtn", type: "button", "aria-label": "Close", onclick: () => api.close() }, icon("close"));
  const sheet = h("div", { class: "sheet t" + ti, role: "dialog", "aria-modal": "true", "aria-label": hlabel(hr) + " reading" },
    h("div", { class: "sheet-head" },
      h("div", {}, h("p", { class: "kicker", text: fmt(parseKey(k), { weekday: "long", day: "numeric", month: "long" }) }),
        h("h2", {}, hlabel(hr) + " ", h("span", { class: "chip", text: THEMES[ti] }))), closeBtn),
    form.el);
  const scrim = h("div", { class: "scrim", onclick: (e) => { if (e.target === scrim) api.close(); } }, sheet);
  const onKey = (e) => { if (e.key === "Escape") api.close(); };
  document.addEventListener("keydown", onKey);
  document.body.appendChild(scrim); document.body.classList.add("noscroll");
  const off = S.subscribe(() => form.sync());
  const api = { close() { off(); document.removeEventListener("keydown", onKey); scrim.remove(); document.body.classList.remove("noscroll"); open = null; try { prev && prev.focus(); } catch (e) {} }, sync: form.sync };
  open = api; closeBtn.focus();
  return api;
}
