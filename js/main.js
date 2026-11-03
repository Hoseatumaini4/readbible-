import { h, icon, clear, $ } from "./ui.js";
import * as S from "./store.js";
import * as Geo from "./geo.js";
import { mountNow } from "./now.js";
import * as Review from "./review.js";
import * as MapView from "./map.js";
import { mountMore } from "./more.js";
import { todayKey, pad, START, END } from "./data.js";

const TABS = [["now", "Now", "now"], ["review", "Review", "review"], ["map", "Map", "map"], ["more", "More", "more"]];
let current = "now", now, more;
const views = {};

function show(name, push = true) {
  current = name;
  TABS.forEach(([t]) => { views[t].hidden = t !== name; });
  document.querySelectorAll(".tabs [data-t]").forEach((b) => { b.setAttribute("aria-selected", b.dataset.t === name ? "true" : "false"); b.toggleAttribute("aria-current", b.dataset.t === name); });
  if (push) { try { history.replaceState(null, "", "#" + name); } catch (e) {} }
  window.scrollTo(0, 0);
  refresh();
  if (name === "map") MapView.shown();
}
function refresh() {
  if (current === "now") now.update();
  else if (current === "review") Review.update();
  else if (current === "map") MapView.update();
  else if (current === "more") more.update();
  pills(); lists();
}
let rt = null;
const schedule = () => { clearTimeout(rt); rt = setTimeout(refresh, 160); };

function pills() {
  const p = $("#pills"); clear(p);
  p.append(h("span", { class: "pill st " + (navigator.onLine ? "on" : "off"), text: navigator.onLine ? "Online" : "Offline" }));
  if (Geo.isTracking()) p.append(h("span", { class: "pill st trace", text: "Tracing" }));
}
let listSig = "";
function lists() {
  const ae = document.activeElement; if (ae && ae.tagName === "INPUT" && ae.getAttribute("list")) return;
  const places = new Set(), songs = new Set();
  Array.from(S.state.days.keys()).sort().reverse().forEach((k) => { const sl = S.state.days.get(k).slots; Object.values(sl).forEach((s) => { if (s.place) places.add(s.place); if (s.song) songs.add(s.song); }); });
  const sig = [...places].length + "|" + [...songs].length; if (sig === listSig) return; listSig = sig;
  const fill = (id, set) => { const dl = $(id); clear(dl); [...set].slice(0, 30).forEach((v) => dl.appendChild(h("option", { value: v }))); };
  fill("#places", places); fill("#songs", songs);
}

async function boot() {
  await S.init();
  const tabs = $("#tabs");
  TABS.forEach(([t, label, ic]) => tabs.appendChild(h("button", { type: "button", "data-t": t, role: "tab", onclick: () => show(t) }, icon(ic), h("span", { text: label }))));
  TABS.forEach(([t]) => { views[t] = $("#v-" + t); });
  const goMap = (k) => { if (k) MapView.showDay(k); show("map"); };
  now = mountNow(views.now, { goMap, goReview: (u) => { Review.go(u || "day", todayKey()); } });
  Review.mountReview(views.review, { goMap, goNow: () => show("now"), goReview: () => show("review") });
  MapView.mountMap(views.map);
  more = mountMore(views.more);
  S.subscribe(schedule);
  setInterval(() => { if (current === "now" || current === "review") refresh(); }, 20000);
  window.addEventListener("online", pills); window.addEventListener("offline", pills);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") S.flushAll(); else refresh(); });
  window.addEventListener("pagehide", () => S.flushAll());
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => MapView.refreshTheme());
  Geo.resume();
  const hash = (location.hash || "").slice(1);
  show(TABS.some(([t]) => t === hash) ? hash : "now", false);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
  window.__bh = { S, Geo, Review, MapView, show };   // handy for debugging in the console
}
boot();
