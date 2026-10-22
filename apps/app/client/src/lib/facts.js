import { words } from "./words.js";

/** The key facts about a plot, shown in its panel and in the PDF pack. */
export function standFacts(stand, info, w = words()) {
  const E = stand.edges || []; const roads = E.filter((e) => e.kind === "road" && e.length > 4);
  const front = info ? (E[info.fi] || {}) : roads.sort((a, b) => b.length - a.length)[0] || {};
  const out = [[`${w.One} size`, `${Math.round(stand.size).toLocaleString()} m²`]];
  if (front.length) out.push(["Street frontage", `${front.length.toFixed(1)} m`]);
  if (front.width) out.push(["Road width", `${front.width} m`]);
  out.push(["Position", roads.length >= 2 ? `Corner ${w.one}` : `Mid-block ${w.one}`]);
  if (info && info.stats && info.stats.floor) out.push(["House shown", `≈${info.stats.floor} m² under roof`]);
  return out;
}
