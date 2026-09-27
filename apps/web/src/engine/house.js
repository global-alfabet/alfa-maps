import { bbox, centroid, frame, frontEdge, inPoly, maxRect, outward, rnd, hashStr, segDist, polyArea } from "./util.js";
import { roofGeometry } from "./builder.js";

const GLASS = 0x22384a, FRAME = 0x2b2b2b, CHAR = 0x32363b, WHITE = 0xf5f3ef, WOOD = 0xffffff, DOOR = 0x3a3d42;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Build everything that belongs to one stand into the builder: lawn, boundary walls and gates,
 * and (unless vacant) a parametric house that fits the stand's buildable area.
 * Returns camera presets and facts for the UI, and garden tree positions for instancing.
 */
export function buildStand(b, stand, spec, ctx) {
  const P = stand.poly, E = stand.edges || [];
  const fi = frontEdge(stand); const F = frame(P, fi); const LP = F.local;
  const roadW = (E[fi] && E[fi].width) || 12;
  const seed = hashStr(stand.no);
  const trees = [];
  const info = { F, fi, notes: [], trees, bounds: bbox(P), roadW };

  b.flat("lawn", P, .02, stand.status === "available" && ctx.tintAvailable ? 0xE9F7DF : 0xffffff);

  // frontage span in local x
  const fa = LP[fi], fb = LP[(fi + 1) % LP.length]; const fx0 = Math.min(fa[0], fb[0]) + .6, fx1 = Math.max(fa[0], fb[0]) - .6;
  let drive = null, pathX = (fx0 + fx1) / 2, doorBlock = null;

  b.frame(F.A[0], F.A[1], F.angle);
  if (!spec || spec.empty) {
    info.stats = { footprint: 0, floor: 0, coverage: 0 };
    info.hc = centroid(LP); info.houseTop = 0;
  } else {
    const r = house(b, stand, spec, LP, E, fi, fx0, fx1, seed, trees, ctx);
    Object.assign(info, r); drive = r.drive; pathX = r.pathX; doorBlock = r.doorBlock;
    for (const t of trees) if (t[4]) { const w = F.toWorld([t[0], t[1]]); t[0] = w[0]; t[1] = w[1]; t[4] = false; }
  }
  if (stand.status !== "sold" && ctx.signs) forSaleSign(b, LP, fi, fx0, fx1, stand.status, drive);
  b.pop();

  // boundary walls (world space); neighbour walls are set 10 cm inside so shared boundaries don't flicker
  P.forEach((a, i) => {
    const c = P[(i + 1) % P.length], e = E[i] || { kind: "neighbour" }; const [nx, nz] = outward(P, i);
    if (e.kind === "road" || e.kind === "open" && ctx.openAsStreet) {
      let gaps = [];
      if (i === fi && spec && !spec.empty) {
        const la = F.toLocal(a)[0], lc = F.toLocal(c)[0]; const tOf = (x) => (x - la) / (lc - la);
        if (drive) gaps.push([tOf(drive[0]), tOf(drive[1])].sort((p, q) => p - q));
        gaps.push([tOf(pathX - .6), tOf(pathX + .6)].sort((p, q) => p - q));
        gaps = gaps.filter((q) => q[0] > .01 && q[1] < .99).sort((p, q) => p[0] - q[0]);
        for (let k = 1; k < gaps.length; k++) if (gaps[k][0] < gaps[k - 1][1] + .02) { gaps[k - 1][1] = Math.max(gaps[k - 1][1], gaps[k][1]); gaps.splice(k, 1); k--; }
      }
      const cuts = [0]; gaps.forEach((q) => cuts.push(q[0], q[1])); cuts.push(1);
      const at = (t) => [a[0] + (c[0] - a[0]) * t - nx * .1, a[1] + (c[1] - a[1]) * t - nz * .1];
      for (let k = 0; k < cuts.length; k += 2) b.wall("plaster", at(cuts[k]), at(cuts[k + 1]), 1.4, .2, 0xEFEBE4);
      cuts.forEach((t) => { const p = at(t); b.box("stone", .5, 1.7, .5, p[0], .85, p[1], 0xffffff, 0, 0, 1.2); b.box("plain", .62, .08, .62, p[0], 1.74, p[1], 0xE8E2D6); });
      const L = Math.hypot(c[0] - a[0], c[1] - a[1]); const ang = -Math.atan2(c[1] - a[1], c[0] - a[0]);
      gaps.forEach((q) => { const n = Math.max(2, Math.round((q[1] - q[0]) * L / .3)); for (let k = 0; k <= n; k++) { const p = at(q[0] + (q[1] - q[0]) * k / n); b.box("metal", .05, 1.45, .05, p[0], .8, p[1], 0x222326, ang); } const p0 = at(q[0]), p1 = at(q[1]); b.wall("metal", p0, p1, .06, .06, 0x222326, 1.45); b.wall("metal", p0, p1, .06, .06, 0x222326, .12); });
    } else {
      b.wall("precast", [a[0] - nx * .1, a[1] - nz * .1], [c[0] - nx * .1, c[1] - nz * .1], 1.8, .12, 0xffffff);
    }
  });

  // street trees on the verge
  if (ctx.streetTrees) {
    const a = P[fi], c = P[(fi + 1) % P.length]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); const [nx, nz] = outward(P, fi);
    const spots = L > 34 ? [2.5, L / 2, L - 2.5] : [2.5]; // at the stand corners, clear of the house front
    for (const t of spots) { const k = t / L; trees.push([a[0] + (c[0] - a[0]) * k + nx * 2.3, a[1] + (c[1] - a[1]) * k + nz * 2.3, .72 + rnd(seed * 50 + t) * .2, 0]); }
  }

  // camera presets (world)
  const W = (x, y, z) => { const w = F.toWorld([x, z]); return [w[0], y, w[1]]; };
  const hc = info.hc, top = info.houseTop || 3; const bbL = bbox(LP);
  const gz = (() => { for (let z = bbL.z1 - 1.2; z > (info.backZ || hc[1]) + 2; z -= .5) if (inPoly([hc[0], z], LP)) return z; return (info.backZ || hc[1]) + 3; })();
  info.cams = {
    street: [W((fx0 + fx1) / 2 + Math.max(7, (fx1 - fx0) * .35), 3.6 + (top > 6 ? 3 : 0), -Math.max(roadW * .8, 7.5)), W(hc[0], Math.min(top * .5, 5), hc[1] - 1)],
    aerial: [W(hc[0] + 24, 24 + top, -24), W(hc[0], 0, hc[1] + 3)],
    garden: (() => { const back = info.backZ ?? hc[1]; const avail = gz - back; const z = back + Math.max(avail, 11); const y = avail >= 11 ? 3 + top * .45 : 7.5 + top * .5;
      return [W(hc[0] + 3, y, z), W(hc[0], Math.min(2.5, top * .4), back - 2)]; })(),
  };
  info.edgesInfo = P.map((a, i) => { const c = P[(i + 1) % P.length]; const L = Math.hypot(c[0] - a[0], c[1] - a[1]); const [nx, nz] = outward(P, i); return { L, e: E[i] || {}, pt: [(a[0] + c[0]) / 2 + nx * 2.6, .3, (a[1] + c[1]) / 2 + nz * 2.6] }; }).filter((d) => d.L >= 3);
  return info;
}

