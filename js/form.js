// The hour form: used on the Now page and inside the editor sheet for any other hour.
import { h, icon } from "./ui.js";
import { THEMES, BOOKS, themeOf, hlabel, phase } from "./data.js";
import * as S from "./store.js";
import * as Geo from "./geo.js";

export function nextBook(themeIdx) {
  const list = BOOKS[THEMES[themeIdx]], last = S.lastBookFor(themeIdx, list);
  return list[((last ? list.indexOf(last) : -1) + 1) % list.length];
}

export function hourForm(k, hr, { onOpenMap } = {}) {
  const ti = themeOf(hr), theme = THEMES[ti];
  let busy = false;
  const book = h("select", { class: "fld", "aria-label": theme + " book" }, h("option", { value: "", text: "Choose a " + theme + " book" }), BOOKS[theme].map((b) => h("option", { value: b, text: b })));
  const ref = h("input", { class: "fld", type: "text", maxLength: 60, placeholder: "Chapter and verses, e.g. 13:1-13", "aria-label": "Chapter and verses" });
  const hint = h("button", { class: "linkbtn", type: "button" });
  const place = h("input", { class: "fld", type: "text", maxLength: 80, list: "places", placeholder: "Place name", "aria-label": "Place" });
  const gpsBtn = h("button", { class: "btn ghost", type: "button" }, icon("pin"), h("span", { text: "Pin GPS" }));
  const geoLine = h("p", { class: "geoline", "aria-live": "polite" });
  const song = h("input", { class: "fld", type: "text", maxLength: 100, list: "songs", placeholder: "Title and artist", "aria-label": "Song listened" });
  const thought = h("textarea", { class: "fld", maxLength: 700, placeholder: "What did this hour open up for you?", "aria-label": "New thought developed" });
  const tick = h("button", { class: "btn primary big", type: "button" });
  const status = h("p", { class: "fstate", "aria-live": "polite" });

  const field = (name, v) => S.setField(k, hr, name, v);
  const logOnce = (type, text) => text && S.logEvent(k, { type, h: hr, text, upsert: type + "-" + k + "-" + hr });
  book.addEventListener("change", () => { field("book", book.value); logOnce("book", book.value && "Reading " + book.value); });
  ref.addEventListener("input", () => field("ref", ref.value.trim()));
  place.addEventListener("input", () => field("place", place.value.trim()));
  place.addEventListener("blur", () => logOnce("place", place.value.trim() && "At " + place.value.trim()));
  song.addEventListener("input", () => field("song", song.value.trim()));
  song.addEventListener("blur", () => logOnce("song", song.value.trim() && "Listened to " + song.value.trim()));
  thought.addEventListener("input", () => field("thought", thought.value));
  thought.addEventListener("blur", () => logOnce("thought", thought.value.trim() && "Thought: " + thought.value.trim().slice(0, 70)));
  hint.addEventListener("click", () => { const b = nextBook(ti); field("book", b); logOnce("book", "Reading " + b); });

  async function pin(auto) {
    if (busy) return; busy = true; sync();
    if (!auto) geoLine.textContent = "Finding you…";
    try {
      const f = await Geo.fix({ timeout: auto ? 9000 : 15000 });
      field("geo", { lat: f.lat, lon: f.lon, acc: f.acc, t: f.t });
      S.addPoint(k, [f.t, f.lat, f.lon, f.acc]);
      S.logEvent(k, { type: "fix", h: hr, text: "GPS pinned for " + hlabel(hr) + " (±" + f.acc + " m)", upsert: "fix-" + k + "-" + hr });
    } catch (e) { if (!auto) geoLine.textContent = e.message; }
    busy = false; sync();
  }
  gpsBtn.addEventListener("click", () => pin(false));
  tick.addEventListener("click", async () => {
    const ph = phase(k, hr); if (ph === "future") return;
    const wasDone = !!S.slotOf(k, hr).done, done = S.toggleDone(k, hr, ph);
    if (!wasDone && done && ph === "now" && !S.slotOf(k, hr).geo && (await Geo.permission()) === "granted") pin(true);
  });

  const el = h("div", { class: "hf t" + ti },
    h("div", { class: "fgroup" }, h("label", { class: "flabel", text: "Reading" }), h("div", { class: "pick" }, book, ref), hint),
    h("div", { class: "fgroup" }, h("label", { class: "flabel", text: "Place" }), h("div", { class: "placerow" }, place, gpsBtn), geoLine),
    h("div", { class: "fgroup" }, h("label", { class: "flabel", text: "Song listened" }), song),
    h("div", { class: "fgroup" }, h("label", { class: "flabel", text: "New thought developed" }), thought),
    tick, status);

  function sync() {
    const s = S.slotOf(k, hr), ph = phase(k, hr), locked = ph === "future";
    const focus = document.activeElement;
    [book, ref, place, song, thought].forEach((i) => { i.disabled = locked; });
    if (focus !== book) book.value = s.book || "";
    [[ref, s.ref], [place, s.place], [song, s.song], [thought, s.thought]].forEach(([i, v]) => { if (focus !== i && i.value !== (v || "")) i.value = v || ""; });
    hint.hidden = locked || !!s.book;
    if (!hint.hidden) hint.textContent = "Next in your " + theme + " order: " + nextBook(ti) + ". Use it";
    gpsBtn.disabled = ph !== "now" || busy;
    gpsBtn.title = ph !== "now" ? "A GPS pin is only taken during the hour you are in." : "";
    if (s.geo) geoLine.textContent = s.geo.lat.toFixed(5) + ", " + s.geo.lon.toFixed(5) + "  ±" + s.geo.acc + " m";
    else if (!/Finding|blocked|signal|long|available|Could/.test(geoLine.textContent)) geoLine.textContent = ph === "now" ? "No GPS pin for this hour yet. It works without data." : "";
    if (s.geo && onOpenMap && !geoLine.querySelector("button")) geoLine.append(" ", h("button", { class: "linkbtn", type: "button", onclick: () => onOpenMap(k) }, "See on map"));
    tick.classList.toggle("done", !!s.done);
    tick.disabled = locked;
    tick.replaceChildren(icon(locked ? "lock" : s.done ? "check" : "now"), h("span", { text: locked ? "Opens at " + hlabel(hr)
      : s.done && s.onTime ? "Counted. Tap to undo"
      : s.done ? "Recorded late, not counted. Tap to undo"
      : ph === "now" ? "Mark this hour as read" : "Record late (not counted)" }));
    status.textContent = ph === "now" ? "This hour counts only if you mark it before it ends."
      : ph === "past" ? "This hour is over. Entries are saved but marked out of track." : "This hour has not opened yet.";
    status.classList.toggle("warn", ph === "past");
  }
  sync();
  return { el, sync };
}
