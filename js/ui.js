// Small DOM helpers and inline icons.
const SVGT = new Set(["svg", "circle", "path", "g", "line", "rect", "polyline"]);
export function h(tag, props, ...kids) {
  const e = SVGT.has(tag) ? document.createElementNS("http://www.w3.org/2000/svg", tag) : document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") e.setAttribute("class", v);
    else if (k === "text") e.textContent = v;
    else if (k === "html") e.innerHTML = v;
    else if (k === "style") e.style.cssText = v;
    else if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (["value", "disabled", "hidden", "checked", "maxLength", "type"].includes(k)) e[k] = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  add(e, kids);
  return e;
}
function add(e, kids) { for (const c of kids.flat(Infinity)) { if (c == null || c === false) continue; e.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c); } }
export const clear = (e) => { while (e.firstChild) e.removeChild(e.firstChild); return e; };
export const $ = (s, r = document) => r.querySelector(s);
export const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICON = {
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="3"'),
  now: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  review: svg('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>'),
  map: svg('<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14"/>'),
  more: svg('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  pin: svg('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  left: svg('<path d="M15 5l-7 7 7 7"/>'),
  right: svg('<path d="M9 5l7 7-7 7"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  play: svg('<path d="M7 5l12 7-12 7z" fill="currentColor"/>'),
  pause: svg('<path d="M8 5v14M16 5v14"/>', 'stroke-width="3"'),
  lock: svg('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  trash: svg('<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>'),
};
export const icon = (name, cls = "ic") => h("span", { class: cls, html: ICON[name] });