function forSaleSign(b, LP, fi, fx0, fx1, status, drive) {
  let x = fx1 - 1.5; if (drive && x > drive[0] - 1 && x < drive[1] + 1) x = fx0 + 1.5;
  const col = status === "reserved" ? 0xE5A93A : 0x0E6E66;
  b.box("wood", .12, 2.2, .12, x - .8, 1.1, 1.2); b.box("wood", .12, 2.2, .12, x + .8, 1.1, 1.2);
  b.box("plain", 2.0, 1.0, .08, x, 1.8, 1.16, col); b.box("plain", 1.6, .22, .09, x, 1.95, 1.12, 0xffffff); b.box("plain", 1.2, .12, .09, x, 1.62, 1.12, 0xffffff);
}

// ------------------------------------------------------------------------------------------ the house
function house(b, stand, spec, LP, E, fi, fx0, fx1, seed, trees, ctx) {
  const sb = ctx.setbacks || { front: 5, side: 1.5 };
  const em = LP.map((_, i) => (i === fi ? sb.front : E[i] && E[i].kind === "road" ? 3 : sb.side));
  let R = maxRect(LP, em, .5);
  const notes = [];
  if (!R || R.w < 7 || R.d < 7) { R = R && R.w >= 5 && R.d >= 5 ? R : { x0: fx0 + 1, x1: fx0 + 9, z0: 3, z1: 12, w: 8, d: 9 }; notes.push("This stand is tight, so the house shown is indicative only."); }
  const st = clamp(spec.storeys || 1, 1, 3), FH = 3.0, sz = { compact: .8, standard: 1, large: 1.22 }[spec.size] || 1;
  const wallC = spec.wallColor || "#EFEBE3", roofC = spec.roofColor || "#34383D";
  const accentKey = { stone: "stone", brick: "brick", timber: "wood", none: "plaster" }[spec.accent] || "stone"; const accentC = accentKey === "plaster" ? wallC : 0xffffff;

  // ---------------- garage
  let cars = clamp(spec.garage || 0, 0, 3); let gW = cars ? cars * 3.1 + .6 : 0; const gD = 6.4;
  while (cars && gW > R.w - 3) { cars--; gW = cars ? cars * 3.1 + .6 : 0; }
  if (cars < (spec.garage || 0)) notes.push(`A ${cars ? cars + "-car" : ""} garage is the most that fits across this stand.`.replace("A  garage", "No garage"));
  const side = cars && R.w - gW >= 8.5;
  const ov = (x0, x1) => Math.max(0, Math.min(x1, fx1) - Math.max(x0, fx0));
  let garageLeft = true;
  if (cars) garageLeft = ov(R.x0, R.x0 + gW) >= ov(R.x1 - gW, R.x1);

  // ---------------- footprint
  const foot = ({ 1: 150, 2: 108, 3: 88 })[st] * sz;
  const availW = side ? R.w - gW : R.w;
  const zStart = R.z0 + (side || !cars ? .8 : gD);
  const maxD = Math.max(6.5, R.z1 - zStart - Math.min(6, R.d * .25));
  let shape = spec.shape || "rect";
  const blocks = []; let main;
  const mainX = (W) => (side ? (garageLeft ? R.x0 + gW : R.x1 - gW - W) : clamp((fx0 + fx1) / 2 - W / 2, R.x0, R.x1 - W));
  if (shape !== "rect" && maxD < 11) { shape = "rect"; notes.push("The stand is too shallow for that layout, so a simpler shape is shown."); }
  if (shape === "rect") {
    const D = clamp(Math.max(8.5, foot / 13), 7, maxD); const W = clamp(foot / D, 8, Math.min(availW, 22));
    main = { x0: mainX(W), z0: zStart, w: W, d: Math.min(D, foot / W + 1.5) }; blocks.push(main);
  } else {
    const mD = clamp(7.5, 6.5, maxD - 4); const W = clamp(foot * (shape === "U" ? .58 : .68) / mD, 10, Math.min(availW, 22));
    main = { x0: mainX(W), z0: zStart, w: W, d: mD }; blocks.push(main);
    const back = clamp(foot * (shape === "U" ? .42 : .32) / (W * (shape === "U" ? .6 : .4)), 4, maxD - mD);
    if (shape === "L") { const ww = W * .42; const x0 = garageLeft ? main.x0 + W - ww : main.x0; blocks.push({ x0, z0: zStart + mD, w: ww, d: back, wing: true }); }
    if (shape === "T") { const ww = W * .38; blocks.push({ x0: main.x0 + (W - ww) / 2, z0: zStart + mD, w: ww, d: back, wing: true }); }
    if (shape === "U") { const ww = W * .3; blocks.push({ x0: main.x0, z0: zStart + mD, w: ww, d: back, wing: true }); blocks.push({ x0: main.x0 + W - ww, z0: zStart + mD, w: ww, d: back, wing: true }); }
  }
  blocks.forEach((k) => { k.x1 = k.x0 + k.w; k.z1 = k.z0 + k.d; k.h = k.wing ? FH : st * FH; });
  const garage = cars ? (side ? { x0: garageLeft ? R.x0 : R.x1 - gW, z0: R.z0, w: gW, d: gD } : { x0: clamp(Math.max(fx0, R.x0), R.x0, R.x1 - gW), z0: R.z0, w: gW, d: gD }) : null;
  if (garage) { garage.x1 = garage.x0 + garage.w; garage.z1 = garage.z0 + garage.d; }
  const solids = blocks.concat(garage ? [garage] : []);
  const inAny = (x, z, self) => solids.some((k) => k !== self && x > k.x0 - .05 && x < k.x1 + .05 && z > k.z0 - .05 && z < k.z1 + .05);
  const inside = (x, z, m = 1.2) => inPoly([x, z], LP) && LP.every((p, i) => segDist([x, z], p, LP[(i + 1) % LP.length]) >= m);
  const rectInside = (x0, x1, z0, z1, m) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [(x0 + x1) / 2, z1], [(x0 + x1) / 2, z0], [x0, (z0 + z1) / 2], [x1, (z0 + z1) / 2]].every((p) => inside(p[0], p[1], m));
  const clash = (x0, x1, z0, z1, pad = 1) => solids.some((k) => x0 < k.x1 + pad && x1 > k.x0 - pad && z0 < k.z1 + pad && z1 > k.z0 - pad);

  // ---------------- door / slider positions
  const doorX = garage && side ? (garageLeft ? main.x0 + 2.2 : main.x1 - 2.2) : main.x0 + main.w / 2;
  const sliderX = shape === "U" ? main.x0 + main.w / 2 : shape === "L" ? (garageLeft ? main.x0 + main.w * .3 : main.x1 - main.w * .3) : main.x0 + main.w / 2;
  const courtyard = shape === "U" ? { x0: main.x0 + main.w * .3, x1: main.x1 - main.w * .3, z0: main.z1, z1: main.z1 + blocks[1].d } : null;

  // ---------------- bodies, roofs, windows
  const top = (k) => (k === main && st === 3 && spec.roof === "flat" ? 2 * FH : k.h);
  blocks.forEach((k) => {
    const h = top(k);
    b.box("plaster", k.w, h, k.d, k.x0 + k.w / 2, h / 2, k.z0 + k.d / 2, wallC, 0, 0, 2);
    b.box("plain", k.w + .08, .35, k.d + .08, k.x0 + k.w / 2, .175, k.z0 + k.d / 2, 0x6d6a66);
    roof(b, k.x0, k.x1, k.z0, k.z1, h, spec.roof, roofC, wallC, spec.roof === "gable" ? 32 : 25);
    const floors = []; for (let f = 0; f < h / FH - .01; f++) floors.push(f * FH);
    [["n", k.z0, k.x0, k.x1], ["s", k.z1, k.x0, k.x1], ["w", k.x0, k.z0, k.z1], ["e", k.x1, k.z0, k.z1]].forEach(([face, plane, u0, u1]) => {
      const L = u1 - u0; const n = Math.floor((L - .8) / 3.2); if (n < 1) return;
      for (let i = 0; i < n; i++) {
        const u = u0 + (L / n) * (i + .5);
        const probe = face === "n" || face === "s" ? [u, plane + (face === "n" ? -.3 : .3)] : [plane + (face === "w" ? -.3 : .3), u];
        floors.forEach((fl) => {
          if (fl === 0 && inAny(probe[0], probe[1], k)) return;
          if (fl > 0 && k.wing) return;
          if (k === main && face === "n" && fl === 0 && Math.abs(u - doorX) < 1.7) return;
          if (k === main && face === "s" && fl === 0 && Math.abs(u - sliderX) < 2.4) return;
          if (k === main && face === "n" && fl === FH && spec.balcony && Math.abs(u - (main.x0 + main.w / 2)) < 2.6) return;
          win(b, face, plane, u, fl + .9, 1.6, 1.4);
        });
      }
    });
  });
  if (st === 3 && spec.roof === "flat") { // penthouse floor with roof terrace
    const px0 = main.x0 + 1.2, px1 = main.x1 - 1.2, pz0 = main.z0 + 2.2, pz1 = main.z1;
    b.box("plaster", px1 - px0, FH, pz1 - pz0, (px0 + px1) / 2, 2 * FH + FH / 2, (pz0 + pz1) / 2, wallC, 0, 0, 2);
    roof(b, px0, px1, pz0, pz1, 3 * FH, "flat", roofC, wallC);
    b.box("glass", px1 - px0 - 1, 2.3, .1, (px0 + px1) / 2, 2 * FH + 1.3, pz0 - .03, GLASS);
    b.box("glass", main.w, .95, .06, main.x0 + main.w / 2, 2 * FH + .55 + .45, main.z0 + .05, 0x9fc4d6);
    b.box("wood", 3, .08, 1.6, main.x0 + main.w / 2, 2 * FH + .56, main.z0 + 1.1, 0xffffff);
  }
  // accent cladding strip beside the door
  const ax = doorX > main.x0 + main.w / 2 ? main.x0 + .7 : main.x1 - .7;
  b.box(accentKey, 1.4, top(main), .22, ax, top(main) / 2, main.z0 - .1, accentC, 0, 0, 1.4);
  // front door + porch
  win(b, "n", main.z0, doorX, .15, 1.2, 2.4, true); b.box("wood", 1.2, 2.4, .1, doorX, 1.35, main.z0 - .07, 0xffffff);
  b.box("plain", 3.4, .18, 2, doorX, 2.8, main.z0 - 1, CHAR); b.box("plain", .18, 2.75, .18, doorX + 1.5, 1.37, main.z0 - 1.8, CHAR);
  b.flat("pav", [[doorX - 1.7, main.z0 - 2], [doorX + 1.7, main.z0 - 2], [doorX + 1.7, main.z0], [doorX - 1.7, main.z0]], .06);
  // back slider
  win(b, "s", main.z1, sliderX, .15, 3.8, 2.3, true);
  // balcony
  if (spec.balcony && st >= 2) { const bw = Math.min(5.5, main.w - 2), bx = main.x0 + main.w / 2; b.box("plain", bw, .22, 1.5, bx, FH + .02, main.z0 - .75, CHAR); b.box("glass", bw, .95, .06, bx, FH + .6, main.z0 - 1.47, 0x9fc4d6); win(b, "n", main.z0, bx, FH + .15, 3.2, 2.3, true); }
  // veranda across the front
  if (spec.veranda) { const vx0 = main.x0 + .2, vx1 = main.x1 - .2, z = main.z0 - 2.4; for (let x = vx0 + .2; x <= vx1; x += Math.max(2.4, (vx1 - vx0) / 5)) b.box("wood", .18, 2.6, .18, x, 1.3, z + .2, 0xffffff); b.box("wood", .18, 2.6, .18, vx1 - .2, 1.3, z + .2, 0xffffff);
    b.box("roof", vx1 - vx0 + .6, .12, 2.9, (vx0 + vx1) / 2, 2.85, main.z0 - 1.25, roofC, 0, -.12); b.flat("wood", [[vx0, z], [vx1, z], [vx1, main.z0], [vx0, main.z0]], .12, 0xd9b48a, 1.5); }
  // solar panels
  if (spec.solar) { const rw = Math.min(6.6, main.w - 3), n = Math.floor(rw / 1.1); const flatTop = spec.roof === "flat"; const zc = main.z1 - main.d * .28; const t = Math.tan(25 * Math.PI / 180);
    const yTop = st === 3 && flatTop ? 3 * FH : top(main); const y = flatTop ? yTop + .75 : yTop + ((main.z1 + .6) - zc) * t + .14;
    for (let i = 0; i < n; i++) b.box("glass", 1.0, .05, 1.7, main.x0 + 1.5 + i * 1.1 + .5, y, zc, 0x1c2a44, 0, flatTop ? -.3 : -25 * Math.PI / 180); }

  // ---------------- garage
  let drive = null;
  if (garage) {
    const gh = 3.2; b.box(accentKey, garage.w, gh, garage.d, garage.x0 + garage.w / 2, gh / 2, garage.z0 + garage.d / 2, accentC, 0, 0, 1.6);
    if (spec.roof === "flat" || spec.roof === "hip" && st > 1) b.box("plain", garage.w + .3, .3, garage.d + .3, garage.x0 + garage.w / 2, gh + .15, garage.z0 + garage.d / 2, CHAR);
    else roof(b, garage.x0, garage.x1, garage.z0, garage.z1, gh, spec.roof, roofC, wallC, 25, .4);
    const nd = cars, dw = (garage.w - .4 * (nd + 1)) / nd;
    for (let i = 0; i < nd; i++) { const x = garage.x0 + .4 + dw / 2 + i * (dw + .4); b.box("metal", dw, 2.3, .06, x, 1.15, garage.z0 - .03, DOOR); for (let s = 1; s < 4; s++) b.box("plain", dw, .03, .08, x, s * .58, garage.z0 - .05, 0x2a2c30); }
    const x0 = Math.max(garage.x0, fx0), x1 = Math.min(garage.x1, fx1);
    if (x1 - x0 > 2.6) { drive = [x0, x1]; b.flat("pav", [[x0, -.05], [x1, -.05], [x1, garage.z0], [x0, garage.z0]], .04);
      const cols = [0xb8bcc2, 0x2c4a6e, 0x7a1f1f, 0x1f2d24, 0xe8e6e1]; const nc = Math.min(cars, 2);
      for (let i = 0; i < nc; i++) if (rnd(seed * 77 + i) < .8) car(b, x0 + 1.55 + i * 3.1, Math.max(2.5, garage.z0 - 2.7), cols[Math.floor(rnd(seed * 91 + i) * cols.length)]); }
  }
  const pathX = clamp(doorX, fx0 + .8, fx1 - .8);
  b.flat("pav", [[pathX - .6, -.05], [pathX + .6, -.05], [doorX + .6, main.z0 - 2], [doorX - .6, main.z0 - 2]], .045);

  // ---------------- outdoors
  let patio = null;
  if (spec.pergola) {
    const pz0 = main.z1, px0 = courtyard ? courtyard.x0 + .2 : Math.max(main.x0 + .4, sliderX - 4), px1 = courtyard ? courtyard.x1 - .2 : Math.min(main.x1 - .4, sliderX + 4);
    if (px1 - px0 > 3 && (courtyard || rectInside(px0, px1, pz0, pz0 + 3.2, .8))) {
      patio = { x0: px0, x1: px1, z0: pz0, z1: pz0 + 3.2 };
      b.flat("pav", [[px0, pz0], [px1, pz0], [px1, pz0 + 3.2], [px0, pz0 + 3.2]], .05);
      b.box("wood", .16, 2.7, .16, px0 + .1, 1.35, pz0 + 3.1, 0xffffff); b.box("wood", .16, 2.7, .16, px1 - .1, 1.35, pz0 + 3.1, 0xffffff);
      const n = Math.round((px1 - px0) / .8); for (let i = 0; i <= n; i++) b.box("wood", .08, .18, 3.3, px0 + i * (px1 - px0) / n, 2.75, pz0 + 1.6, 0xffffff);
      b.box("wood", px1 - px0, .2, .12, (px0 + px1) / 2, 2.6, pz0 + 3.1, 0xffffff);
      b.box("wood", 2, .06, 1, sliderX, .75, pz0 + 1.6, 0xffffff); for (const [dx, dz] of [[-.9, -.4], [.9, -.4], [-.9, .4], [.9, .4]]) b.box("metal", .06, .72, .06, sliderX + dx, .37, pz0 + 1.6 + dz, 0x222326);
    }
  }
  let pool = null;
  if (spec.pool) {
    const sizes = [[7, 3.2], [3.2, 7], [5.5, 2.8], [2.8, 5.5], [4, 2.4]];
    if (courtyard) { const pw = Math.min(6, courtyard.x1 - courtyard.x0 - 2), pd = Math.min(3, courtyard.z1 - courtyard.z0 - (patio ? 4.5 : 1.5)); if (pw > 2.5 && pd > 1.8) pool = { x0: (courtyard.x0 + courtyard.x1) / 2 - pw / 2, z0: courtyard.z1 - pd - .8, w: pw, d: pd }; }
    const zS = (patio ? patio.z1 : Math.max(...blocks.map((k) => k.z1))) + 1.2;
    const tryAt = (z0, z1) => { for (const [pw, pd] of sizes) for (let z = z0; z < z1; z += .5) for (let x = R.x0 - 6; x < R.x1 + 6; x += .5) if (rectInside(x - 1, x + pw + 1, z - 1, z + pd + 1, .6) && !clash(x, x + pw, z, z + pd) && !(patio && x < patio.x1 + .5 && x + pw > patio.x0 - .5 && z < patio.z1 + .5 && z + pd > patio.z0 - .5)) return { x0: x, z0: z, w: pw, d: pd }; return null; };
    if (!pool) pool = tryAt(zS, R.z1 + 15) || tryAt(R.z0, R.z1 + 15);
    if (pool) { const q = pool; q.x1 = q.x0 + q.w; q.z1 = q.z0 + q.d;
      b.flat("pav", [[q.x0 - 1, q.z0 - 1], [q.x1 + 1, q.z0 - 1], [q.x1 + 1, q.z1 + 1], [q.x0 - 1, q.z1 + 1]], .05);
      b.box("plain", q.w + .4, .08, .25, q.x0 + q.w / 2, .09, q.z0 - .12, 0xe8e2d6); b.box("plain", q.w + .4, .08, .25, q.x0 + q.w / 2, .09, q.z1 + .12, 0xe8e2d6);
      b.box("plain", .25, .08, q.d, q.x0 - .12, .09, q.z0 + q.d / 2, 0xe8e2d6); b.box("plain", .25, .08, q.d, q.x1 + .12, .09, q.z0 + q.d / 2, 0xe8e2d6);
      b.flat("water", [[q.x0, q.z0], [q.x1, q.z0], [q.x1, q.z1], [q.x0, q.z1]], .075, 0xffffff, 3);
      if (!courtyard) { const lx = q.w > q.d ? q.x0 + 1 : q.x1 + 1.4; const lz = q.w > q.d ? q.z1 + 1.3 : q.z0 + 1; if (inside(lx + 1, lz, .6)) { b.box("plain", 1.9, .3, .7, lx + .9, .25, lz, WHITE); } }
    } else notes.push("A pool doesn't fit comfortably with this layout. Try a smaller size or a different shape.");
  }
  if (spec.cottage) {
    let placed = null; const zS = Math.max(...blocks.map((k) => k.z1)) + 3;
    for (let z = zS; z < R.z1 + 15 && !placed; z += .5) for (let x = R.x1 - 5; x > R.x0 - 8 && !placed; x -= .5)
      if (rectInside(x, x + 5, z, z + 6, 1.2) && !clash(x, x + 5, z, z + 6) && !(pool && x < pool.x1 + 1 && x + 5 > pool.x0 - 1 && z < pool.z1 + 1 && z + 6 > pool.z0 - 1)) placed = { x0: x, z0: z };
    if (placed) { const { x0, z0 } = placed; b.box("plaster", 5, 2.8, 6, x0 + 2.5, 1.4, z0 + 3, wallC, 0, 0, 2); roof(b, x0, x0 + 5, z0, z0 + 6, 2.8, spec.roof === "flat" ? "flat" : "hip", roofC, wallC, 25, .4); win(b, "n", z0, x0 + 2.5, .15, 1, 2.2, true); win(b, "e", x0 + 5, z0 + 3, .9, 1.4, 1.2); solids.push({ x0, x1: x0 + 5, z0, z1: z0 + 6 }); }
    else notes.push("There's no room left for a garden cottage behind this house.");
  }
  // shrubs along the front, garden trees near the boundaries
  for (let i = 0; i < 5; i++) b.blob("leaf", .34, main.x0 + .8 + i * ((main.w - 1.6) / 4), .26, main.z0 - .7, [0xd06a8a, 0x3f6f2c, 0xe0b030, 0x4f7d33, 0xc9567a][(i + Math.floor(seed * 10)) % 5]);
  const bbL = bbox(LP); let placedTrees = 0;
  for (let k = 0; k < 300 && placedTrees < (ctx.gardenTrees ?? 3); k++) {
    const x = bbL.x0 + rnd(seed * 997 + k * 7) * (bbL.x1 - bbL.x0), z = bbL.z0 + rnd(seed * 991 + k * 11) * (bbL.z1 - bbL.z0);
    if (!inside(x, z, 1.8) || inside(x, z, 4.2)) continue;
    if (clash(x, x, z, z, 2.4)) continue; if (pool && x > pool.x0 - 2.5 && x < pool.x1 + 2.5 && z > pool.z0 - 2.5 && z < pool.z1 + 2.5) continue;
    if (patio && x > patio.x0 - 2 && x < patio.x1 + 2 && z > patio.z0 - 2 && z < patio.z1 + 3) continue; if (z < 8) continue;
    if (z > main.z0 + main.d * .5 && Math.abs(x - (main.x0 + main.w / 2)) < 6.5) continue; // keep the view of the back of the house clear
    trees.push([x, z, .7 + rnd(seed * 13 + k) * .4, rnd(seed * 17 + k) < .25 ? 1 : 0, true]); placedTrees++;
  }
  const footprint = solids.reduce((s, k) => s + (k.x1 - k.x0) * (k.z1 - k.z0), 0);
  const floor = footprint + main.w * main.d * (st - 1) - (st === 3 && spec.roof === "flat" ? (main.w * main.d - (main.w - 2.4) * (main.d - 2.2)) : 0);
  return {
    R, drive, pathX, doorBlock: main, notes, hc: [main.x0 + main.w / 2, main.z0 + main.d / 2], houseTop: st * FH, backZ: Math.max(...blocks.map((k) => k.z1)), frontZ: main.z0,
    stats: { footprint: Math.round(footprint), floor: Math.round(floor), coverage: Math.round(footprint / Math.abs(polyArea(LP)) * 100), cars, pool: !!pool },
    treesLocal: true,
  };
}

