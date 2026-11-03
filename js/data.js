// Constants, Bible books by theme, and date helpers.
export const START = 6, END = 21, TOTAL = 16;
export const THEMES = ["Love", "Hope", "Faith"];
export const CAPS = [6, 5, 5]; // hours per day for Love, Hope, Faith (6..21 cycling)

// All 66 books, 22 per theme, sorted by each book's dominant emphasis.
export const BOOKS = {
  Love: ["Leviticus","Deuteronomy","Ruth","Proverbs","Song of Solomon","Hosea","Jonah","Micah","Matthew","Luke","John","1 Corinthians","2 Corinthians","Ephesians","Philippians","Colossians","1 Thessalonians","Philemon","1 John","2 John","3 John","Jude"],
  Hope: ["Ezra","Job","Psalms","Ecclesiastes","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Joel","Obadiah","Nahum","Zephaniah","Haggai","Zechariah","Malachi","2 Thessalonians","2 Timothy","Titus","1 Peter","2 Peter","Revelation"],
  Faith: ["Genesis","Exodus","Numbers","Joshua","Judges","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Nehemiah","Esther","Amos","Habakkuk","Mark","Acts","Romans","Galatians","1 Timothy","Hebrews","James"]
};
export const CANON = {
  "Old Testament": ["Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth","1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra","Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon","Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos","Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi"],
  "New Testament": ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"]
};
export const themeOfBook = (b) => THEMES.findIndex((t) => BOOKS[t].includes(b));

export const pad = (n) => String(n).padStart(2, "0");
export const keyOf = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
export const parseKey = (k) => { const p = k.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
export const todayKey = () => keyOf(new Date());
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
export const themeOf = (h) => (h - START) % 3;
export const h12 = (h) => ({ n: (h % 12) || 12, ap: h < 12 ? "AM" : "PM" });
export const hlabel = (h) => { const t = h12(h); return t.n + " " + t.ap; };
export const fmt = (d, o) => d.toLocaleDateString(undefined, o);

// Is hour h of day k in the past, open now, or still in the future?
export function phase(k, h, now = new Date()) {
  const tk = keyOf(now);
  if (k < tk) return "past";
  if (k > tk) return "future";
  const nh = now.getHours();
  return h < nh ? "past" : h === nh ? "now" : "future";
}

// A "quaday" is a block of three hours: one Love, Hope, Faith round. Six blocks a day (the last holds only 9 PM).
export const BLOCKS = 6;
export const blockHours = (b) => { const a = START + b * 3, out = []; for (let h = a; h <= Math.min(a + 2, END); h++) out.push(h); return out; };
export const blockOf = (h) => Math.floor((h - START) / 3);
export const blockLabel = (b) => { const hs = blockHours(b); return hs.length === 1 ? hlabel(hs[0]) : hlabel(hs[0]) + " to " + hlabel(hs[hs.length - 1] + 1); };

// Date ranges for the roll-up units.
export function rangeFor(unit, k) {
  const d = parseKey(k);
  let s, e;
  if (unit === "day") { s = e = d; }
  else if (unit === "week") { const off = (d.getDay() + 6) % 7; s = new Date(d.getFullYear(), d.getMonth(), d.getDate() - off); e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6); }
  else if (unit === "month") { s = new Date(d.getFullYear(), d.getMonth(), 1); e = new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  else if (unit === "quarter") { const q = Math.floor(d.getMonth() / 3); s = new Date(d.getFullYear(), q * 3, 1); e = new Date(d.getFullYear(), q * 3 + 3, 0); }
  else { s = new Date(d.getFullYear(), 0, 1); e = new Date(d.getFullYear(), 11, 31); }
  return { s, e };
}
export function eachDay(r, fn) { for (let d = new Date(r.s); d <= r.e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) fn(keyOf(d), d); }

export function haversine(a, b) { // metres between two [.., lat, lon] points
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad, dLon = (b[2] - a[2]) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export const fmtDist = (m) => m < 950 ? Math.round(m) + " m" : (m / 1000).toFixed(m < 10000 ? 2 : 1) + " km";

// Distance between two track points, ignoring GPS jitter smaller than the fixes' own error.
export function segDist(a, b) { const d = haversine(a, b); return d < Math.max(8, ((a[3] || 0) + (b[3] || 0)) / 4) ? 0 : d; }
export function trackDistance(pts) { let m = 0; for (let i = 1; i < pts.length; i++) m += segDist(pts[i - 1], pts[i]); return m; }
