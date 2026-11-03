// Review: every hour, by quaday (3 hours), day, week, month, quarter and year.
import { h, icon, clear } from "./ui.js";
import { START, END, TOTAL, THEMES, CAPS, BOOKS, CANON, BLOCKS, themeOf, themeOfBook, h12, hlabel, pad, keyOf, parseKey, todayKey, addDays, fmt,
  blockHours, blockOf, blockLabel, rangeFor, eachDay, phase, fmtDist, trackDistance } from "./data.js";
import * as S from "./store.js";
import { openEditor } from "./editor.js";
import { dayTimeline, stateWords } from "./shared.js";

const UNITS = [["quaday", "Quaday", "3 hours"], ["day", "Day"], ["week", "Week"], ["month", "Month"], ["quarter", "Quarter"], ["year", "Year"]];
const curBlock = () => { const hh = new Date().getHours(); return hh < START ? 0 : Math.min(BLOCKS - 1, blockOf(Math.min(hh, END))); };
export const rv = { unit: "day", anchor: todayKey(), block: curBlock(), booksScope: "range", jfilter: "all", jlimit: 15 };
const levelOf = (c) => (c === 0 ? 0 : c <= 4 ? 1 : c <= 8 ? 2 : c <= 12 ? 3 : 4);

// ---------- aggregation
function aggregate(range, hoursOnly) {
  const a = { on: 0, late: 0, per: [0, 0, 0], books: [new Set(), new Set(), new Set()], active: 0, elapsed: 0, slots: [], acts: [] }, tk = todayKey();
  eachDay(range, (k) => {
    if (k <= tk) a.elapsed++;
    const day = S.state.days.get(k); if (!day) return; let any = false;
    for (let hr = START; hr <= END; hr++) {
      if (hoursOnly && !hoursOnly.includes(hr)) continue;
      const s = day.slots[pad(hr)]; if (!s) continue; const t = themeOf(hr);
      if (S.isOn(s)) { a.on++; a.per[t]++; any = true; if (s.book) a.books[t].add(s.book); } else if (S.isLate(s)) a.late++;
      if (s.book || s.thought || s.song || s.place || s.done) a.slots.push({ k, h: hr, s });
    }
    if (!hoursOnly) day.events.forEach((e) => { if (e.type === "action") a.acts.push({ k, e }); });
    if (any) a.active++;
  });
  return a;
}
function bookCounts(range) {
  const c = {}; const bump = (b, on) => { const o = c[b] || (c[b] = { on: 0, late: 0 }); if (on) o.on++; else o.late++; };
  const visit = (day) => { for (let hr = START; hr <= END; hr++) { const s = day.slots[pad(hr)]; if (s && s.book) bump(s.book, S.isOn(s)); } };
  if (!range) S.state.days.forEach(visit); else eachDay(range, (k) => { const d = S.state.days.get(k); if (d) visit(d); });
  return c;
}
async function distanceOf(keys) { let m = 0; for (const k of keys) { const t = await S.getTrack(k); if (t.length > 1) m += trackDistance(t); } return m; }
function keysIn(range) { const o = []; eachDay(range, (k) => o.push(k)); return o; }

// ---------- pieces
function statBox(label, value, id) { return h("div", { class: "stat" }, h("b", { text: String(value), id }), h("span", { text: label })); }
function summary({ title, on, cap, per, caps, books, extra, distKeys }) {
  const pct = cap ? Math.round((on / cap) * 100) : 0, distEl = h("b", { text: "…" });
  if (distKeys) distanceOf(distKeys).then((m) => { distEl.textContent = m ? fmtDist(m) : "0 m"; });
  return h("section", { class: "card summary" },
    h("div", { class: "sumtop" },
      h("div", {}, h("p", { class: "kicker", text: title }), h("div", { class: "big", title: "hours counted" }, String(on), h("span", { text: " / " + cap + " hours" }))),
      h("div", { class: "pct", "aria-label": pct + " percent" }, h("span", { text: pct + "%" }))),
    h("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": cap, "aria-valuenow": on }, h("i", { style: "width:" + Math.min(100, pct) + "%" })),
    h("div", { class: "rows3" }, THEMES.map((t, i) => h("div", { class: "trow t" + i }, h("b", { text: t }),
      h("div", { class: "tb" }, h("i", { style: "width:" + Math.min(100, caps[i] ? (per[i] / caps[i]) * 100 : 0) + "%" })),
      h("small", { text: per[i] + " hrs" + (books ? " · " + books[i].size + " books" : "") })))),
    h("div", { class: "stats" }, extra.map(([l, v]) => statBox(l, v)), distKeys ? h("div", { class: "stat" }, distEl, h("span", { text: "Distance moved" })) : null));
}
function legend() {
  return h("div", { class: "legend" }, THEMES.map((t, i) => h("span", { class: "t" + i }, h("i"), t)), h("span", {}, h("i", { class: "l" }), "Recorded late, not counted"));
}
const empty = (txt) => h("p", { class: "empty", text: txt });
function openHour(k, hr, goMap) { if (phase(k, hr) !== "future") openEditor(k, hr, { onOpenMap: goMap }); }