function roof(b, x0, x1, z0, z1, eave, type, roofC, wallC, pitch = 25, oh = .6) {
  if (type === "flat") {
    b.box("plaster", x1 - x0 + .3, .55, z1 - z0 + .3, (x0 + x1) / 2, eave + .27, (z0 + z1) / 2, wallC, 0, 0, 2);
    b.box("plain", x1 - x0 + .42, .08, z1 - z0 + .42, (x0 + x1) / 2, eave + .58, (z0 + z1) / 2, CHAR); return;
  }
  const X0 = x0 - oh, X1 = x1 + oh, Z0 = z0 - oh, Z1 = z1 + oh;
  const g = roofGeometry(X0, X1, Z0, Z1, eave, pitch, type); b.raw("roof", g.roof, roofC);
  if (g.ends) { const e = roofGeometry(x0, x1, z0, z1, eave, pitch, type).ends; b.raw("plaster", e, wallC); }
  const f = .22, fc = 0x2f3237;
  b.box("plain", X1 - X0, f, .05, (X0 + X1) / 2, eave - f / 2 + .02, Z0, fc); b.box("plain", X1 - X0, f, .05, (X0 + X1) / 2, eave - f / 2 + .02, Z1, fc);
  b.box("plain", .05, f, Z1 - Z0, X0, eave - f / 2 + .02, (Z0 + Z1) / 2, fc); b.box("plain", .05, f, Z1 - Z0, X1, eave - f / 2 + .02, (Z0 + Z1) / 2, fc);
  b.box("plain", X1 - X0, .03, Z1 - Z0, (X0 + X1) / 2, eave - .2, (Z0 + Z1) / 2, 0xe9e5de);
}

