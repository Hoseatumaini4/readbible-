// Offline support: the whole app is cached on first visit; map tiles you view are cached too.
const VERSION = "bh-v1";
const TILES = "bh-tiles";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest", "./css/app.css",
  "./js/main.js", "./js/data.js", "./js/db.js", "./js/store.js", "./js/geo.js", "./js/ui.js", "./js/form.js", "./js/editor.js",
  "./js/shared.js", "./js/now.js", "./js/review.js", "./js/map.js", "./js/more.js",
  "./lib/leaflet.js", "./lib/leaflet.css", "./lib/images/marker-icon.png", "./lib/images/layers.png",
  "./fonts/spectral-latin-500-normal.woff2", "./fonts/spectral-latin-600-normal.woff2", "./fonts/spectral-latin-500-italic.woff2",
  "./fonts/hanken-grotesk-latin-400-normal.woff2", "./fonts/hanken-grotesk-latin-500-normal.woff2", "./fonts/hanken-grotesk-latin-600-normal.woff2",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/icon-512.png"
];
self.addEventListener("install", (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== TILES).map((k) => caches.delete(k)))).then(() => self.clients.claim())));

async function trimTiles() {
  const c = await caches.open(TILES), keys = await c.keys();
  if (keys.length > 1800) for (const k of keys.slice(0, keys.length - 1500)) await c.delete(k);
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    e.respondWith(caches.open(TILES).then(async (c) => {
      const hit = await c.match(req); if (hit) return hit;
      try { const res = await fetch(req); if (res && (res.ok || res.type === "opaque")) { c.put(req, res.clone()); if (Math.random() < 0.02) trimTiles(); } return res; }
      catch (err) { return new Response("", { status: 504 }); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", copy)); return res; }).catch(() => caches.match("./index.html")));
    return;
  }
  // everything else: cached copy now, refreshed in the background
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone())); return res; }).catch(() => hit);
    return hit || net;
  }));
});