function weekGrid(range, goMap) {
  const g = h("div", { class: "heat" }, h("span"));
  for (let hr = START; hr <= END; hr++) g.appendChild(h("span", { class: "hh t" + themeOf(hr), title: hlabel(hr) + ", " + THEMES[themeOf(hr)] }, THEMES[themeOf(hr)][0]));
  eachDay(range, (k, d) => {
    g.appendChild(h("button", { class: "dl", type: "button", onclick: () => go("day", k) }, fmt(d, { weekday: "short", day: "numeric" })));
    for (let hr = START; hr <= END; hr++) {
      const s = S.slotOf(k, hr), st = S.isOn(s) ? " on" : S.isLate(s) ? " late" : "";
      g.appendChild(h("button", { class: "cell t" + themeOf(hr) + st, type: "button", "aria-label": fmt(d, { weekday: "long", day: "numeric", month: "short" }) + ", " + hlabel(hr) + ": " + (st ? (S.isOn(s) ? "counted" : "late") : "nothing"), onclick: () => openHour(k, hr, goMapRef) }));
    }
  });
  return h("section", { class: "card" }, h("h3", { text: "Hour by hour" }), g, legend());
}
function monthCal(range) {
  const cal = h("div", { class: "cal" }, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => h("span", { class: "wd", text: w })));
  for (let i = 0; i < (range.s.getDay() + 6) % 7; i++) cal.appendChild(h("span", { class: "blank" }));
  const tk = todayKey();
  eachDay(range, (k, d) => {
    const c = S.countOn(k), ev = S.getDay(k).events.length;
    cal.appendChild(h("button", { type: "button", class: "daycell lv" + levelOf(c), "aria-current": k === tk ? "date" : null, "aria-label": fmt(d, { weekday: "long", day: "numeric", month: "long" }) + ": " + c + " of " + TOTAL + " counted", onclick: () => go("day", k) },
      h("span", { class: "n", text: String(d.getDate()) }), h("span", { class: "c", text: c ? String(c) : ev ? "·" : "" })));
  });
  return h("section", { class: "card" }, h("h3", { text: "Days" }), cal);
}
function contrib(range) {
  const start = new Date(range.s); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const weeks = Math.ceil(((range.e - start) / 86400000 + 1) / 7), tk = todayKey();
  const labels = h("div", { class: "cmonths", style: "grid-template-columns:repeat(" + weeks + ",minmax(0,1fr))" });
  const grid = h("div", { class: "contrib", style: "grid-template-columns:repeat(" + weeks + ",minmax(0,1fr))" });
  let lastM = -1;
  for (let w = 0; w < weeks; w++) {
    const first = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7);
    const m = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 6).getMonth();
    labels.appendChild(h("span", { text: m !== lastM && first <= range.e ? fmt(first.getDate() > 24 ? new Date(first.getFullYear(), first.getMonth() + 1, 1) : first, { month: "short" }) : "" }));
    lastM = m;
    for (let d = 0; d < 7; d++) {
      const day = new Date(first.getFullYear(), first.getMonth(), first.getDate() + d), k = keyOf(day);
      if (day < range.s || day > range.e) { grid.appendChild(h("span", { class: "blank" })); continue; }
      const c = S.countOn(k);
      grid.appendChild(h("button", { type: "button", class: "sq lv" + levelOf(c) + (k === tk ? " today" : ""), title: fmt(day, { weekday: "short", day: "numeric", month: "short" }) + ": " + c + "/" + TOTAL, "aria-label": fmt(day, { weekday: "long", day: "numeric", month: "long" }) + ": " + c + " counted", onclick: () => go("day", k) }));
    }
  }
  return h("section", { class: "card" }, h("h3", { text: "Every day" }), h("div", { class: "scrollx" }, h("div", { class: "contribwrap" }, labels, grid)),
    h("div", { class: "legend" }, h("span", {}, "Fewer"), [0, 1, 2, 3, 4].map((l) => h("span", {}, h("i", { class: "sq lv" + l, style: "background:" + "" }))), h("span", {}, "More hours counted")));
}
function monthBars(year, months) {
  const rows = months.map((m) => {
    const r = { s: new Date(year, m, 1), e: new Date(year, m + 1, 0) }, a = aggregate(r), cap = Math.max(1, a.elapsed) * TOTAL;
    return h("button", { class: "yrow", type: "button", "aria-label": fmt(r.s, { month: "long" }) + ": " + a.on + " hours counted", onclick: () => go("month", keyOf(r.s)) },
      h("span", { text: fmt(r.s, { month: "short" }) }),
      h("span", { class: "stack" }, a.per.map((v, i) => h("i", { class: "t" + i, style: "width:" + (v / (a.elapsed ? cap : TOTAL * 30)) * 100 + "%" }))),
      h("small", { text: a.on + " hrs" }));
  });
  return h("section", { class: "card" }, h("h3", { text: "Month by month" }), h("div", { class: "yr" }, rows), legend());
}

