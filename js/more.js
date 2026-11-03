// More: tracing, install, backup and the rules.
import { h, icon, clear } from "./ui.js";
import * as S from "./store.js";
import * as Geo from "./geo.js";

export function mountMore(root) {
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; update(); });
  const trackBox = h("section", { class: "card" }), installBox = h("section", { class: "card" }), dataBox = h("section", { class: "card" }), msg = h("p", { class: "sub", "aria-live": "polite" });
  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  file.addEventListener("change", async () => {
    const f = file.files[0]; if (!f) return;
    try { const n = await S.importAll(await f.text()); msg.textContent = "Restored " + n + " days from the backup."; } catch (e) { msg.textContent = e.message || "Could not read that file."; }
    file.value = "";
  });
  let confirmWipe = false;
  const wipeBox = h("section", { class: "card" });
  root.append(trackBox, installBox, dataBox, h("section", { class: "card" }, h("h3", { text: "How the hours work" }),
    h("ul", { class: "rules" },
      h("li", { text: "The day runs from 6 AM to 9:59 PM, sixteen hours. Hours cycle Love, Hope, Faith, so 6 AM is Love, 7 AM Hope, 8 AM Faith, 9 AM Love, and so on." }),
      h("li", { text: "An hour counts only if you mark it during that hour. Later you can still record it. It is kept, shown out of track, and left out of totals and streaks." }),
      h("li", { text: "All 66 books are split 22 each across Love, Hope and Faith. The Now page suggests the next book in order for the hour's theme." }),
      h("li", { text: "The hour rule uses your phone's clock. It is a discipline aid, not a lock." }),
      h("li", { text: "Everything is saved on this device. It works with no data connection. Export a backup now and then." }))), wipeBox, msg, file);

  function update() {
    const tracking = Geo.isTracking(), err = S.state.trackError;
    clear(trackBox).append(h("h3", { text: "Trace my day" }),
      h("p", { class: "sub", text: "Records where you go while this app is open and your screen is on. Points are kept when you move 25 m or every 3 minutes. GPS works without mobile data. The path is drawn on the Map page." }),
      h("button", { class: "btn" + (tracking ? "" : " primary"), type: "button", onclick: () => { if (!Geo.setTracking(!tracking)) msg.textContent = "GPS is not available on this device."; update(); } }, tracking ? "Stop tracing" : "Start tracing"),
      err ? h("p", { class: "warnline", text: err }) : null,
      h("p", { class: "dim", text: "Phones usually pause web pages when the screen is locked, so keep the app open for a continuous path. Hour pins and the Now page work any time you are in the app." }));
    clear(installBox).append(h("h3", { text: "Install on your phone" }),
      h("p", { class: "sub", text: "Installing makes it open like an app and keep working offline." }),
      installEvt ? h("button", { class: "btn primary", type: "button", onclick: async () => { installEvt.prompt(); installEvt = null; update(); } }, "Install the app")
        : h("p", { class: "dim", text: "On Android Chrome: menu, then Add to Home screen. On iPhone Safari: Share, then Add to Home Screen." }));
    clear(dataBox).append(h("h3", { text: "Your data" }),
      h("p", { class: "sub", text: S.state.persistent ? S.state.days.size + " days saved on this device." : "Your browser blocked storage, so entries last only until you close this page." }),
      h("div", { class: "addrow" },
        h("button", { class: "btn", type: "button", onclick: async () => {
          const blob = new Blob([await S.exportAll()], { type: "application/json" }), a = h("a", { href: URL.createObjectURL(blob), download: "bible-hours-backup-" + new Date().toISOString().slice(0, 10) + ".json" });
          document.body.appendChild(a); a.click(); a.remove(); msg.textContent = "Backup downloaded.";
        } }, "Export backup"),
        h("button", { class: "btn", type: "button", onclick: () => file.click() }, "Restore from backup")));
    clear(wipeBox).append(h("h3", { text: "Start over" }),
      confirmWipe ? h("div", {}, h("p", { class: "warnline", text: "This erases every day, track and setting on this device. It cannot be undone." }),
        h("div", { class: "addrow" }, h("button", { class: "btn danger", type: "button", onclick: async () => { await S.wipe(); confirmWipe = false; msg.textContent = "All data erased."; update(); } }, "Erase everything"),
          h("button", { class: "btn", type: "button", onclick: () => { confirmWipe = false; update(); } }, "Cancel")))
        : h("button", { class: "btn danger", type: "button", onclick: () => { confirmWipe = true; update(); } }, "Erase all data"));
  }
  update();
  return { update };
}
