// Geometry helpers. Plan coordinates are metres: x to the right, z down the page (as drawn).

export const rnd = (s) => { const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export const hashStr = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };

export function polyArea(P) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
export function centroid(P) { let x = 0, z = 0; P.forEach((p) => { x += p[0]; z += p[1]; }); return [x / P.length, z / P.length]; }
export function inPoly(pt, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if (((a[1] > pt[1]) !== (b[1] > pt[1])) && (pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0])) c = !c; }
  return c;
}
export function segDist(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1]; const L2 = dx * dx + dz * dz || 1;
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
}
export function bbox(P) { let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of P) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < z0) z0 = p[1]; if (p[1] > z1) z1 = p[1]; } return { x0, x1, z0, z1 }; }
export function convexHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = []; for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  const up = []; for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function grow(P, d) { const c = centroid(P); return P.map((p) => { const dx = p[0] - c[0], dz = p[1] - c[1], L = Math.hypot(dx, dz) || 1; return [p[0] + dx / L * d, p[1] + dz / L * d]; }); }

/** Outward unit normal of edge i. */
export function outward(P, i) {
  const a = P[i], b = P[(i + 1) % P.length]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let nx = -(b[1] - a[1]) / L, nz = (b[0] - a[0]) / L; const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (inPoly([m[0] + nx * .3, m[1] + nz * .3], P)) { nx = -nx; nz = -nz; }
  return [nx, nz];
}

/** Local frame for a stand: x along the street frontage, z pointing into the stand. Always a pure rotation. */
export function frame(P, frontIdx) {
  const a = P[frontIdx], b = P[(frontIdx + 1) % P.length];
  let ux = [b[0] - a[0], b[1] - a[1]]; const L = Math.hypot(ux[0], ux[1]) || 1; ux = [ux[0] / L, ux[1] / L];
  let uz = [-ux[1], ux[0]]; let A = a;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (!inPoly([mid[0] + uz[0] * .3, mid[1] + uz[1] * .3], P)) { ux = [-ux[0], -ux[1]]; uz = [-uz[0], -uz[1]]; A = b; }
  const toLocal = (p) => { const d = [p[0] - A[0], p[1] - A[1]]; return [d[0] * ux[0] + d[1] * ux[1], d[0] * uz[0] + d[1] * uz[1]]; };
  const toWorld = (q) => [A[0] + q[0] * ux[0] + q[1] * uz[0], A[1] + q[0] * ux[1] + q[1] * uz[1]];
  const angle = Math.atan2(-ux[1], ux[0]); // rotation about Y that maps local +x onto ux
  return { A, ux, uz, L, angle, toLocal, toWorld, local: P.map(toLocal), frontIdx };
}

/** Largest axis-aligned rectangle (in a local frame) whose cells keep a minimum distance from each boundary. */
export function maxRect(LP, edgeMin, cell = 0.5) {
  const bb = bbox(LP); const nx = Math.max(1, Math.ceil((bb.x1 - bb.x0) / cell)), nz = Math.max(1, Math.ceil((bb.z1 - bb.z0) / cell));
  const ok = new Uint8Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const p = [bb.x0 + (i + .5) * cell, bb.z0 + (j + .5) * cell];
    if (!inPoly(p, LP)) continue;
    let good = true;
    for (let e = 0; e < LP.length && good; e++) if (segDist(p, LP[e], LP[(e + 1) % LP.length]) < edgeMin[e]) good = false;
    ok[j * nx + i] = good ? 1 : 0;
  }
  const hgt = new Int32Array(nx); let best = { area: 0 };
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) hgt[i] = ok[j * nx + i] ? hgt[i] + 1 : 0;
    const st = [];
    for (let i = 0; i <= nx; i++) {
      const h = i < nx ? hgt[i] : 0; let start = i;
      while (st.length && st[st.length - 1][1] >= h) {
        const [si, sh] = st.pop(); const w = i - si;
        // prefer rectangles that are not needle-thin
        const area = w * sh * Math.min(1, Math.min(w, sh) * cell / 7);
        if (sh > 0 && area > best.area) best = { area, i0: si, i1: i, j1: j + 1, j0: j + 1 - sh };
        start = si;
      }
      st.push([start, h]);
    }
  }
  if (!best.area) return null;
  return { x0: bb.x0 + best.i0 * cell, x1: bb.x0 + best.i1 * cell, z0: bb.z0 + best.j0 * cell, z1: bb.z0 + best.j1 * cell, w: (best.i1 - best.i0) * cell, d: (best.j1 - best.j0) * cell };
}

/** Pick the street frontage: longest road edge, otherwise longest edge. */
export function frontEdge(stand) {
  const E = stand.edges || []; let fi = -1, fl = -1;
  E.forEach((e, i) => { if (e.kind === "road" && e.length > fl) { fi = i; fl = e.length; } });
  if (fi < 0) E.forEach((e, i) => { if (e.length > fl) { fi = i; fl = e.length; } });
  return Math.max(0, fi);
}
