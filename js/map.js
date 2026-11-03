// Map: the path you moved through the day, coloured by hour, with GPS pins and a time scrubber.
import { h, icon, clear, css } from "./ui.js";
import { START, END, THEMES, themeOf, h12, hlabel, todayKey, addDays, parseKey, fmt, fmtDist, segDist, pad } from "./data.js";
import * as S from "./store.js";
import * as Geo from "./geo.js";
import { dayTimeline } from "./shared.js";

const mv = { day: todayKey(), focus: null, idx: 0, timer: null };
let map, layer, tileLayer, cursor, root, els = {}, pts = [], drawToken = 0, hasData = false;
const DAR = [-6.8, 39.27];
const tcolor = (ti) => css(["--love", "--hope", "--faith"][ti]);

export function showDay(k) { mv.day = k; mv.focus = null; if (root) update(); }

function ensureMap() {
  if (map) return;
  map = L.map(els.map, { zoomControl: true, attributionControl: true, preferCanvas: true }).setView(DAR, 12);
  tileLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
  layer = L.layerGroup().addTo(map);
}
const pinIcon = (hr) => { const t = h12(hr); return L.divIcon({ className: "", html: '<span class="mpin t' + themeOf(hr) + '">' + t.n + '<small>' + (t.ap === "AM" ? "a" : "p") + '</small></span>', iconSize: [30, 30], iconAnchor: [15, 15] }); };
const fmtT = (ms) => new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

async function draw() {
  const token = ++drawToken, k = mv.day;
  ensureMap(); map.invalidateSize();
  const track = (await S.getTrack(k)).slice().sort((a, b) => a[0] - b[0]);
  if (token !== drawToken) return;
  pts = track; layer.clearLayers(); cursor = null;
  const day = S.getDay(k), pins = [];
  for (let hr = START; hr <= END; hr++) { const s = day.slots[pad(hr)]; if (s && s.geo) pins.push({ hr, g: s.geo, s }); }
  const focus = mv.focus, bounds = [];
  // path, one polyline per run of points in the same hour, coloured by that hour's theme
  let run = [], runH = null;
  const flush = () => { if (run.length > 1 || (run.length === 1 && false)) { const ti = themeOf(runH); L.polyline(run, { color: tcolor(ti), weight: 5, opacity: focus == null || focus === runH ? 0.95 : 0.18, lineCap: "round", lineJoin: "round" }).addTo(layer); } run = []; };
  pts.forEach((p, i) => {
    const hr = Math.min(END, Math.max(START, new Date(p[0]).getHours()));
    if (runH !== null && hr !== runH) { const prev = run[run.length - 1]; flush(); run = prev ? [prev] : []; }
    runH = hr; run.push([p[1], p[2]]);
    if (focus == null || focus === hr) bounds.push([p[1], p[2]]);
  });
  flush();
  if (pts.length) {
    L.circleMarker([pts[0][1], pts[0][2]], { radius: 6, color: css("--surface"), weight: 2, fillColor: css("--ink"), fillOpacity: 1 }).bindTooltip("Start " + fmtT(pts[0][0])).addTo(layer);
  }
  pins.forEach((p) => {
    if (focus != null && focus !== p.hr) return;
    L.marker([p.g.lat, p.g.lon], { icon: pinIcon(p.hr), title: hlabel(p.hr) }).bindPopup("<b>" + hlabel(p.hr) + " · " + THEMES[themeOf(p.hr)] + "</b><br>" + (p.s.place ? p.s.place + "<br>" : "") + "±" + p.g.acc + " m").addTo(layer);
    bounds.push([p.g.lat, p.g.lon]);
  });
  const live = S.state.live;
  if (k === todayKey() && live && Geo.isTracking()) L.circleMarker([live.lat, live.lon], { radius: 8, color: css("--accent"), weight: 3, fillColor: css("--accent"), fillOpacity: 0.35 }).bindTooltip("You, now").addTo(layer);
  hasData = bounds.length > 0;
  els.empty.hidden = hasData || pts.length > 0;
  if (bounds.length) map.fitBounds(L.latLngBounds(bounds).pad(0.2), { maxZoom: 17, animate: false });
  cursor = pts.length ? L.circleMarker([pts[0][1], pts[0][2]], { radius: 9, color: css("--surface"), weight: 3, fillColor: css("--accent"), fillOpacity: 1 }).addTo(layer) : null;
  stats(day, pins);
  setScrub(Math.min(mv.idx, Math.max(0, pts.length - 1)), false);
  els.scrub.max = Math.max(0, pts.length - 1); els.scrubWrap.hidden = pts.length < 2;
}

