import { PRESETS, WALLS, ROOFS, specFromPreset } from "./presets.js";
import { hashStr } from "./util.js";

const MIX = [["kopje", .12], ["msasa", .24], ["jacaranda", .12], ["mukwa", .1], ["mopane", .07], ["baobab", .2], ["marula", .1], ["mahogany", .05]];

/** A believable, repeatable mix of houses for the whole estate (the developer can change any of them). */
export function defaultHouse(stand, opts = {}) {
  const r = (k) => hashStr(stand.no + ":" + k);
  if (opts.vacantAvailable && stand.status !== "sold") return specFromPreset("empty");
  let type;
  if (stand.size < 320) type = r("t") < .6 ? "kopje" : "baobab";
  else { let x = r("t"), acc = 0; type = MIX[MIX.length - 1][0]; for (const [t, w] of MIX) { acc += w; if (x < acc) { type = t; break; } } }
  const base = PRESETS.find((p) => p.type === type);
  const spec = specFromPreset(type, {
    wallColor: r("w") < .5 ? base.wallColor : WALLS[Math.floor(r("wc") * WALLS.length)],
    roofColor: base.roof === "flat" ? base.roofColor : (r("r") < .5 ? base.roofColor : ROOFS[Math.floor(r("rc") * ROOFS.length)]),
    pool: base.pool ? r("p") < .8 : r("p") < .15,
    size: stand.size < 320 ? "compact" : stand.size > 900 ? "large" : base.size,
    garage: stand.size < 320 ? Math.min(1, base.garage) : base.garage,
  });
  return spec;
}

export function fillHouses(stands, houses = {}, opts = {}) {
  const out = { ...houses };
  stands.forEach((s) => { if (!out[s.no]) out[s.no] = defaultHouse(s, opts); });
  return out;
}
