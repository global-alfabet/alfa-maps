import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Viewer from "./components/Viewer.jsx";
import StandList from "./components/StandList.jsx";
import StandPanel from "./components/StandPanel.jsx";
import { standFacts } from "./lib/facts.js";
import AdminPanel from "./components/AdminPanel.jsx";
import HouseTray from "./components/HouseTray.jsx";
import EstateIntro from "./components/EstateIntro.jsx";
import LoginModal from "./components/LoginModal.jsx";
import { api, adminToken, myDesigns } from "./lib/api.js";
import { defaultHouse, fillHouses } from "@alfa-maps/engine/defaults";
import { specFromPreset } from "@alfa-maps/engine/presets";
import { payments } from "./lib/pricing.js";
import { planLabels, standPack } from "./lib/pdf.js";
import { words } from "./lib/words.js";

export default function App() {
  const [data, setData] = useState(null); const [error, setError] = useState(null); const [config, setConfig] = useState({ passwordRequired: false });
  const [mode, setMode] = useState("buyer"); const [selected, setSelected] = useState(null); const [view, setView] = useState("estate");
  const [mine, setMine] = useState(() => myDesigns.load()); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false);
  const [, setTick] = useState(0); const [toast, setToast] = useState(null); const [login, setLogin] = useState(false); const [busy, setBusy] = useState(false); const [sceneKey, setSceneKey] = useState(0);
  const sceneRef = useRef(null);
  const say = (m) => { setToast(m); clearTimeout(say.t); say.t = setTimeout(() => setToast(null), 3200); };

  const prepare = (d) => ({ ...d, houses: fillHouses(d.stands, d.houses || {}) });
  useEffect(() => { Promise.all([api.load(), api.config().catch(() => ({}))]).then(([d, c]) => { setData(prepare(d)); setConfig(c); }).catch((e) => setError(e.message)); }, []);
  const title = data ? `${data.settings.estateName} · 3D ${words(data.settings).many}` : "";
  const accent = data?.settings.brandColor || "#1FA45A";
  useEffect(() => { if (title) document.title = title; document.documentElement.style.setProperty("--accent", accent); }, [title, accent]);

  const specFor = useCallback((no, m = mode) => (m === "buyer" && mine[no]) || data.houses[no], [mode, mine, data]);
  // the scene takes this map once when it is built; later changes go through setSpec
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const specs = useMemo(() => (data ? new Map(data.stands.map((s) => [s.no, specFor(s.no)])) : null), [sceneKey, !!data]);
  const stand = data && selected ? data.stands.find((s) => s.no === selected) : null;
  const info = stand && sceneRef.current ? sceneRef.current.info.get(stand.no) : null;

  const pushSpec = (no, spec) => { sceneRef.current?.setSpec(no, spec); setTick((t) => t + 1); };
  const changeSpec = (no, spec) => {
    if (mode === "buyer") { const m = { ...mine, [no]: spec }; setMine(m); myDesigns.save(m); }
    else { setData((d) => ({ ...d, houses: { ...d.houses, [no]: spec } })); setDirty(true); }
    pushSpec(no, spec);
  };
  const resetSpec = (no) => { const m = { ...mine }; delete m[no]; setMine(m); myDesigns.save(m); pushSpec(no, data.houses[no]); };
  const select = (no) => { setSelected(no); if (["estate", "free", "planEstate"].includes(view)) setView("street"); };
  const onDropHouse = (no, type) => { const cur = specFor(no); const next = specFromPreset(type, type === "empty" ? {} : { wallColor: cur && !cur.empty ? cur.wallColor : undefined }); if (!next.wallColor) delete next.wallColor; changeSpec(no, { ...specFromPreset(type), ...next }); setSelected(no); say(`${words(data.settings).One} ${no}: ${next.name}`); };

  const switchMode = (m) => {
    if (m === mode) return;
    if (m === "admin" && config.passwordRequired && !adminToken.get()) { setLogin(true); return; }
    // swap every stand where the buyer's own design differs from the developer's house
    Object.keys(mine).forEach((no) => sceneRef.current?.setSpec(no, m === "buyer" ? mine[no] : data.houses[no]));
    setMode(m); setTick((t) => t + 1);
  };
  const setStand = (no, k, v) => {
    setData((d) => ({ ...d, stands: d.stands.map((s) => (s.no === no ? { ...s, [k]: v } : s)) })); setDirty(true);
    if (k === "status") { const sc = sceneRef.current; const s = sc?.byNo.get(no); if (s) { s.status = v; sc.setSpec(no, specFor(no)); } }
  };
  const setHouseType = (no, type) => { const next = specFromPreset(type); setData((d) => ({ ...d, houses: { ...d.houses, [no]: next } })); setDirty(true); if (!(mode === "buyer" && mine[no])) pushSpec(no, next); };
  const lookTimer = useRef(null);
  const setSettings = (s) => { setData((d) => { if (JSON.stringify(d.settings.look) !== JSON.stringify(s.look)) { clearTimeout(lookTimer.current); lookTimer.current = setTimeout(() => { sceneRef.current?.setLook(s.look); setTick((t) => t + 1); }, 350); } return { ...d, settings: s }; }); setDirty(true); };
  const bulk = (kind, arg) => {
    setData((d) => {
      let houses = { ...d.houses };
      if (kind === "mix") houses = fillHouses(d.stands, {});
      if (kind === "vacantAvailable") d.stands.forEach((s) => { if (s.status !== "sold") houses[s.no] = specFromPreset("empty"); });
      if (kind === "houseAvailable") d.stands.forEach((s) => { if (s.status !== "sold" && houses[s.no]?.empty) houses[s.no] = defaultHouse(s); });
      if (kind === "typeAvailable") d.stands.forEach((s) => { if (s.status !== "sold") houses[s.no] = specFromPreset(arg); });
      setTimeout(() => { const sc = sceneRef.current; if (!sc) return; d.stands.forEach((s) => sc.specs.set(s.no, houses[s.no])); sc.setLook(d.settings.look); setTick((t) => t + 1); }, 0);
      return { ...d, houses };
    });
    setDirty(true); say("Houses updated. Save to publish.");
  };
  const save = async () => {
    setSaving(true);
    try { await api.save({ settings: data.settings, stands: data.stands, open: data.open, houses: data.houses }); setDirty(false); say("Saved. Visitors now see these changes."); }
    catch (e) { if (e.status === 401) { adminToken.set(""); setLogin(true); } say(e.message); }
    setSaving(false);
  };
  const reload = (d) => { setData(prepare(d)); setSelected(null); setView("estate"); setSceneKey((k) => k + 1); };
  const onReset = async () => { try { const d = await api.reset(); reload(d); setDirty(false); say("Estate reset to the original plan data."); } catch (e) { say(e.message); } };
  const onExport = () => { const blob = new Blob([JSON.stringify({ settings: data.settings, stands: data.stands, open: data.open, houses: data.houses })], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${(data.settings.estateName || "estate").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.json`; a.click(); };
  const onImport = async (file) => { try { const d = JSON.parse(await file.text()); if (!d.stands || !d.settings) throw new Error("That file isn't an estate export."); reload(d); setDirty(true); say("Imported. Save to publish."); } catch (e) { say(e.message); } };

  const download = async () => {
    const sc = sceneRef.current; if (!sc || !stand) return; setBusy(true);
    await new Promise((r) => setTimeout(r, 30));
    try {
      const shots = sc.capture(stand.no, [{ key: "street", title: "Street view" }, { key: "aerial", title: "Aerial view" }, { key: "garden", title: "Garden view" }, { key: "plan", title: "Site plan" }], 1600, 1000, planLabels(words(data.settings)));
      await standPack({ settings: data.settings, stand, spec: specFor(stand.no), pay: payments(stand, data.settings.pricing), shots, facts: standFacts(stand, sc.info.get(stand.no), words(data.settings)) });
    } catch (e) { say("Couldn't make the PDF: " + e.message); }
    setBusy(false);
  };

  if (error) return <div className="fatal"><h1>Couldn't load the estate</h1><p>{error}</p></div>;
  if (!data) return <div className="fatal"><div className="spinner" />Loading estate…</div>;
  const s = data.settings; const w = words(s); const forSale = data.stands.filter((x) => x.status === "available").length;
  return (
    <div className={`app mode-${mode}`}>
      <header className="top">
        <div className="brand"><span className="mark" aria-hidden="true" /><div><div className="eyebrow">{s.developer || ""}</div><h1>{s.estateName}</h1></div></div>
        <div className="top-stats"><span><b>{forSale}</b> {w.many} for sale</span><span><b>{data.stands.length}</b> {w.many} in total</span><span className="loc">{s.location}</span></div>
        <div className="top-r">
          <a className="made" href="https://www.globalalfabet.com/products#alfa-maps" target="_blank" rel="noopener noreferrer" title="Made with Alfa Maps"><img src="/alfa-maps-icon.svg" alt="" width="18" height="18" />Alfa Maps</a>
          {mode === "admin" && <button className="btn primary" disabled={!dirty || saving} onClick={save}>{saving ? "Saving…" : dirty ? "Save changes" : "All changes saved"}</button>}
          <div className="modes" role="radiogroup" aria-label="View mode">
            <button role="radio" aria-checked={mode === "buyer"} className={mode === "buyer" ? "on" : ""} onClick={() => switchMode("buyer")}>Buyer view</button>
            <button role="radio" aria-checked={mode === "admin"} className={mode === "admin" ? "on" : ""} onClick={() => switchMode("admin")}>Admin</button>
          </div>
        </div>
      </header>
      <main className="body">
        {mode === "buyer"
          ? <StandList stands={data.stands} settings={s} selected={selected} onSelect={select} />
          : <AdminPanel data={data} setSettings={setSettings} setStand={setStand} setHouseType={setHouseType} bulk={bulk} selected={selected} onSelect={select} onReset={onReset} onExport={onExport} onImport={onImport} />}
        <section className="stage">
          <Viewer key={sceneKey} data={data} specs={specs} look={s.look} selected={selected} onSelect={select} view={view} setView={setView} onDropHouse={onDropHouse} sceneRef={sceneRef} onReady={() => setTick((t) => t + 1)} />
          <HouseTray w={w} onPick={(type) => stand && onDropHouse(stand.no, type)} hasStand={!!stand} />
        </section>
        {stand
          ? <StandPanel key={stand.no} stand={stand} settings={s} spec={specFor(stand.no)} info={info} mode={mode} onSpec={(sp) => changeSpec(stand.no, sp)} onResetSpec={() => resetSpec(stand.no)} isCustom={!!mine[stand.no]} onStandField={(k, v) => setStand(stand.no, k, v)} onDownload={download} onClose={() => { setSelected(null); setView("estate"); }} busy={busy} />
          : <EstateIntro settings={s} stands={data.stands} mode={mode} />}
      </main>
      {login && <LoginModal onClose={() => setLogin(false)} onOk={() => { setLogin(false); setMode("admin"); Object.keys(mine).forEach((no) => sceneRef.current?.setSpec(no, data.houses[no])); }} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
