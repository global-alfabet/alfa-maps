import HouseIcon from "./HouseIcon.jsx";
import { PRESETS, WALLS, ROOFS, specFromPreset } from "@alfa-maps/engine/presets";

const Seg = ({ label, value, options, onChange }) => (
  <div className="opt"><span className="opt-l">{label}</span>
    <div className="seg" role="radiogroup" aria-label={label}>{options.map(([v, l]) => <button key={String(v)} role="radio" aria-checked={value === v} className={value === v ? "on" : ""} onClick={() => onChange(v)}>{l}</button>)}</div>
  </div>
);
const Toggle = ({ label, checked, onChange, disabled }) => (
  <label className={`tog${disabled ? " dis" : ""}`}><input type="checkbox" checked={!!checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} /><span className="knob" aria-hidden="true" />{label}</label>
);
const Swatches = ({ label, value, colors, onChange }) => (
  <div className="opt"><span className="opt-l">{label}</span><div className="sw">{colors.map((c) => <button key={c} className={c.toLowerCase() === String(value).toLowerCase() ? "on" : ""} style={{ background: c }} onClick={() => onChange(c)} aria-label={`${label} ${c}`} />)}</div></div>
);

/** House type picker + options. Works for both buyers (their own design) and the admin (the stand's default house). */
export default function Designer({ spec, onChange, notes }) {
  const set = (k, v) => onChange({ ...spec, [k]: v });
  return (
    <div className="designer">
      <div className="presets" role="list">
        {PRESETS.map((p) => (
          <button key={p.type} role="listitem" className={`preset${spec.type === p.type ? " on" : ""}`} onClick={() => onChange(specFromPreset(p.type))} draggable onDragStart={(e) => { e.dataTransfer.setData("text/house", p.type); e.dataTransfer.effectAllowed = "copy"; }}>
            <HouseIcon spec={p} width={104} height={62} />
            <span className="pn">{p.name}</span><span className="pt">{p.tagline}</span>
          </button>
        ))}
      </div>
      {!spec.empty && (
        <div className="opts">
          <Seg label="Storeys" value={spec.storeys} options={[[1, "1"], [2, "2"], [3, "3"]]} onChange={(v) => set("storeys", v)} />
          <Seg label="Shape" value={spec.shape} options={[["rect", "Box"], ["L", "L"], ["T", "T"], ["U", "U"]]} onChange={(v) => set("shape", v)} />
          <Seg label="Roof" value={spec.roof} options={[["hip", "Hip"], ["gable", "Gable"], ["flat", "Flat"]]} onChange={(v) => set("roof", v)} />
          <Seg label="Garage" value={spec.garage} options={[[0, "None"], [1, "1 car"], [2, "2 cars"], [3, "3 cars"]]} onChange={(v) => set("garage", v)} />
          <Seg label="Size" value={spec.size} options={[["compact", "Compact"], ["standard", "Standard"], ["large", "Large"]]} onChange={(v) => set("size", v)} />
          <Seg label="Feature wall" value={spec.accent} options={[["stone", "Stone"], ["brick", "Brick"], ["timber", "Timber"], ["none", "Plain"]]} onChange={(v) => set("accent", v)} />
          <div className="togs">
            <Toggle label="Pool" checked={spec.pool} onChange={(v) => set("pool", v)} />
            <Toggle label="Covered patio" checked={spec.pergola} onChange={(v) => set("pergola", v)} />
            <Toggle label="Front veranda" checked={spec.veranda} onChange={(v) => set("veranda", v)} />
            <Toggle label="Balcony" checked={spec.balcony} disabled={spec.storeys < 2} onChange={(v) => set("balcony", v)} />
            <Toggle label="Solar panels" checked={spec.solar} onChange={(v) => set("solar", v)} />
            <Toggle label="Garden cottage" checked={spec.cottage} onChange={(v) => set("cottage", v)} />
          </div>
          <Swatches label="Walls" value={spec.wallColor} colors={WALLS} onChange={(v) => set("wallColor", v)} />
          <Swatches label="Roof colour" value={spec.roofColor} colors={ROOFS} onChange={(v) => set("roofColor", v)} />
        </div>
      )}
      {notes && notes.length > 0 && <div className="notes">{notes.map((n, i) => <p key={i}>{n}</p>)}</div>}
    </div>
  );
}
