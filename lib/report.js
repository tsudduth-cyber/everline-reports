// Everline Roofing — single-page project progress report renderer.
import { FACES } from "./fonts.js";
import { LOGO } from "./assets.js";

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const STATUS_CLS = { "In Progress": "prog", Complete: "done", "On Hold": "hold", Scheduled: "sched" };

const li = (items) =>
  items && items.length
    ? items.map((x) => `<li>${esc(x)}</li>`).join("")
    : '<li class="muted">No items reported.</li>';

// ---------- photo gallery: fills a W x H panel, least cropping ----------
function splitRows(items, R) {
  const n = items.length, base = Math.floor(n / R), rem = n % R;
  const rows = []; let i = 0;
  for (let r = 0; r < R; r++) { const k = base + (r < rem ? 1 : 0); rows.push(items.slice(i, i + k)); i += k; }
  return rows;
}
// Cost of a candidate layout: average, area-weighted crop per cell. Cropping a
// photo's width (cell narrower than the photo) reads far worse than trimming its
// top/bottom, so horizontal cropping is penalised harder (HCROP). This makes the
// layout follow orientation: landscape photos stack, portrait photos sit side by side.
const HCROP = 2.0;
function layoutCost(rows, W, H, G) {
  const R = rows.length, rowH = (H - (R - 1) * G) / R;
  let cost = 0, area = 0;
  for (const row of rows) {
    const arSum = row.reduce((s, x) => s + x.ar, 0), inner = W - (row.length - 1) * G;
    for (const it of row) {
      const cellW = inner * (it.ar / arSum), cellAR = cellW / rowH, a = cellW * rowH;
      const c = cellAR >= it.ar ? (cellAR / it.ar - 1) : HCROP * (it.ar / cellAR - 1);
      cost += c * a; area += a;
    }
  }
  return cost / area;
}
function gallery(photos, W, H) {
  const items = (photos || []).map((p) => ({ src: (p && p.src) || p, ar: Math.max(0.4, Math.min(3.2, (p && p.ar) || 1.4)) }));
  const n = items.length;
  if (n === 0) return placeholder("Progress photos");
  const G = 8;
  // Candidate arrangements: even row splits (1 row … up to 3 rows), plus a
  // "one large on top, two below" option for the 3-photo case.
  const candidates = [];
  for (let R = 1; R <= Math.min(n, 3); R++) candidates.push(splitRows(items, R));
  if (n === 3) candidates.push([items.slice(0, 1), items.slice(1, 3)]);
  let best = null;
  for (const rows of candidates) {
    const score = layoutCost(rows, W, H, G);
    if (!best || score < best.score) best = { rows, score };
  }
  const R = best.rows.length, rowH = (H - (R - 1) * G) / R;
  const rowsHtml = best.rows.map((row) => {
    const cells = row.map((it) => `<div class="gcell" style="flex:${it.ar.toFixed(3)} 1 0"><img src="${it.src}"/></div>`).join("");
    return `<div class="grow" style="height:${rowH.toFixed(1)}px">${cells}</div>`;
  }).join("");
  return `<div class="gallery">${rowsHtml}</div>`;
}

function placeholder(label) {
  return `<div class="ph"><div class="ph-grid"></div><svg class="ph-roof" viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg"><path d="M14 46 L60 16 L106 46" fill="none" stroke="#B7B1A8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="54" y="36" width="12" height="12" fill="none" stroke="#B7B1A8" stroke-width="2.5"/></svg><div class="ph-cap">${esc(label)} to add</div></div>`;
}

function satellitePanel(sat, address) {
  if (!sat || !(sat.src || typeof sat === "string")) return placeholder("Site imagery");
  const src = sat.src || sat;
  return `<div class="sat">
    <img src="${src}"/>
    <div class="sat-chip">Site</div>
    <div class="sat-n">N&uarr;</div>
    ${address ? `<div class="sat-addr">${esc(address)}</div>` : ""}
  </div>`;
}

function onePager(P) {
  const pct = Math.max(0, Math.min(100, Number(P.pct) || 0));
  const status = P.status || "In Progress";
  const cls = STATUS_CLS[status] || "prog";
  const HERO_W = 452, HERO_H = 330;
  return `<section class="page">
  <div class="topbar"></div>
  <header class="head">
    <img class="logo" src="${LOGO}" alt="Everline Roofing"/>
    <div class="kicker">Project Progress Report</div>
  </header>
  <div class="title-row">
    <div class="t-left">
      <h1>${esc(P.name)}</h1>
      <div class="addr">${esc(P.address || "")}</div>
    </div>
    <div class="t-right">
      <div class="status ${cls}">${esc(status)}</div>
      <div class="pct">${pct}<span>%</span></div>
      <div class="pct-lbl">Complete</div>
    </div>
  </div>
  <div class="pbar"><div class="pbar-fill" style="width:${pct}%"></div></div>
  <div class="hero">
    <div class="hero-col">${satellitePanel(P.satellite, P.address)}</div>
    <div class="hero-col">${gallery(P.photos, HERO_W, HERO_H)}</div>
  </div>
  <div class="notes">
    <div class="note-col">
      <div class="note-lbl">Progress to Date</div>
      <ul class="note-list">${li(P.progress)}</ul>
    </div>
    <div class="note-col">
      <div class="note-lbl next">Next Steps</div>
      <ul class="note-list">${li(P.next)}</ul>
    </div>
  </div>
  <div class="foot">
    <span>${esc(P.name)}</span>
    <span>${esc(P.date || "")} &nbsp;&middot;&nbsp; Report ${esc(P.reportNo || "01")} &nbsp;&middot;&nbsp; Everline Roofing</span>
  </div>
</section>`;
}

