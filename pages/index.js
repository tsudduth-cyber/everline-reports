import { useEffect, useRef, useState } from "react";
import { LOGO } from "../lib/assets.js";

const PASSWORD = "EVERLINE2026!";
const STATUSES = ["In Progress", "Complete", "On Hold", "Scheduled"];
const uid = () => Math.random().toString(36).slice(2, 9);
const today = () =>
  new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

const blankProject = () => ({
  id: uid(), name: "New Site", address: "", date: today(), reportNo: "01",
  status: "In Progress", pct: 0, progress: "", next: "",
  satellite: null, satelliteRaw: null, satellitePoints: null, photos: [],
});

// keep the traced satellite; drop weekly photos before saving
const forSave = (p) => ({ ...p, photos: [] });

// ---------- image helpers ----------
function fileToDataURL(file) {
  return new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
}
function loadImg(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
async function downscale(dataURL, maxDim, quality) {
  const img = await loadImg(dataURL);
  let { naturalWidth: w, naturalHeight: h } = img;
  if (w > maxDim || h > maxDim) { const s = maxDim / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return { src: c.toDataURL("image/jpeg", quality), w, h };
}
async function compressPhoto(file) {
  const d = await fileToDataURL(file);
  const { src, w, h } = await downscale(d, 1400, 0.72);
  return { src, ar: w / h };
}

// bake the fade + orange-outline treatment from a raw image + polygon points (in raw px)
async function bakeSatellite(rawSrc, points) {
  const img = await loadImg(rawSrc);
  const w = img.naturalWidth, h = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.filter = "grayscale(1) brightness(0.5) contrast(0.9) blur(1.2px)";
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = "none";
  const trace = () => { ctx.beginPath(); points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
  ctx.save(); trace(); ctx.clip(); ctx.drawImage(img, 0, 0, w, h); ctx.restore();
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.62);
  g.addColorStop(0, "rgba(10,16,34,0)"); g.addColorStop(1, "rgba(10,16,34,0.55)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  trace(); ctx.lineJoin = "round"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 7; ctx.stroke();
  trace(); ctx.strokeStyle = "#F26A26"; ctx.lineWidth = 4; ctx.stroke();
  return c.toDataURL("image/jpeg", 0.86);
}

// ---------- satellite tracer ----------
function SiteTracer({ project, patch }) {
  const [tracing, setTracing] = useState(false);
  const [raw, setRaw] = useState(project.satelliteRaw || null); // {src,w,h}
  const [points, setPoints] = useState(project.satellitePoints || []);
  const canvasRef = useRef(null);
  const DISP_W = 620;

  const disp = raw ? { w: DISP_W, h: Math.round((raw.h / raw.w) * DISP_W), s: DISP_W / raw.w } : null;

  useEffect(() => { if (tracing && raw) draw(); }); // redraw on every render while tracing

  async function onFile(file) {
    if (!file) return;
    const d = await fileToDataURL(file);
    const ds = await downscale(d, 1100, 0.85);
    setRaw(ds); setPoints([]); setTracing(true);
  }
  async function draw() {
    const cv = canvasRef.current; if (!cv || !raw) return;
    cv.width = disp.w; cv.height = disp.h;
    const ctx = cv.getContext("2d");
    const img = await loadImg(raw.src);
    ctx.clearRect(0, 0, disp.w, disp.h);
    ctx.drawImage(img, 0, 0, disp.w, disp.h);
    if (points.length) {
      ctx.beginPath();
      points.forEach((p, i) => { const x = p.x * disp.s, y = p.y * disp.s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      if (points.length > 2) ctx.closePath();
      ctx.strokeStyle = "#F26A26"; ctx.lineWidth = 2.5; ctx.stroke();
      points.forEach((p) => { ctx.beginPath(); ctx.arc(p.x * disp.s, p.y * disp.s, 4, 0, 7); ctx.fillStyle = "#fff"; ctx.fill(); ctx.strokeStyle = "#192A56"; ctx.lineWidth = 2; ctx.stroke(); });
    }
  }
  function onCanvasClick(e) {
    const cv = canvasRef.current; const rect = cv.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (cv.width / rect.width) / disp.s;
    const y = (e.clientY - rect.top) * (cv.height / rect.height) / disp.s;
    setPoints((pts) => [...pts, { x, y }]);
  }
  async function apply() {
    if (points.length < 3) return;
    const baked = await bakeSatellite(raw.src, points);
    patch({ satellite: { src: baked }, satelliteRaw: raw, satellitePoints: points });
    setTracing(false);
  }
  function remove() {
    setRaw(null); setPoints([]); setTracing(false);
    patch({ satellite: null, satelliteRaw: null, satellitePoints: null });
  }

  if (!tracing) {
    return (
      <div className="tracer">
        {project.satellite ? (
          <div className="sat-preview">
            <img src={project.satellite.src} alt="Site" />
            <div className="sat-actions">
              <button onClick={() => { if (raw) { setTracing(true); } else if (project.satelliteRaw) { setRaw(project.satelliteRaw); setPoints(project.satellitePoints || []); setTracing(true); } }}>Re-trace</button>
              <button className="ghost" onClick={remove}>Remove</button>
            </div>
          </div>
        ) : (
          <label className="upload big">
            + Add site image
            <input type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { onFile(e.target.files[0]); e.target.value = ""; }} />
            <span className="hint">Use a label-off satellite screenshot, then trace your building.</span>
          </label>
        )}
      </div>
    );
  }

  return (
    <div className="tracer active">
      <div className="trace-help">Click around <b>your building</b> to trace it — add points, then Apply. (Neighbors fade out; your building keeps full color with an orange outline.)</div>
      <canvas ref={canvasRef} className="trace-canvas" onClick={onCanvasClick} />
      <div className="trace-btns">
        <button onClick={apply} disabled={points.length < 3} className="primary">Apply highlight</button>
        <button onClick={() => setPoints((p) => p.slice(0, -1))} disabled={!points.length}>Undo point</button>
        <button onClick={() => setPoints([])} disabled={!points.length}>Clear</button>
        <label className="upload sm">Replace image
          <input type="file" accept="image/*" style={{ display: "none" }}
            onChange={(e) => { onFile(e.target.files[0]); e.target.value = ""; }} /></label>
        <button className="ghost" onClick={() => setTracing(false)}>Cancel</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState(""); const [pwError, setPwError] = useState(false);
  const [list, setList] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [current, setCurrent] = useState(null);
  const [loadingProj, setLoadingProj] = useState(false);
  const [sync, setSync] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const currentRef = useRef(null); currentRef.current = current;
  const saveTimer = useRef(null);

  useEffect(() => { if (typeof window !== "undefined" && sessionStorage.getItem("ev_authed") === "1") setAuthed(true); }, []);

  async function loadList() { try { const r = await fetch("/api/projects"); setList(await r.json()); } catch { setList([]); } }
  useEffect(() => { if (authed && currentId === null) loadList(); }, [authed, currentId]);

  async function openProject(id) {
    setLoadingProj(true); setCurrentId(id); setCurrent(null);
    try { const r = await fetch(`/api/projects?id=${encodeURIComponent(id)}`); const p = await r.json(); setCurrent(p ? { ...p, photos: p.photos || [] } : null); }
    catch { setError("Couldn't load that project."); } finally { setLoadingProj(false); }
  }
  function scheduleSave() {
    setSync("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forSave(currentRef.current)) }); setSync("saved"); }
      catch { setSync("error"); }
    }, 800);
  }
  const patch = (p) => { setCurrent((c) => ({ ...c, ...p })); scheduleSave(); };

  function login(e) { e.preventDefault(); if (pw === PASSWORD) { setAuthed(true); sessionStorage.setItem("ev_authed", "1"); } else setPwError(true); }
  async function newProject() {
    const p = blankProject();
    await fetch("/api/projects", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(forSave(p)) });
    setCurrent(p); setCurrentId(p.id);
  }
  async function deleteProject(id) {
    if (!confirm("Delete this site report?")) return;
    await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" }); loadList();
  }
  async function addPhotos(files) {
    const arr = (await Promise.all(Array.from(files).slice(0, 4).map(compressPhoto))).filter(Boolean);
    setCurrent((c) => ({ ...c, photos: [...(c.photos || []), ...arr].slice(0, 4) }));
  }
  const removePhoto = (i) => setCurrent((c) => ({ ...c, photos: c.photos.filter((_, x) => x !== i) }));

  async function generate() {
    setBusy(true); setError("");
    const toItems = (t) => (t || "").split("\n").map((x) => x.trim()).filter(Boolean);
    const c = currentRef.current;
    const payload = {
      name: c.name, address: c.address, date: c.date, reportNo: c.reportNo, status: c.status, pct: Number(c.pct) || 0,
      fileName: `Everline-${c.name}-${c.reportNo}`,
      progress: toItems(c.progress), next: toItems(c.next),
      satellite: c.satellite || null, photos: c.photos || [],
    };
    try {
      const r = await fetch("/api/generate-pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Server error ${r.status}`);
      const blob = await r.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `${payload.fileName.replace(/[^\w\-]+/g, "-")}.pdf`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(String(e.message || e)); } finally { setBusy(false); }
  }

  if (!authed)
    return (
      <div className="gate">
        <form className="gate-card" onSubmit={login}>
          <img className="gate-logo" src={LOGO} alt="Everline Roofing" />
          <div className="gate-label">Project Progress Reports</div>
          <input type="password" placeholder="Password" value={pw} onChange={(e) => { setPw(e.target.value); setPwError(false); }} autoFocus />
          {pwError && <div className="gate-err">Incorrect password</div>}
          <button type="submit">Enter</button>
        </form>
      </div>
    );

  const Brand = () => (<div className="brand"><img className="brand-logo" src={LOGO} alt="Everline" /></div>);

  if (currentId === null)
    return (
      <div className="wrap">
        <header className="topbar"><Brand /><span className="sync-hint">Everline Roofing</span></header>
        <main className="dash">
          <div className="dash-head"><h1>Site Reports</h1><button className="primary" onClick={newProject}>+ New Site</button></div>
          {list === null ? <div className="muted-block">Loading…</div>
            : list.length === 0 ? <div className="muted-block">No sites yet. Create one to get started.</div>
              : <div className="cards">{list.map((p) => (
                <div key={p.id} className="pcard" onClick={() => openProject(p.id)}>
                  <div className="pcard-name">{p.name}</div>
                  <div className="pcard-meta">{p.address || "No address"} · {p.status} · {p.pct || 0}%</div>
                  <button className="del" onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }}>Delete</button>
                </div>))}
              </div>}
        </main>
      </div>
    );

  return (
    <div className="wrap">
      <header className="topbar">
        <button className="back" onClick={() => { setCurrentId(null); setCurrent(null); }}>← Sites</button>
        <Brand />
        <div className="top-right">
          <span className={`sync sync-${sync}`}>{sync === "saving" ? "Saving…" : sync === "saved" ? "Saved" : sync === "error" ? "Sync error" : ""}</span>
          <button className="primary gen" onClick={generate} disabled={busy || !current}>{busy ? "Generating…" : "Generate PDF"}</button>
        </div>
      </header>
      {error && <div className="errbar">Couldn't generate: {error}</div>}
      {loadingProj || !current ? <div className="muted-block">Loading…</div> : (
        <main className="editor">
          <section className="fields">
            <label className="wide">Site name<input value={current.name} onChange={(e) => patch({ name: e.target.value })} /></label>
            <label className="wide">Address<input value={current.address} onChange={(e) => patch({ address: e.target.value })} /></label>
            <label>Report date<input value={current.date} onChange={(e) => patch({ date: e.target.value })} /></label>
            <label>Report no.<input value={current.reportNo} onChange={(e) => patch({ reportNo: e.target.value })} /></label>
            <label>Status<select value={current.status} onChange={(e) => patch({ status: e.target.value })}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label>% Complete
              <div className="pct-row"><input type="range" min="0" max="100" value={current.pct} onChange={(e) => patch({ pct: Number(e.target.value) })} /><span>{current.pct}%</span></div>
            </label>
          </section>

          <div className="section-lbl">Site Image</div>
          <SiteTracer project={current} patch={patch} />

          <div className="section-lbl">Progress Photos <small>(up to 4)</small></div>
          <div className="photos">
            <label className="upload">+ Add photos
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} /></label>
            {current.photos && current.photos.length > 0 && (
              <div className="thumbs">{current.photos.map((p, i) => (
                <div className="thumb" key={i} style={{ backgroundImage: `url(${p.src || p})` }}><button onClick={() => removePhoto(i)}>✕</button></div>
              ))}</div>
            )}
          </div>

          <div className="two-col">
            <label>Progress to date <small>(one per line)</small>
              <textarea rows={5} value={current.progress} onChange={(e) => patch({ progress: e.target.value })} /></label>
            <label>Next steps <small>(one per line)</small>
              <textarea rows={5} value={current.next} onChange={(e) => patch({ next: e.target.value })} /></label>
          </div>
          <div className="footer-note">Text and the traced site image save automatically. Progress photos are added fresh each report and embedded when you generate.</div>
        </main>
      )}
    </div>
  );
}