function booksPanel(range) {
  const counts = bookCounts(rv.booksScope === "all" ? null : range);
  const cov = THEMES.map((t) => BOOKS[t].filter((b) => counts[b] && counts[b].on > 0).length);
  const scopeBtn = (v, l) => h("button", { type: "button", class: "chipbtn" + (rv.booksScope === v ? " sel" : ""), "aria-pressed": rv.booksScope === v ? "true" : "false", onclick: () => { rv.booksScope = v; update(); } }, l);
  return h("section", { class: "card" },
    h("div", { class: "rowsb wrapx" }, h("h3", { text: "All 66 books" }), h("div", { class: "chips" }, scopeBtn("range", "This " + (rv.unit === "quaday" ? "block" : rv.unit)), scopeBtn("all", "All time"))),
    h("div", { class: "themes" }, THEMES.map((t, i) => h("span", { class: "pill t" + i, text: t + " " + cov[i] + "/22" }))),
    Object.entries(CANON).map(([name, list]) => h("div", { class: "bkgrp" }, h("h4", { text: name }),
      h("div", { class: "books" }, list.map((b) => {
        const c = counts[b] || { on: 0, late: 0 }, ti = themeOfBook(b);
        return h("span", { class: "book t" + ti + (c.on ? " on" : c.late ? " late" : ""), title: b + ": " + c.on + " counted" + (c.late ? ", " + c.late + " late" : "") }, h("span", { text: b }), c.on || c.late ? h("em", { text: String(c.on || c.late) }) : null);
      })))),
    legend());
}

