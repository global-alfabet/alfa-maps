import { useState } from "react";
import HouseIcon from "./HouseIcon.jsx";
import { PRESETS } from "@alfa-maps/engine/presets";
import { words } from "../lib/words.js";

/** Draggable house types. Drop one on any stand in the 3D view, or click to apply to the selected stand. */
export default function HouseTray({ onPick, hasStand, w = words() }) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`tray${open ? "" : " closed"}`}>
      <div className="tray-head">
        <span><b>House types</b> · drag one onto any {w.one}{hasStand ? `, or click to use it on the selected ${w.one}` : ""}</span>
        <button className="linkbtn" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"}</button>
      </div>
      {open && (
        <div className="tray-cards">
          {PRESETS.map((p) => (
            <button key={p.type} className="tcard" draggable onDragStart={(e) => { e.dataTransfer.setData("text/house", p.type); e.dataTransfer.effectAllowed = "copy"; }} onClick={() => onPick(p.type)} title={p.tagline}>
              <HouseIcon spec={p} width={92} height={54} /><span>{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
