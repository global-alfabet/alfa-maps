import React, { useMemo, useState } from "react";
import Designer from "./Designer.jsx";
import { payments, money } from "../lib/pricing.js";
import { edgeLabel } from "../lib/pdf.js";
import { describe } from "@alfa-maps/engine/presets";
import { words } from "../lib/words.js";
import { standFacts } from "../lib/facts.js";

const STATUS = { available: ["good", "For sale"], reserved: ["fair", "Reserved"], sold: ["muted", "Sold"] };

export default function StandPanel({ stand, settings, spec, info, mode, onSpec, onResetSpec, isCustom, onStandField, onDownload, onClose, busy }) {
  const pay = useMemo(() => payments(stand, settings.pricing), [stand, settings.pricing]);
  const [tab, setTab] = useState("house");
  const [cls, label] = STATUS[stand.status] || STATUS.sold;
  const w = words(settings);
  const facts = standFacts(stand, info, w);
  const boundaries = (stand.edges || []).filter((e) => e.length >= 3);
  return (
    <aside className="panel" aria-label={`${w.One} ${stand.no}`}>
      <div className="panel-head">
        <div>
          <div className="eyebrow">{stand.seller ? `${stand.seller} · ` : ""}{settings.estateName}</div>
          <h2>{w.One} {stand.numbered ? stand.no : <span className="muted">(unnumbered)</span>}</h2>
        </div>
        <div className="head-r"><span className={`pill ${cls}`}>{label}</span><button className="icon-btn" onClick={onClose} aria-label={`Close ${w.one}`}>✕</button></div>
      </div>

      <dl className="facts">{facts.map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>

      {mode === "admin" && (
        <section className="card-s admin-edit">
          <h3>{w.One} details <span className="note">(admin)</span></h3>
          <div className="grid2">
            <label className="field">Status<select value={stand.status} onChange={(e) => onStandField("status", e.target.value)}><option value="available">For sale</option><option value="reserved">Reserved</option><option value="sold">Sold</option></select></label>
            <label className="field">Size (m²)<input type="number" value={stand.size} onChange={(e) => onStandField("size", +e.target.value || stand.size)} /></label>
            <label className="field">Seller<input value={stand.seller || ""} onChange={(e) => onStandField("seller", e.target.value)} placeholder="e.g. the developer" /></label>
            <label className="field">Cash price override ($)<input type="number" value={stand.price ?? ""} placeholder={String(Math.round(pay.cash))} onChange={(e) => onStandField("price", e.target.value === "" ? null : +e.target.value)} /></label>
          </div>
          <label className="field">Note shown to buyers<input value={stand.note || ""} onChange={(e) => onStandField("note", e.target.value)} placeholder={`e.g. Corner ${w.one} facing the park`} /></label>
        </section>
      )}
      {stand.note && mode !== "admin" && <p className="stand-note">{stand.note}</p>}

      <div className="tabs" role="tablist">
        {[["house", mode === "admin" ? "Default house" : "Design the house"], ["price", "Price & payments"], ["land", "Boundaries"]].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </div>

      {tab === "house" && (
        <section className="sec">
          <p className="summary"><b>{spec.empty ? `Vacant ${w.one}` : spec.name}</b> · {describe(spec)}{info && info.stats && info.stats.floor ? ` About ${info.stats.floor} m² under roof, ${info.stats.coverage}% of the ${w.one}.` : ""}</p>
          {mode === "buyer" && isCustom && <p className="note">You're viewing your own design. <button className="linkbtn" onClick={onResetSpec}>Show the developer's house again</button></p>}
          {mode === "admin" && <p className="note">This is the house every visitor sees on this {w.one}. Buyers can change it for themselves without affecting anyone else.</p>}
          <Designer spec={spec} onChange={onSpec} notes={info && info.notes} />
        </section>
      )}
      {tab === "price" && (
        <section className="sec">
          <div className="price-big"><span>{money(pay.cash)}</span><small>cash · {money(pay.cashRate)}/m² · excl. VAT</small></div>
          <table className="tbl"><thead><tr><th>Option</th><th className="r">Monthly</th><th className="r">Total</th></tr></thead><tbody>
            <tr><td>Cash<br /><small className="muted">incl. {money(pay.fee)} agreement fee</small></td><td className="r">–</td><td className="r">{money(pay.cashTotal)}</td></tr>
            {pay.plans.map((p) => <tr key={p.months}><td>{p.label}<br /><small className="muted">{money(p.upfront)} upfront</small></td><td className="r">{money(p.monthly, 2)}</td><td className="r">{money(p.total)}</td></tr>)}
          </tbody></table>
          <p className="note">Financed price {money(pay.financePrice)} at {money(pay.financeRate)}/m². {settings.pricing.deposit_pct}% deposit, {money(pay.fee)} agreement fee and a {settings.pricing.admin_pct}% admin fee on the balance are paid upfront; the balance is repaid monthly at {settings.pricing.interest_pct}% a year. Prices exclude VAT.</p>
        </section>
      )}
      {tab === "land" && (
        <section className="sec">
          <table className="tbl"><thead><tr><th>Boundary</th><th className="r">Length</th></tr></thead><tbody>
            {boundaries.map((e, i) => <tr key={i}><td>{edgeLabel(e, w)}</td><td className="r">{e.length.toFixed(1)} m</td></tr>)}
          </tbody></table>
          <p className="note">Lengths are traced from the surveyed general plan. Use the Site plan view to see them on the {w.one}.</p>
        </section>
      )}

      <div className="actions">
        <button className="btn primary" onClick={onDownload} disabled={busy}>{busy ? "Preparing PDF…" : `Download ${w.one} pack (PDF)`}</button>
        {settings.contact && (settings.contact.whatsapp || settings.contact.phone) && mode === "buyer" && (
          <a className="btn" href={`https://wa.me/${String(settings.contact.whatsapp || settings.contact.phone).replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in ${w.one} ${stand.no} at ${settings.estateName}.`)}`} target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a>
        )}
      </div>
    </aside>
  );
}
