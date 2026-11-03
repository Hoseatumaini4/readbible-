import { h, icon } from "./ui.js";
import { themeOf, THEMES, hlabel } from "./data.js";
import * as S from "./store.js";

const KINDS = { tick: "Reading", fix: "GPS", book: "Book", place: "Place", song: "Song", thought: "Thought", action: "Action", track: "Trace" };

// The record of everything that happened on a day, in time order.
export function dayTimeline(k) {
  const ev = S.getDay(k).events;
  if (!ev.length) return h("p", { class: "empty", text: "Nothing recorded for this day yet." });
  return h("ol", { class: "tl" }, ev.map((e) => {
    const t = new Date(e.t), time = t.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    const ti = e.h != null ? themeOf(e.h) : null;
    return h("li", { class: "tli" + (ti != null ? " t" + ti : "") },
      h("time", { text: time }),
      h("span", { class: "dot" }),
      h("div", { class: "tlb" }, h("span", { class: "tag", text: KINDS[e.type] || "Note" }), h("span", { text: e.text }),
        e.type === "action" ? h("button", { class: "iconbtn sm", type: "button", "aria-label": "Delete this entry", onclick: () => S.removeEvent(k, e.t) }, icon("trash")) : null));
  }));
}
export const themeName = (hr) => THEMES[themeOf(hr)];
export const stateWords = (s, ph, hr) => s.done && s.onTime ? "Read on time, counted"
  : s.done ? "Recorded late, not counted"
  : ph === "now" ? "Open now" : ph === "past" ? (s.book || s.thought || s.place || s.song ? "Notes saved, out of track" : "Missed, out of track") : "Opens at " + hlabel(hr);
