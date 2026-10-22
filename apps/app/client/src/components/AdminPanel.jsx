import { useMemo, useState } from "react";
import { PRESETS } from "@alfa-maps/engine/presets";
import { payments, money } from "../lib/pricing.js";
import { words } from "../lib/words.js";

export default function AdminPanel({ demo, data, setSettings, setStand, setHouseType, bulk, selected, onSelect, onReset, onExport, onImport }) {
  const [tab, setTab] = useState("stands");
  const s = data.settings;
  const w = words(s);
  return (
    <nav className="list admin" aria-label="Admin">
      <div className="admin-tabs" role="tablist">
        {[["stands", w.Many], ["estate", "Estate"], ["pricing", "Pricing"], ["houses", "Houses"], ["data", "Data"]].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <div className="admin-body">
        {demo && <p className="demo-note">This is a demo. Try anything: changes stay in this browser and nobody else sees them.</p>}
        {tab === "stands" && <StandsTab w={w} data={data} setStand={setStand} setHouseType={setHouseType} selected={selected} onSelect={onSelect} />}
        {tab === "estate" && <EstateTab s={s} set={setSettings} />}
        {tab === "pricing" && <PricingTab w={w} s={s} set={setSettings} stands={data.stands} />}
        {tab === "houses" && <HousesTab w={w} s={s} set={setSettings} bulk={bulk} />}
        {tab === "data" && <DataTab w={w} onReset={onReset} onExport={onExport} onImport={onImport} />}
      </div>
    </nav>
  );
}

function StandsTab({ w, data, setStand, setHouseType, selected, onSelect }) {
  const [q, setQ] = useState(""); const [f, setF] = useState("available");
  const list = useMemo(() => data.stands.filter((s) => (f === "all" || s.status === f) && (!q || s.no.includes(q))).sort((a, b) => a.no.localeCompare(b.no, undefined, { numeric: true })), [data.stands, q, f]);
  return (
    <div className="stack">
      <div className="row2"><input className="search" placeholder={`${w.One} number`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Find ${w.one}`} />
        <select value={f} onChange={(e) => setF(e.target.value)} aria-label="Filter"><option value="available">For sale</option><option value="reserved">Reserved</option><option value="sold">Sold</option><option value="all">All</option></select></div>
      <div className="atable">
        <table className="tbl"><thead><tr><th>{w.One}</th><th className="r">m²</th><th>Status</th><th>House</th></tr></thead><tbody>
          {list.map((s) => (
            <tr key={s.no} className={selected === s.no ? "sel" : ""}>
              <td><button className="linkbtn strong" onClick={() => onSelect(s.no)}>{s.numbered ? s.no : "–"}</button></td>
              <td className="r">{Math.round(s.size)}</td>
              <td><select value={s.status} onChange={(e) => setStand(s.no, "status", e.target.value)} aria-label={`Status of ${s.no}`}><option value="available">Sale</option><option value="reserved">Held</option><option value="sold">Sold</option></select></td>
              <td><select value={data.houses[s.no]?.type || "msasa"} onChange={(e) => setHouseType(s.no, e.target.value)} aria-label={`House on ${s.no}`}>{PRESETS.map((p) => <option key={p.type} value={p.type}>{p.name}</option>)}</select></td>
            </tr>
          ))}
        </tbody></table>
      </div>
      <p className="note">{list.length} {w.many}. Click a number to open it and fine-tune its house on the right.</p>
    </div>
  );
}

function EstateTab({ s, set }) {
  const c = s.contact || {};
  const upd = (k, v) => set({ ...s, [k]: v }); const updC = (k, v) => set({ ...s, contact: { ...c, [k]: v } });
  return (
    <div className="stack">
      <label className="field">Estate name<input value={s.estateName} onChange={(e) => upd("estateName", e.target.value)} /></label>
      <label className="field">Location<input value={s.location || ""} onChange={(e) => upd("location", e.target.value)} /></label>
      <label className="field">Developer / seller<input value={s.developer || ""} onChange={(e) => upd("developer", e.target.value)} /></label>
      <label className="field">Headline<input value={s.tagline || ""} onChange={(e) => upd("tagline", e.target.value)} /></label>
      <label className="field">About the estate<textarea rows={4} value={s.about || ""} onChange={(e) => upd("about", e.target.value)} /></label>
      <label className="field">Highlights (one per line)<textarea rows={4} value={(s.features || []).join("\n")} onChange={(e) => upd("features", e.target.value.split("\n"))} /></label>
      <h3>Sales contact</h3>
      <label className="field">Name<input value={c.name || ""} onChange={(e) => updC("name", e.target.value)} /></label>
      <div className="grid2"><label className="field">Phone<input value={c.phone || ""} onChange={(e) => updC("phone", e.target.value)} /></label><label className="field">WhatsApp<input value={c.whatsapp || ""} onChange={(e) => updC("whatsapp", e.target.value)} /></label></div>
      <label className="field">Email<input value={c.email || ""} onChange={(e) => updC("email", e.target.value)} /></label>
      <label className="field">Brand colour<input type="color" value={s.brandColor || "#1FA45A"} onChange={(e) => upd("brandColor", e.target.value)} /></label>
    </div>
  );
}

function PricingTab({ w, s, set, stands }) {
  const p = s.pricing; const upd = (k, v) => set({ ...s, pricing: { ...p, [k]: v } });
  const tiers = p.tiers; const setTier = (i, k, v) => upd("tiers", tiers.map((t, j) => j === i ? { ...t, [k]: +v } : t));
  const sample = stands.find((x) => x.status === "available");
  const pay = sample ? payments(sample, p) : null;
  return (
    <div className="stack">
      <h3>Price per m² by {w.one} size</h3>
      {tiers.map((t, i) => (
        <div className="tier" key={i}>
          <label className="field">From m²<input type="number" value={t.min} onChange={(e) => setTier(i, "min", e.target.value)} /></label>
          <label className="field">Cash $/m²<input type="number" step="0.5" value={t.cash} onChange={(e) => setTier(i, "cash", e.target.value)} /></label>
          <label className="field">Financed $/m²<input type="number" step="0.5" value={t.finance} onChange={(e) => setTier(i, "finance", e.target.value)} /></label>
          <button className="icon-btn" aria-label="Remove band" onClick={() => upd("tiers", tiers.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="btn ghost" onClick={() => upd("tiers", [...tiers, { min: (tiers[tiers.length - 1]?.min || 0) + 500, cash: 50, finance: 55 }].sort((a, b) => a.min - b.min))}>Add size band</button>
      <div className="grid2">
        <label className="field">Deposit %<input type="number" value={p.deposit_pct} onChange={(e) => upd("deposit_pct", +e.target.value)} /></label>
        <label className="field">Agreement fee $<input type="number" value={p.agreement_fee} onChange={(e) => upd("agreement_fee", +e.target.value)} /></label>
        <label className="field">Admin fee % of balance<input type="number" step="0.5" value={p.admin_pct} onChange={(e) => upd("admin_pct", +e.target.value)} /></label>
        <label className="field">Interest % a year<input type="number" step="0.5" value={p.interest_pct} onChange={(e) => upd("interest_pct", +e.target.value)} /></label>
      </div>
      <h3>Payment plans</h3>
      {p.terms.map((t, i) => (
        <div className="tier" key={i}>
          <label className="field">Name<input value={t.label} onChange={(e) => upd("terms", p.terms.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} /></label>
          <label className="field">Months<input type="number" value={t.months} onChange={(e) => upd("terms", p.terms.map((x, j) => j === i ? { ...x, months: +e.target.value } : x))} /></label>
          <button className="icon-btn" aria-label="Remove plan" onClick={() => upd("terms", p.terms.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button className="btn ghost" onClick={() => upd("terms", [...p.terms, { months: 24, label: "24 months" }])}>Add payment plan</button>
      {pay && <p className="note">Check: {w.one} {sample.no} ({Math.round(sample.size)} m²) costs {money(pay.cash)} cash{pay.plans[0] ? `, or ${money(pay.plans[0].monthly, 2)} a month over ${pay.plans[0].months} months` : ""}.</p>}
    </div>
  );
}

function HousesTab({ w, s, set, bulk }) {
  const L = s.look || {}; const upd = (k, v) => set({ ...s, look: { ...L, [k]: v } });
  return (
    <div className="stack">
      <h3>Fill the estate</h3>
      <p className="note">Choose what the estate looks like when a visitor first opens it. You can still change any single {w.one} afterwards.</p>
      <button className="btn" onClick={() => bulk("mix")}>Give every {w.one} a varied house</button>
      <button className="btn" onClick={() => bulk("vacantAvailable")}>Show {w.many} for sale as vacant land</button>
      <button className="btn" onClick={() => bulk("houseAvailable")}>Put a house on every {w.one} for sale</button>
      <label className="field">Set every {w.one} for sale to one house type
        <select defaultValue="" onChange={(e) => { if (e.target.value) bulk("typeAvailable", e.target.value); e.target.value = ""; }}><option value="" disabled>Choose a house type…</option>{PRESETS.map((p) => <option key={p.type} value={p.type}>{p.name}</option>)}</select></label>
      <h3>Scenery</h3>
      <label className="slider"><span>Garden trees</span><input type="range" min="0" max="1" step="0.1" value={L.treeDensity ?? .5} onChange={(e) => upd("treeDensity", +e.target.value)} /></label>
      <label className="tog"><input type="checkbox" checked={L.streetTrees !== false} onChange={(e) => upd("streetTrees", e.target.checked)} /><span className="knob" aria-hidden="true" />Street trees</label>
      <label className="tog"><input type="checkbox" checked={L.signs !== false} onChange={(e) => upd("signs", e.target.checked)} /><span className="knob" aria-hidden="true" />"For sale" boards on {w.many}</label>
    </div>
  );
}

function DataTab({ w, onReset, onExport, onImport }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="stack">
      <h3>Back up and restore</h3>
      <p className="note">Export everything ({w.many}, prices, houses, estate details) as one JSON file, or load a file you exported earlier.</p>
      <button className="btn" onClick={onExport}>Export estate data</button>
      <label className="btn">Import estate data<input type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && onImport(e.target.files[0])} /></label>
      <h3>Start again</h3>
      <p className="note">Restore the estate as it was built from the surveyed plan and the {w.one} list. Your changes will be lost.</p>
      <button className="btn danger" onClick={() => { if (armed) { onReset(); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 4000); } }}>{armed ? "Click again to reset" : "Reset to original data"}</button>
    </div>
  );
}
