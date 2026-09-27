// House types buyers can drop onto a stand. Named after trees found around Harare.
export const WALLS = ["#EFEBE3", "#F2EFE9", "#E7DCCB", "#E2D3B5", "#D9CDB8", "#DCD6CC", "#C9C3B8", "#B9BCBF", "#EFE3C8"];
export const ROOFS = ["#34383D", "#2E3136", "#55595E", "#6E4A3D", "#8A5140", "#9E3B2E", "#7B4B3A", "#4D5157"];

export const PRESETS = [
  { type: "kopje", name: "Kopje", tagline: "Compact starter home", storeys: 1, shape: "rect", roof: "hip", garage: 1, pool: false, pergola: false, veranda: false, balcony: false, solar: false, cottage: false, accent: "none", size: "compact", wallColor: "#E7DCCB", roofColor: "#8A5140", beds: 2 },
  { type: "msasa", name: "Msasa", tagline: "L-shaped family home", storeys: 1, shape: "L", roof: "hip", garage: 2, pool: false, pergola: true, veranda: false, balcony: false, solar: false, cottage: false, accent: "stone", size: "standard", wallColor: "#EFEBE3", roofColor: "#34383D", beds: 3 },
  { type: "jacaranda", name: "Jacaranda", tagline: "Modern flat-roof single storey", storeys: 1, shape: "rect", roof: "flat", garage: 2, pool: true, pergola: true, veranda: false, balcony: false, solar: true, cottage: false, accent: "timber", size: "standard", wallColor: "#F2EFE9", roofColor: "#2E3136", beds: 3 },
  { type: "mukwa", name: "Mukwa", tagline: "Farmhouse with a front veranda", storeys: 1, shape: "T", roof: "gable", garage: 2, pool: false, pergola: false, veranda: true, balcony: false, solar: false, cottage: true, accent: "brick", size: "standard", wallColor: "#EFE3C8", roofColor: "#9E3B2E", beds: 3 },
  { type: "mopane", name: "Mopane", tagline: "U-shaped courtyard home", storeys: 1, shape: "U", roof: "hip", garage: 2, pool: true, pergola: true, veranda: false, balcony: false, solar: false, cottage: false, accent: "stone", size: "large", wallColor: "#E2D3B5", roofColor: "#6E4A3D", beds: 4 },
  { type: "baobab", name: "Baobab", tagline: "Classic double storey", storeys: 2, shape: "rect", roof: "hip", garage: 2, pool: false, pergola: true, veranda: false, balcony: true, solar: false, cottage: false, accent: "stone", size: "standard", wallColor: "#EFEBE3", roofColor: "#55595E", beds: 4 },
  { type: "marula", name: "Marula", tagline: "Contemporary double storey", storeys: 2, shape: "L", roof: "flat", garage: 3, pool: true, pergola: true, veranda: false, balcony: true, solar: true, cottage: false, accent: "timber", size: "large", wallColor: "#F2EFE9", roofColor: "#2E3136", beds: 4 },
  { type: "mahogany", name: "Mahogany", tagline: "Three-storey with roof terrace", storeys: 3, shape: "rect", roof: "flat", garage: 3, pool: true, pergola: false, veranda: false, balcony: true, solar: true, cottage: false, accent: "stone", size: "standard", wallColor: "#DCD6CC", roofColor: "#2E3136", beds: 5 },
  { type: "empty", name: "Vacant stand", tagline: "Show the land only", empty: true },
];

export const presetByType = (t) => PRESETS.find((p) => p.type === t) || PRESETS[1];

/** Options the buyer can change on any house. */
export const OPTION_KEYS = ["storeys", "shape", "roof", "garage", "pool", "pergola", "veranda", "balcony", "solar", "cottage", "accent", "size", "wallColor", "roofColor"];

export function specFromPreset(type, overrides = {}) {
  const p = presetByType(type);
  return { ...p, ...overrides, type: p.type, name: p.name };
}

export function describe(spec) {
  if (spec.empty) return "Vacant stand.";
  const parts = [`${["", "Single", "Double", "Three"][spec.storeys]}-storey ${({ rect: "", L: "L-shaped ", U: "U-shaped ", T: "T-shaped " })[spec.shape]}home`];
  parts.push(spec.garage ? `${spec.garage}-car garage` : "no garage");
  parts.push(`${spec.roof} roof`);
  ["pool", "pergola", "veranda", "balcony", "solar", "cottage"].forEach((k) => { if (spec[k]) parts.push({ pool: "pool", pergola: "covered patio", veranda: "front veranda", balcony: "balcony", solar: "solar panels", cottage: "garden cottage" }[k]); });
  return parts.join(", ") + ".";
}
