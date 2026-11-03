// The Now page: only the hour that is open, ready to fill.
import { h, icon, clear } from "./ui.js";
import { START, END, TOTAL, THEMES, themeOf, h12, hlabel, todayKey, pad, parseKey, fmt } from "./data.js";
import { hourForm } from "./form.js";
import { openEditor } from "./editor.js";
import * as S from "./store.js";
import * as Geo from "./geo.js";

const R = 88, C = 2 * Math.PI * R;
const QUICK = ["Prayed", "Class", "Work", "Walked", "Travelled", "Meal", "Rest", "Study"];

export function mountNow(root, { goMap, goReview }) {
  let formHour = null, form = null;
  const hero = h("section", { class: "card hero" });
  const formCard = h("section", { class: "card formcard" });
  const closed = h("section", { class: "card closed", hidden: true });
  const pips = h("div", { class: "pips", role: "list", "aria-label": "Today's sixteen hours" });
  const actInput = h("input", { class: "fld", type: "text", maxLength: 100, placeholder: "Something else you did", "aria-label": "Log an action" });
  const actList = h("div", { class: "actlist" });
  const logAct = (text) => { text = (text || "").trim(); if (text) { S.logEvent(todayKey(), { type: "action", text }); actInput.value = ""; } };
  actInput.addEventListener("keydown", (e) => { if (e.key === "Enter") logAct(actInput.value); });
  const actions = h("section", { class: "card" },
    h("h3", { text: "Other things today" }), h("p", { class: "sub", text: "One tap saves it with the time. It shows in your day timeline." }),
    h("div", { class: "chips" }, QUICK.map((q) => h("button", { class: "chipbtn", type: "button", onclick: () => logAct(q) }, q))),
    h("div", { class: "addrow" }, actInput, h("button", { class: "btn", type: "button", onclick: () => logAct(actInput.value) }, "Add")), actList);
  const today = h("section", { class: "card" }, h("div", { class: "rowsb" }, h("h3", { text: "Today" }), h("button", { class: "linkbtn", type: "button", onclick: () => goReview("day") }, "Open full day")), pips);
  root.append(hero, closed, formCard, today, actions);

  function ring(hr, now) {
    const mins = now.getMinutes() + now.getSeconds() / 60, left = 60 - mins, f = left / 60, t = h12(hr);
    return h("div", { class: "ringwrap" },
      h("svg", { viewBox: "0 0 200 200", class: "ring", "aria-hidden": "true" },
        h("circle", { cx: 100, cy: 100, r: R, class: "trk" }),
        h("circle", { cx: 100, cy: 100, r: R, class: "arc", transform: "rotate(-90 100 100)", "stroke-dasharray": (C * f).toFixed(1) + " " + C.toFixed(1) })),
      h("div", { class: "ringc" }, h("span", { class: "hnum", text: String(t.n) }), h("span", { class: "hap", text: t.ap })));
  }
  const minsText = (n) => n >= 60 ? Math.floor(n / 60) + " h " + (n % 60) + " min" : n + " min";

  function renderPips(now) {
    const k = todayKey(); clear(pips);
    for (let hr = START; hr <= END; hr++) {
      const s = S.slotOf(k, hr), on = S.isOn(s), late = S.isLate(s), isNow = now.getHours() === hr && k === todayKey();
      const past = hr < now.getHours();
      pips.appendChild(h("button", { class: "pip t" + themeOf(hr) + (on ? " on" : late ? " late" : past ? " miss" : "") + (isNow ? " now" : ""), type: "button", role: "listitem",
        "aria-label": hlabel(hr) + ", " + THEMES[themeOf(hr)] + ": " + (on ? "counted" : late ? "late" : isNow ? "open now" : past ? "missed" : "not yet open"),
        onclick: () => (hr <= now.getHours() ? openEditor(k, hr, { onOpenMap: goMap }) : null) }, String(h12(hr).n)));
    }
  }

  function renderActs() {
    clear(actList);
    const acts = S.getDay(todayKey()).events.filter((e) => e.type === "action").slice(-3).reverse();
    acts.forEach((e) => actList.appendChild(h("p", { class: "actrow" }, h("time", { text: new Date(e.t).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) }), h("span", { text: e.text }))));
  }

  function update() {
    const now = new Date(), hr = now.getHours(), k = todayKey(), open = hr >= START && hr <= END;
    hero.hidden = !open; formCard.hidden = !open; closed.hidden = open;
    if (open) {
      const ti = themeOf(hr), theme = THEMES[ti], s = S.slotOf(k, hr);
      hero.className = "card hero t" + ti;
      clear(hero).append(ring(hr, now),
        h("div", { class: "herotxt" },
          h("p", { class: "kicker", text: fmt(now, { weekday: "long", day: "numeric", month: "long" }) }),
          h("h1", {}, theme, h("span", { class: "hourcount", text: "  Hour " + (hr - START + 1) + " of " + TOTAL })),
          h("p", { class: "left" }, h("b", { text: minsText(60 - now.getMinutes()) }), " left in this hour"),
          h("p", { class: "sub", text: s.done && s.onTime ? "Counted for today." : "Fill it in and mark it before the hour ends." })));
      if (formHour !== hr || !form) { formHour = hr; form = hourForm(k, hr, { onOpenMap: goMap }); formCard.className = "card formcard t" + ti; clear(formCard).append(form.el); }
      form.sync();
    } else {
      formHour = null; form = null;
      const n = S.countOn(k), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (hr > END ? 1 : 0), START, 0, 0), mins = Math.round((next - now) / 60000);
      clear(closed).append(h("p", { class: "kicker", text: hr > END ? "Today's hours are finished" : "Quiet hours" }),
        h("h1", { text: hr > END ? n + " of " + TOTAL + " counted" : "The first hour opens at 6 AM" }),
        h("p", { class: "sub", text: "Next hour opens in " + minsText(mins) + ". Past hours can still be recorded from Review, marked out of track." }),
        h("button", { class: "btn primary", type: "button", onclick: () => goReview("day") }, "Review today"));
    }
    renderPips(now); renderActs();
  }
  return { update };
}
