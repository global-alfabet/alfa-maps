import { useMemo, useState } from "react";
import { payments, money } from "../lib/pricing.js";
import { words } from "../lib/words.js";

export default function StandList({ stands, settings, selected, onSelect }) {
  const w = words(settings);
  const [q, setQ] = useState(""); const [status, setStatus] = useState("available"); const [min, setMin] = useState(""); const [max, setMax] = useState(""); const [sort, setSort] = useState("no");
  const list = useMemo(() => {
    let l = stands.filter((s) => s.numbered && (status === "all" || s.status === status) && (!q || s.no.includes(q.trim())) && (!min || s.size >= +min) && (!max || s.size <= +max));
    l = l.map((s) => ({ s, cash: payments(s, settings.pricing).cash }));
    l.sort((a, b) => sort === "size" ? a.s.size - b.s.size : sort === "price" ? a.cash - b.cash : a.s.no.localeCompare(b.s.no, undefined, { numeric: true }));
    return l;
  }, [stands, settings.pricing, q, status, min, max, sort]);
  const counts = useMemo(() => ({ available: stands.filter((s) => s.status === "available").length, reserved: stands.filter((s) => s.status === "reserved").length, sold: stands.filter((s) => s.status === "sold").length }), [stands]);
  return (
    <nav className="list" aria-label={w.Many}>
      <div className="filters">
        <input className="search" placeholder={`Find a ${w.one} number`} value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Find a ${w.one} number`} />
        <div className="chips" role="radiogroup" aria-label="Status">
          {[["available", `For sale ${counts.available}`], ["reserved", `Reserved ${counts.reserved}`], ["sold", `Sold ${counts.sold}`], ["all", "All"]].map(([k, l]) => <button key={k} role="radio" aria-checked={status === k} className={status === k ? "on" : ""} onClick={() => setStatus(k)}>{l}</button>)}
        </div>
        <div className="row2">
          <label className="field">Min m²<input type="number" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} /></label>
          <label className="field">Max m²<input type="number" inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} /></label>
          <label className="field">Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="no">Number</option><option value="size">Size</option><option value="price">Price</option></select></label>
        </div>
      </div>
      <div className="items">
        {list.map(({ s, cash }) => (
          <button key={s.no} className="item" aria-current={selected === s.no} onClick={() => onSelect(s.no)}>
            <span className={`dot ${s.status}`} aria-hidden="true" /><span className="no">{s.no}</span>
            <span className="sz">{Math.round(s.size).toLocaleString()} m²</span>
            <span className="pr">{s.status === "sold" ? "Sold" : money(cash)}</span>
          </button>
        ))}
        {!list.length && <p className="note pad">No {w.many} match these filters.</p>}
      </div>
    </nav>
  );
}