function journal(range, aggr, goMap) {
  const items = [];
  aggr.slots.forEach((x) => { const s = x.s; if (s.thought || s.song || s.place || s.book) items.push({ kind: "slot", time: parseKey(x.k).setHours(x.h), x }); });
  aggr.acts.forEach((a) => items.push({ kind: "action", time: new Date(a.e.t).getTime(), a }));
  items.sort((p, q) => q.time - p.time);
  const f = rv.jfilter, match = (it) => f === "all" || (f === "action" ? it.kind === "action" : it.kind === "slot" && !!it.x.s[f]);
  const list = items.filter(match);
  const chip = (v, l) => h("button", { type: "button", class: "chipbtn" + (f === v ? " sel" : ""), "aria-pressed": f === v ? "true" : "false", onclick: () => { rv.jfilter = v; rv.jlimit = 15; update(); } }, l);
  const body = !list.length ? empty("Nothing here yet. Add places, songs, thoughts and actions from the Now page.") : h("div", { class: "log" }, list.slice(0, rv.jlimit).map((it) => {
    if (it.kind === "action") return h("div", { class: "entry" }, h("div", { class: "meta" }, h("span", { text: fmt(parseKey(it.a.k), { weekday: "short", day: "numeric", month: "short" }) + ", " + new Date(it.a.e.t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }), h("b", { class: "acttag", text: "Action" })), h("p", { text: it.a.e.text }));
    const { k, h: hr, s } = it.x, ti = themeOf(hr);
    return h("button", { class: "entry t" + ti, type: "button", onclick: () => openHour(k, hr, goMap) },
      h("div", { class: "meta" }, h("span", { text: fmt(parseKey(k), { weekday: "short", day: "numeric", month: "short" }) + ", " + hlabel(hr) }), h("b", { text: THEMES[ti] }), s.book ? h("span", { text: s.book + (s.ref ? " " + s.ref : "") }) : null, !S.isOn(s) ? h("span", { class: "lt", text: "out of track" }) : null),
      s.thought ? h("p", { text: s.thought }) : null,
      s.place || s.song ? h("p", { class: "dim", text: [s.place && "At " + s.place, s.song && "Listening to " + s.song].filter(Boolean).join("  ·  ") }) : null);
  }));
  return h("section", { class: "card" }, h("h3", { text: "Journal" }),
    h("div", { class: "chips" }, chip("all", "All"), chip("thought", "Thoughts"), chip("song", "Songs"), chip("place", "Places"), chip("action", "Actions")), body,
    list.length > rv.jlimit ? h("button", { class: "btn", type: "button", style: "margin-top:14px", onclick: () => { rv.jlimit += 15; update(); } }, "Show more") : null);
}

// ---------- views per unit
function hourRow(k, hr, goMap, goNow) {
  const s = S.slotOf(k, hr), ph = phase(k, hr), ti = themeOf(hr), t = h12(hr);
  const bits = [s.book && s.book + (s.ref ? " " + s.ref : ""), s.place && "At " + s.place, s.song && "♪ " + s.song].filter(Boolean);
  return h("button", { class: "hrow t" + ti + (S.isOn(s) ? " on" : S.isLate(s) ? " late" : "") + " " + ph, type: "button", disabled: ph === "future", onclick: () => (ph === "now" ? goNow() : openHour(k, hr, goMap)) },
    h("span", { class: "time" }, h("b", { text: String(t.n) }), h("span", { text: t.ap })),
    h("span", { class: "mark" }, S.isOn(s) || S.isLate(s) ? icon("check") : null),
    h("span", { class: "hmain" }, h("span", { class: "hl" }, h("b", { class: "chip", text: THEMES[ti] }), h("span", { class: "state", text: stateWords(s, ph, hr) })),
      bits.length ? h("span", { class: "hb", text: bits.join("   ") }) : null,
      s.thought ? h("span", { class: "hq", text: s.thought }) : null));
}
function dayView(k, goMap, goNow) {
  const a = aggregate(rangeFor("day", k)), tk = todayKey(), parts = [];
  parts.push(summary({ title: fmt(parseKey(k), { weekday: "long", day: "numeric", month: "long", year: "numeric" }), on: a.on, cap: TOTAL, per: a.per, caps: CAPS, extra: [["Counted", a.on], ["Recorded late", a.late], ["Actions", a.acts.length]], distKeys: [k] }));
  if (k !== tk) parts.push(h("p", { class: "banner", text: k < tk ? "This day is over. You can still record entries. They are marked out of track and do not count." : "This day has not started. Each hour opens at its own time." }));
  const groups = [["Morning", 6, 11], ["Afternoon", 12, 17], ["Evening", 18, 21]];
  parts.push(h("section", { class: "card" }, h("div", { class: "rowsb" }, h("h3", { text: "Hours" }), h("button", { class: "linkbtn", type: "button", onclick: () => goMap(k) }, "Open this day on the map")),
    groups.map(([n, x, y]) => h("div", { class: "grp" }, h("h4", { text: n }), Array.from({ length: y - x + 1 }, (_, i) => hourRow(k, x + i, goMap, goNow))))));
  parts.push(h("section", { class: "card" }, h("h3", { text: "Everything that happened" }), dayTimeline(k)));
  parts.push(booksPanel(rangeFor("day", k)), journal(rangeFor("day", k), a, goMap));
  return parts;
}
function quadayView(k, b, goMap, goNow) {
  const hs = blockHours(b), a = aggregate(rangeFor("day", k), hs), caps = [0, 0, 0]; hs.forEach((x) => caps[themeOf(x)]++);
  const cards = hs.map((hr) => {
    const s = S.slotOf(k, hr), ph = phase(k, hr), ti = themeOf(hr), t = h12(hr);
    return h("article", { class: "card qcard t" + ti },
      h("div", { class: "rowsb" }, h("div", {}, h("p", { class: "kicker", text: THEMES[ti] }), h("h3", { class: "qh", text: t.n + " " + t.ap })), h("span", { class: "badge " + (S.isOn(s) ? "ok" : S.isLate(s) ? "late" : ph), text: stateWords(s, ph, hr) })),
      s.book ? h("p", { class: "qbook" }, h("b", { text: s.book }), s.ref ? " " + s.ref : "") : h("p", { class: "dim", text: "No book chosen" }),
      s.thought ? h("blockquote", { text: s.thought }) : null,
      h("p", { class: "dim" }, [s.place && "At " + s.place, s.geo && s.geo.lat.toFixed(4) + ", " + s.geo.lon.toFixed(4), s.song && "♪ " + s.song].filter(Boolean).join("  ·  ") || "No place or song"),
      h("button", { class: "btn" + (ph === "now" ? " primary" : ""), type: "button", disabled: ph === "future", onclick: () => (ph === "now" ? goNow() : openHour(k, hr, goMap)) }, ph === "now" ? "Fill in now" : ph === "future" ? "Not open yet" : "Open"));
  });
  const parts = [summary({ title: "Quaday " + (b + 1) + " of " + BLOCKS + ", " + blockLabel(b), on: a.on, cap: hs.length, per: a.per, caps, extra: [["Counted", a.on], ["Late", a.late]], distKeys: null }),
    h("div", { class: "qgrid" }, cards)];
  const ev = S.getDay(k).events.filter((e) => { const x = e.h != null ? e.h : new Date(e.t).getHours(); return hs.includes(x); });
  parts.push(h("section", { class: "card" }, h("h3", { text: "In this block" }), ev.length ? h("ol", { class: "tl" }, ev.map((e) => h("li", { class: "tli" }, h("time", { text: new Date(e.t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }), h("span", { class: "dot" }), h("div", { class: "tlb" }, e.text)))) : empty("Nothing recorded in this block.")));
  return parts;
}
function rangeView(unit, k, goMap) {
  const r = rangeFor(unit, k), a = aggregate(r), cap = Math.max(1, a.elapsed) * TOTAL, parts = [];
  parts.push(summary({ title: rangeLabel(unit, r), on: a.on, cap, per: a.per, caps: CAPS.map((c) => c * Math.max(1, a.elapsed)), books: a.books, extra: [["Days with a reading", a.active], ["Recorded late", a.late], ["Books counted", a.books[0].size + a.books[1].size + a.books[2].size]], distKeys: keysIn(r) }));
  if (unit === "week") parts.push(weekGrid(r));
  else if (unit === "month") parts.push(monthCal(r));
  else if (unit === "quarter") parts.push(contrib(r), monthBars(r.s.getFullYear(), [r.s.getMonth(), r.s.getMonth() + 1, r.s.getMonth() + 2]));
  else parts.push(contrib(r), monthBars(r.s.getFullYear(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
  parts.push(booksPanel(r), journal(r, a, goMap));
  return parts;
}
function rangeLabel(unit, r) {
  if (unit === "week") return fmt(r.s, { day: "numeric", month: "short" }) + " to " + fmt(r.e, { day: "numeric", month: "short", year: "numeric" });
  if (unit === "month") return fmt(r.s, { month: "long", year: "numeric" });
  if (unit === "quarter") return "Q" + (Math.floor(r.s.getMonth() / 3) + 1) + " " + r.s.getFullYear() + ", " + fmt(r.s, { month: "short" }) + " to " + fmt(r.e, { month: "short" });
  return String(r.s.getFullYear());
}

// ---------- shell
let bar, body, goMapRef, goNowRef, rootEl;
function shift(n) {
  const u = rv.unit;
  if (u === "quaday") { rv.block += n; if (rv.block < 0) { rv.block = BLOCKS - 1; rv.anchor = addDays(rv.anchor, -1); } else if (rv.block >= BLOCKS) { rv.block = 0; rv.anchor = addDays(rv.anchor, 1); } }
  else if (u === "day") rv.anchor = addDays(rv.anchor, n);
  else if (u === "week") rv.anchor = addDays(rv.anchor, 7 * n);
  else { const d = parseKey(rv.anchor); d.setDate(1); if (u === "month") d.setMonth(d.getMonth() + n); else if (u === "quarter") d.setMonth(d.getMonth() + 3 * n); else d.setFullYear(d.getFullYear() + n); rv.anchor = keyOf(d); }
  rv.jlimit = 15; update();
}
export function go(unit, anchor, block) { rv.unit = unit; if (anchor) rv.anchor = anchor; if (unit === "quaday") rv.block = block != null ? block : curBlock(); rv.jlimit = 15; if (rootEl) update(); if (goReviewRef) goReviewRef(); }
let goReviewRef = null;
function labelFor() {
  const u = rv.unit, tk = todayKey(); let kick, text;
  if (u === "quaday") { kick = "Quaday " + (rv.block + 1) + " of " + BLOCKS; text = blockLabel(rv.block) + ", " + fmt(parseKey(rv.anchor), { weekday: "short", day: "numeric", month: "short" }); }
  else if (u === "day") { kick = rv.anchor === tk ? "Today" : rv.anchor < tk ? "Past day" : "Upcoming"; text = fmt(parseKey(rv.anchor), { weekday: "long", day: "numeric", month: "long" }); }
  else { const r = rangeFor(u, rv.anchor); kick = u.charAt(0).toUpperCase() + u.slice(1); text = rangeLabel(u, r); }
  return [kick, text];
}
export function update() {
  if (!rootEl) return;
  const [kick, text] = labelFor();
  bar.querySelectorAll("[data-u]").forEach((b) => b.setAttribute("aria-selected", b.dataset.u === rv.unit ? "true" : "false"));
  bar.querySelector(".nlabel").replaceChildren(h("small", { text: kick }), h("span", { text }));
  const atNow = rv.anchor === todayKey() && (rv.unit !== "quaday" || rv.block === curBlock()) && ["quaday", "day"].includes(rv.unit);
  bar.querySelector("[data-today]").hidden = atNow;
  const y = window.scrollY;
  const parts = rv.unit === "quaday" ? quadayView(rv.anchor, rv.block, goMapRef, goNowRef) : rv.unit === "day" ? dayView(rv.anchor, goMapRef, goNowRef) : rangeView(rv.unit, rv.anchor, goMapRef);
  clear(body).append(...parts);
  window.scrollTo(0, y);
}
export function mountReview(root, { goMap, goNow, goReview }) {
  rootEl = root; goMapRef = goMap; goNowRef = goNow; goReviewRef = goReview;
  bar = h("div", { class: "rbar" },
    h("div", { class: "units", role: "tablist", "aria-label": "Time unit" }, UNITS.map(([u, l, s]) => h("button", { type: "button", role: "tab", "data-u": u, onclick: () => { rv.unit = u; if (u === "quaday") rv.block = curBlock(); rv.jlimit = 15; update(); } }, l, s ? h("small", { text: s }) : null))),
    h("div", { class: "nav" },
      h("button", { class: "iconbtn", type: "button", "aria-label": "Previous", onclick: () => shift(-1) }, icon("left")),
      h("div", { class: "nlabel", "aria-live": "polite" }),
      h("button", { class: "iconbtn", type: "button", "aria-label": "Next", onclick: () => shift(1) }, icon("right")),
      h("button", { class: "btn", type: "button", "data-today": "1", onclick: () => { rv.anchor = todayKey(); rv.block = curBlock(); update(); } }, "Today")));
  body = h("div", { class: "rbody" });
  root.append(bar, body);
  update();
}