const CSS = `
*{margin:0;padding:0;box-sizing:border-box;}
:root{--navy:#192A56;--orange:#F26A26;--slate:#5E7187;--concrete:#E7E3DB;--deck:#B7B1A8;--graphite:#2B2E34;--warm:#F8F6F2;--hair:#dcd8d0;}
html,body{background:#fff;}
.page{width:1056px;height:816px;background:var(--warm);position:relative;overflow:hidden;font-family:'Inter',sans-serif;color:var(--graphite);-webkit-font-smoothing:antialiased;}
.topbar{position:absolute;top:0;left:0;right:0;height:6px;background:var(--navy);}
.topbar::after{content:"";position:absolute;top:0;left:0;width:180px;height:6px;background:var(--orange);}
.head{display:flex;justify-content:space-between;align-items:center;padding:34px 56px 0;}
.head .logo{height:38px;display:block;}
.kicker{font-family:'Manrope';font-weight:800;font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--slate);}
.title-row{display:flex;justify-content:space-between;align-items:flex-end;padding:26px 56px 0;}
.t-left h1{font-family:'Manrope';font-weight:800;font-size:38px;line-height:1;color:var(--navy);letter-spacing:-.5px;}
.addr{font-family:'Manrope';font-weight:700;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--slate);margin-top:11px;}
.t-right{text-align:right;display:flex;flex-direction:column;align-items:flex-end;}
.status{font-family:'Manrope';font-weight:800;font-size:9.5px;letter-spacing:.16em;text-transform:uppercase;padding:5px 11px;border-radius:3px;color:#fff;}
.status.prog{background:var(--orange);}
.status.done{background:var(--navy);}
.status.hold{background:var(--slate);}
.status.sched{background:var(--deck);color:var(--graphite);}
.pct{font-family:'Manrope';font-weight:800;font-size:46px;line-height:.9;color:var(--navy);margin-top:8px;}
.pct span{font-size:20px;color:var(--orange);margin-left:2px;}
.pct-lbl{font-family:'Manrope';font-weight:700;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:var(--slate);margin-top:2px;}
.pbar{height:10px;background:var(--concrete);border-radius:5px;margin:18px 56px 0;overflow:hidden;}
.pbar-fill{height:100%;background:var(--orange);border-radius:5px;}
.hero{display:flex;gap:24px;padding:22px 56px 0;height:352px;}
.hero-col{flex:1;height:330px;min-width:0;}
.sat{position:relative;height:100%;border:1px solid var(--deck);background:var(--concrete);overflow:hidden;}
.sat img{width:100%;height:100%;object-fit:cover;display:block;}
.sat::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(25,42,86,0) 52%,rgba(25,42,86,.62));pointer-events:none;}
.sat-chip{position:absolute;top:0;left:0;background:var(--navy);color:#fff;font-family:'Manrope';font-weight:800;font-size:9px;letter-spacing:.18em;text-transform:uppercase;padding:7px 13px;z-index:2;}
.sat-n{position:absolute;top:11px;right:13px;color:#fff;font-family:'Manrope';font-weight:800;font-size:11px;letter-spacing:.05em;z-index:2;text-shadow:0 1px 3px rgba(0,0,0,.5);}
.sat-addr{position:absolute;left:15px;bottom:13px;right:15px;color:#fff;font-family:'Manrope';font-weight:800;font-size:15px;line-height:1.15;z-index:2;text-shadow:0 1px 4px rgba(0,0,0,.5);}
.gallery{display:flex;flex-direction:column;gap:8px;height:100%;}
.grow{display:flex;gap:8px;}
.gcell{flex-basis:0;min-width:0;overflow:hidden;border:1px solid var(--deck);}
.gcell img{width:100%;height:100%;object-fit:cover;display:block;}
.ph{position:relative;height:100%;background:var(--concrete);border:1px solid var(--deck);display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.ph-grid{position:absolute;inset:0;opacity:.5;background-image:linear-gradient(#dcd6cc 1px,transparent 1px),linear-gradient(90deg,#dcd6cc 1px,transparent 1px);background-size:34px 34px;}
.ph-roof{position:relative;width:120px;height:60px;}
.ph-cap{position:relative;margin-top:14px;font-family:'Manrope';font-weight:700;font-size:12px;letter-spacing:.02em;color:var(--slate);}
.notes{display:flex;gap:44px;padding:26px 56px 0;}
.note-col{flex:1;}
.note-lbl{font-family:'Manrope';font-weight:800;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--navy);padding-bottom:10px;border-bottom:2px solid var(--navy);margin-bottom:4px;}
.note-lbl.next{color:var(--orange);border-bottom-color:var(--orange);}
.note-list{list-style:none;}
.note-list li{position:relative;font-size:13px;line-height:1.45;color:var(--graphite);padding:8px 0 8px 16px;border-bottom:1px solid #e8e4dc;}
.note-list li::before{content:"";position:absolute;left:0;top:14px;width:6px;height:6px;background:var(--orange);}
.note-list li:last-child{border-bottom:none;}
.note-list li.muted{color:var(--slate);}.note-list li.muted::before{background:var(--deck);}
.foot{position:absolute;bottom:0;left:0;right:0;height:46px;display:flex;justify-content:space-between;align-items:center;padding:0 56px;border-top:1px solid var(--hair);font-family:'Manrope';font-weight:700;font-size:9px;letter-spacing:.1em;color:var(--slate);text-transform:uppercase;}
@page{size:1056px 816px;margin:0;}
`;

export function buildReportHTML(P) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="only light"><style>${FACES}${CSS}</style></head><body>${onePager(P)}</body></html>`;
}
