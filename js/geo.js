// GPS: single fixes (work offline, they come from satellites) and an optional "trace my day" watcher.
import { haversine, todayKey } from "./data.js";
import { state, addPoint, emit, logEvent, saveSettings } from "./store.js";

const msg = (e) => e.code === 1 ? "Location is blocked. Allow it for this site in your browser settings."
  : e.code === 2 ? "No GPS signal. Try near a window or outdoors."
  : e.code === 3 ? "GPS took too long. Try again." : "Could not get your location.";

export function fix({ timeout = 15000, maxAge = 15000 } = {}) {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error("GPS is not available on this device."));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy), t: p.timestamp }),
      (e) => rej(new Error(msg(e))),
      { enableHighAccuracy: true, timeout, maximumAge: maxAge }
    );
  });
}
export async function permission() {
  try { return (await navigator.permissions.query({ name: "geolocation" })).state; } catch (e) { return "unknown"; }
}

let watchId = null, last = null;
export const isTracking = () => watchId != null;

// Keep a point when you have moved 25 m or 3 minutes have passed, and the fix is better than 150 m.
function onPos(p) {
  const acc = Math.round(p.coords.accuracy);
  const pt = [p.timestamp, +p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6), acc];
  state.live = { lat: pt[1], lon: pt[2], acc, t: pt[0] };
  if (acc > 150) { emit(); return; }
  if (!last || haversine(last, pt) >= 25 || pt[0] - last[0] >= 180000) { last = pt; addPoint(todayKey(), pt); } else emit();
}
export function start() {
  if (watchId != null) return true;
  if (!navigator.geolocation) return false;
  watchId = navigator.geolocation.watchPosition(onPos, (e) => { state.live = null; stopQuiet(); state.trackError = msg(e); emit(); }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 });
  return true;
}
function stopQuiet() { if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null; last = null; }
export function setTracking(on) {
  state.trackError = null;
  if (on) { if (!start()) return false; state.settings.tracking = true; logEvent(todayKey(), { type: "track", text: "Started tracing the day" }); }
  else { stopQuiet(); state.settings.tracking = false; logEvent(todayKey(), { type: "track", text: "Stopped tracing" }); }
  saveSettings(); emit(); return true;
}
// Resume after a reload if the preference is on and permission was already granted.
export async function resume() { if (state.settings.tracking && (await permission()) === "granted") start(); }