function win(b, face, plane, c, sill, w, h, door) {
  const ry = { n: 0, s: Math.PI, e: -Math.PI / 2, w: Math.PI / 2 }[face];
  const o = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }[face];
  const base = face === "n" || face === "s" ? [c, plane] : [plane, c];
  const at = (d) => [base[0] + o[0] * d, base[1] + o[1] * d];
  const g = at(.03), f = at(.01);
  b.box("plain", w + .16, h + .16, .1, f[0], sill + h / 2, f[1], FRAME, ry);
  b.box("glass", w, h, .1, g[0], sill + h / 2, g[1], GLASS, ry);
  if (!door) { const s = at(.12); b.box("plain", w + .3, .06, .26, s[0], sill - .08, s[1], WHITE, ry); if (w > 1.3) { const m = at(.05); b.box("plain", .05, h, .06, m[0], sill + h / 2, m[1], FRAME, ry); } }
}

function car(b, x, z, col) {
  b.box("metal", 1.8, .7, 4.4, x, .6, z, col); b.box("metal", 1.6, .55, 2.3, x, 1.2, z + .2, col); b.box("glass", 1.62, .45, 2, x, 1.22, z + .2, GLASS);
  for (const [wx, wz] of [[-.85, -1.4], [.85, -1.4], [-.85, 1.4], [.85, 1.4]]) b.cyl("plain", .33, .25, x + wx, .33, z + wz, 0x151515, Math.PI / 2);
}
