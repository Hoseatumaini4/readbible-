// App state: days (readings, events), GPS tracks, settings. Everything lives on this device.
import * as DB from "./db.js";
import { START, END, pad, todayKey, hlabel } from "./data.js";

export const state = { days: new Map(), tracks: new Map(), settings: { tracking: false }, persistent: false, live: null };
const subs = new Set();
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const emit = () => subs.forEach((f) => { try { f(); } catch (e) { console.error(e); } });

const saveTimers = new Map();
function later(id, fn, ms) { clearTimeout(saveTimers.get(id)); saveTimers.set(id, setTimeout(() => { saveTimers.delete(id); fn(); }, ms)); }

export async function init() {
  await DB.open();
  state.persistent = DB.persistent;
  for (const [k, v] of await DB.entries("days")) state.days.set(k, normDay(v));
  const s = await DB.get("meta", "settings"); if (s) Object.assign(state.settings, s);
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}
}
function normDay(d) { d = d || {}; return { slots: d.slots && typeof d.slots === "object" ? d.slots : {}, events: Array.isArray(d.events) ? d.events : [] }; }

export const getDay = (k) => state.days.get(k) || normDay();
export function ensureDay(k) { if (!state.days.has(k)) state.days.set(k, normDay()); return state.days.get(k); }
export const slotOf = (k, h) => getDay(k).slots[pad(h)] || {};
export const isOn = (s) => !!(s && s.done && s.onTime);
export const isLate = (s) => !!(s && s.done && !s.onTime);
export function countOn(k) { let n = 0; for (let h = START; h <= END; h++) if (isOn(slotOf(k, h))) n++; return n; }

export function saveDay(k, delay = 350) { later("d" + k, () => DB.put("days", k, state.days.get(k)), delay); }
export function saveSettings() { DB.put("meta", "settings", state.settings); }
export function flushAll() {
  saveTimers.forEach((_, id) => { clearTimeout(saveTimers.get(id)); });
  saveTimers.clear();
  state.days.forEach((v, k) => DB.put("days", k, v));
  state.tracks.forEach((v, k) => DB.put("tracks", k, v));
}

export function setField(k, h, name, value) {
  const s = ensureDay(k).slots[pad(h)] || (ensureDay(k).slots[pad(h)] = {});
  if (value === "" || value == null) delete s[name]; else s[name] = value;
  saveDay(k); emit();
}
export function logEvent(k, ev) {
  const d = ensureDay(k);
  ev.t = ev.t || new Date().toISOString();
  if (ev.upsert) { const i = d.events.findIndex((e) => e.upsert === ev.upsert); if (i >= 0) { d.events[i] = ev; saveDay(k); emit(); return; } }
  d.events.push(ev); d.events.sort((a, b) => (a.t < b.t ? -1 : 1)); saveDay(k); emit();
}
export function removeEvent(k, t) { const d = ensureDay(k); d.events = d.events.filter((e) => e.t !== t); saveDay(k); emit(); }

// Tick or untick an hour. An hour counts only if it is ticked during its own hour.
export function toggleDone(k, h, ph) {
  const key = pad(h), d = ensureDay(k), s = d.slots[key] || (d.slots[key] = {});
  if (s.done) { s.done = false; s.onTime = false; delete s.at; logEvent(k, { type: "tick", h, text: hlabel(h) + " unmarked" }); return false; }
  s.done = true; s.onTime = ph === "now"; s.at = new Date().toISOString();
  logEvent(k, { type: "tick", h, text: hlabel(h) + (s.onTime ? " read on time" : " recorded late, not counted") });
  saveDay(k); emit(); return true;
}

// ---- GPS tracks: arrays of [timeMs, lat, lon, accuracyM], kept per day.
export async function getTrack(k) {
  if (state.tracks.has(k)) return state.tracks.get(k);
  const t = (await DB.get("tracks", k)) || [];
  if (!state.tracks.has(k)) state.tracks.set(k, t);
  return state.tracks.get(k);
}
export async function addPoint(k, pt) {
  const t = await getTrack(k); t.push(pt);
  later("t" + k, () => DB.put("tracks", k, state.tracks.get(k)), 2500);
  emit();
}
export async function removeTrackPoints(k) { state.tracks.set(k, []); await DB.put("tracks", k, []); emit(); }

// ---- backup
export async function exportAll() {
  const days = {}, tracks = {};
  state.days.forEach((v, k) => { days[k] = v; });
  for (const [k, v] of await DB.entries("tracks")) tracks[k] = v;
  state.tracks.forEach((v, k) => { tracks[k] = v; });
  return JSON.stringify({ app: "bible-hours", version: 1, exportedAt: new Date().toISOString(), days, tracks, settings: state.settings });
}
export async function importAll(text) {
  const o = JSON.parse(text);
  if (!o || o.app !== "bible-hours") throw new Error("This file is not a Bible Hours backup.");
  let n = 0;
  for (const k of Object.keys(o.days || {})) { state.days.set(k, normDay(o.days[k])); await DB.put("days", k, state.days.get(k)); n++; }
  for (const k of Object.keys(o.tracks || {})) { state.tracks.set(k, o.tracks[k]); await DB.put("tracks", k, o.tracks[k]); }
  emit(); return n;
}
export async function wipe() { await DB.clearAll(); state.days.clear(); state.tracks.clear(); state.settings = { tracking: false }; emit(); }

export function lastBookFor(themeIdx, list) {
  let last = null;
  Array.from(state.days.keys()).sort().forEach((k) => {
    const sl = state.days.get(k).slots;
    for (let h = START; h <= END; h++) { const s = sl[pad(h)]; if (s && s.book && list.includes(s.book) && (h - START) % 3 === themeIdx) last = s.book; }
  });
  return last;
}
export { todayKey };
