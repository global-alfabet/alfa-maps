import { useEffect, useRef, useState } from "react";
import { EstateScene } from "@alfa-maps/engine/estate";
import { edgeLabel } from "../lib/pdf.js";
import { words } from "../lib/words.js";

const VIEWS = [
  { key: "estate", label: "Whole estate" },
  { key: "planEstate", label: "Estate map" },
  { key: "street", label: "Street", stand: true },
  { key: "aerial", label: "Aerial", stand: true },
  { key: "garden", label: "Garden", stand: true },
  { key: "plan", label: "Site plan", stand: true },
  { key: "free", label: "Free roam" },
];

export default function Viewer({ data, specs, look, selected, onSelect, view, setView, onDropHouse, sceneRef, onReady }) {
  const box = useRef(null); const [labels, setLabels] = useState([]); const [dims, setDims] = useState([]); const [tip, setTip] = useState(null); const [loading, setLoading] = useState(true);
  const state = useRef({ view, selected, settings: data.settings }); state.current = { view, selected, settings: data.settings };

  useEffect(() => {
    const scene = new EstateScene(box.current); sceneRef.current = scene;
    setTimeout(() => {
      scene.load({ stands: data.stands, open: data.open }, specs, look); scene.overview(false); setLoading(false); onReady && onReady(scene);
    }, 30);
    let pending = false;
    const off = scene.onRender(() => { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; const { view: v, selected: s, settings } = state.current;
      setLabels(v === "plan" ? [] : scene.labels());
      if (v === "plan" && s && scene.info.get(s)) setDims(scene.info.get(s).edgesInfo.map((d) => { const [x, y] = scene.project(d.pt); return { x, y, L: d.L, lab: edgeLabel(d.e, words(settings)) }; })); else setDims([]);
    }); });
    scene.onUserMove = () => { if (!["free", "plan", "planEstate"].includes(state.current.view)) setView("free"); };
    return () => { off(); scene.dispose(); sceneRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { const sc = sceneRef.current; if (!sc || loading) return; sc.highlight(selected || null); }, [selected, loading, sceneRef]);
  useEffect(() => {
    const sc = sceneRef.current; if (!sc || loading) return;
    if (view === "estate") sc.overview(); else if (view === "free") sc.freeRoam(); else if (view === "planEstate") sc.standView(null, "planEstate");
    else if (selected) sc.standView(selected, view);
  }, [view, selected, loading, sceneRef]);

  // pointer: hover + click
  const down = useRef(null);
  const onPointerDown = (e) => { down.current = [e.clientX, e.clientY]; };
  const onPointerUp = (e) => { const d = down.current; if (!d || Math.hypot(e.clientX - d[0], e.clientY - d[1]) > 5) return; const no = sceneRef.current?.standAt(e.clientX, e.clientY); if (no) onSelect(no); };
  const last = useRef(0);
  const onPointerMove = (e) => { const now = performance.now(); if (now - last.current < 70) return; last.current = now; const sc = sceneRef.current; if (!sc) return; const no = sc.standAt(e.clientX, e.clientY); const r = box.current.getBoundingClientRect(); setTip(no ? { no, x: e.clientX - r.left, y: e.clientY - r.top } : null); };
  // drag and drop of house types
  const dropTarget = useRef(null);
  const onDragOver = (e) => { if (!e.dataTransfer.types.includes("text/house")) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; const no = sceneRef.current?.standAt(e.clientX, e.clientY); if (no !== dropTarget.current) { dropTarget.current = no; sceneRef.current?.highlight(no || state.current.selected || null, no ? "drop" : "select"); } };
  const onDrop = (e) => { e.preventDefault(); const type = e.dataTransfer.getData("text/house"); const no = sceneRef.current?.standAt(e.clientX, e.clientY); dropTarget.current = null; if (no && type) onDropHouse(no, type); else sceneRef.current?.highlight(state.current.selected || null); };
  const onDragLeave = () => { dropTarget.current = null; sceneRef.current?.highlight(state.current.selected || null); };

  const standOf = (no) => data.stands.find((s) => s.no === no);
  const tipStand = tip && standOf(tip.no);
  return (
    <div className="viewer" ref={box} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerMove={onPointerMove} onPointerLeave={() => setTip(null)} onDragOver={onDragOver} onDrop={onDrop} onDragLeave={onDragLeave}>
      {loading && <div className="loading"><div className="spinner" />Building {data.stands.length} {words(data.settings).many} in 3D…</div>}
      <div className="toolbar" role="group" aria-label="Camera views" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
        {VIEWS.map((v) => <button key={v.key} className="vbtn" aria-pressed={view === v.key} disabled={v.stand && !selected} onClick={() => setView(v.key)} title={v.stand && !selected ? `Pick a ${words(data.settings).one} first` : undefined}>{v.label}</button>)}
      </div>
      <div className="labels" aria-hidden="true">
        {labels.map((l) => <span key={l.no} className={`slabel ${l.status}${l.no === selected ? " sel" : ""}`} style={{ left: l.x, top: l.y }}>{l.no}</span>)}
        {dims.map((d, i) => <span key={i} className="dim" style={{ left: d.x, top: d.y }}>{d.L.toFixed(1)} m{d.lab && <><br /><b>{d.lab}</b></>}</span>)}
      </div>
      {tipStand && <div className="tip" style={{ left: tip.x, top: tip.y }}><b>{words(data.settings).One} {tipStand.numbered ? tipStand.no : "(unnumbered)"}</b> · {Math.round(tipStand.size).toLocaleString()} m² · {tipStand.status === "available" ? "For sale" : tipStand.status === "reserved" ? "Reserved" : "Sold"}</div>}
      <div className="hint">{selected ? "Drag to look around · scroll to zoom · right-drag to pan" : `Click a ${words(data.settings).one}, or drag a house type onto one`}</div>
    </div>
  );
}