function perHour() {
  const d = {};
  for (let i = 1; i < pts.length; i++) { const hr = new Date(pts[i][0]).getHours(); d[hr] = (d[hr] || 0) + segDist(pts[i - 1], pts[i]); }
  return d;
}
function stats(day, pins) {
  const ph = perHour(), total = Object.values(ph).reduce((a, b) => a + b, 0);
  clear(els.stats).append(
    stat(fmtDist(total), "Distance moved"), stat(String(pts.length), "Track points"), stat(String(pins.length), "Hour pins"),
    stat(pts.length > 1 ? fmtT(pts[0][0]) + " to " + fmtT(pts[pts.length - 1][0]) : "None", "Tracked span"));
  clear(els.table);
  for (let hr = START; hr <= END; hr++) {
    const s = day.slots[pad(hr)] || {}, pin = pins.find((p) => p.hr === hr), t = h12(hr), has = ph[hr] != null || pin;
    els.table.appendChild(h("button", { class: "mrow t" + themeOf(hr) + (mv.focus === hr ? " sel" : ""), type: "button", disabled: !has, onclick: () => { mv.focus = mv.focus === hr ? null : hr; draw(); } },
      h("span", { class: "time" }, h("b", { text: String(t.n) }), h("span", { text: t.ap })),
      h("span", { class: "mrb" }, h("b", { text: THEMES[themeOf(hr)] }), h("span", { text: s.place || (pin ? "GPS pin only" : has ? "Moving" : "No location") })),
      h("small", { text: ph[hr] ? fmtDist(ph[hr]) : pin ? "±" + pin.g.acc + " m" : "" })));
  }
  clear(els.tl).append(dayTimeline(mv.day));
}
const stat = (v, l) => h("div", { class: "stat" }, h("b", { text: v }), h("span", { text: l }));

function setScrub(i, pan) {
  mv.idx = i; if (!pts.length) { els.scrubLabel.textContent = ""; return; }
  const p = pts[i]; els.scrub.value = i;
  if (cursor) cursor.setLatLng([p[1], p[2]]);
  if (pan && map && !map.getBounds().contains([p[1], p[2]])) map.panTo([p[1], p[2]]);
  const hr = new Date(p[0]).getHours();
  els.scrubLabel.textContent = fmtT(p[0]) + "  ·  " + (hr >= START && hr <= END ? THEMES[themeOf(hr)] : "Outside hours") + "  ·  ±" + p[3] + " m";
}
function play() {
  if (mv.timer) { clearInterval(mv.timer); mv.timer = null; els.play.replaceChildren(icon("play"), "Play the day"); return; }
  if (pts.length < 2) return;
  if (mv.idx >= pts.length - 1) mv.idx = 0;
  els.play.replaceChildren(icon("pause"), "Pause");
  const step = Math.max(1, Math.floor(pts.length / 150));
  mv.timer = setInterval(() => { const n = Math.min(pts.length - 1, mv.idx + step); setScrub(n, true); if (n >= pts.length - 1) play(); }, 90);
}

export function mountMap(r) {
  root = r;
  els.map = h("div", { class: "leafmap", role: "region", "aria-label": "Map of your day" });
  els.empty = h("div", { class: "mapempty", hidden: true }, h("b", { text: "No movement recorded for this day." }), h("span", { text: "Turn on tracing on the Now or More page, or pin GPS in an hour." }));
  els.stats = h("div", { class: "stats" }); els.table = h("div", { class: "mtable" }); els.tl = h("div");
  els.scrub = h("input", { type: "range", min: 0, max: 0, value: 0, "aria-label": "Scrub through the day", oninput: (e) => { if (mv.timer) play(); setScrub(+e.target.value, true); } });
  els.scrubLabel = h("span", { class: "sl" });
  els.play = h("button", { class: "btn", type: "button", onclick: play }, icon("play"), "Play the day");
  els.scrubWrap = h("div", { class: "scrubwrap", hidden: true }, els.play, els.scrub, els.scrubLabel);
  els.nav = h("div", { class: "nav" },
    h("button", { class: "iconbtn", type: "button", "aria-label": "Previous day", onclick: () => { mv.day = addDays(mv.day, -1); mv.focus = null; update(); } }, icon("left")),
    h("div", { class: "nlabel", "aria-live": "polite" }),
    h("button", { class: "iconbtn", type: "button", "aria-label": "Next day", onclick: () => { mv.day = addDays(mv.day, 1); mv.focus = null; update(); } }, icon("right")),
    h("button", { class: "btn", type: "button", "data-today": "1", onclick: () => { mv.day = todayKey(); mv.focus = null; update(); } }, "Today"));
  els.mode = h("p", { class: "sub" });
  root.append(
    h("div", { class: "rbar" }, els.nav),
    h("section", { class: "card mapcard" }, h("div", { class: "mapbox" }, els.map, els.empty), els.scrubWrap,
      h("p", { class: "mapnote", text: "Your path is drawn from GPS points and works offline. Map pictures show offline only for areas you have viewed before." })),
    h("section", { class: "card" }, h("h3", { text: "The day in numbers" }), els.stats),
    h("section", { class: "card" }, h("h3", { text: "Hour by hour" }), h("p", { class: "sub", text: "Tap an hour to focus the map on it." }), els.table),
    h("section", { class: "card" }, h("h3", { text: "Everything that happened" }), els.tl));
}
export function update() {
  if (!root) return;
  const tk = todayKey();
  els.nav.querySelector(".nlabel").replaceChildren(h("small", { text: mv.day === tk ? "Today" : mv.day < tk ? "Past day" : "Upcoming" }), h("span", { text: fmt(parseKey(mv.day), { weekday: "long", day: "numeric", month: "long" }) }));
  els.nav.querySelector("[data-today]").hidden = mv.day === tk;
  draw();
}
export function shown() { if (map) setTimeout(() => map.invalidateSize(), 60); update(); }
export const refreshTheme = () => { if (root && map) draw(); };
