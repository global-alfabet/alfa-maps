import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { materials } from "./materials.js";

const _box = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
const _cyl = new THREE.CylinderGeometry(1, 1, 1, 14).toNonIndexed();
const _ico = new THREE.IcosahedronGeometry(1, 1);
const _white = new THREE.Color(1, 1, 1);

/**
 * Collects geometry into material buckets, transformed into world space, then merges each bucket
 * into a single mesh. Keeps draw calls low when hundreds of houses are on screen.
 */
export class Builder {
  constructor() { this.buckets = {}; this.m = new THREE.Matrix4(); this.stack = []; }
  push(mat4) { this.stack.push(this.m.clone()); this.m.multiply(mat4); }
  pop() { this.m = this.stack.pop(); }
  /** set a local frame: translation (x,z) + rotation about Y */
  frame(x, z, angle) { const f = new THREE.Matrix4().makeRotationY(angle); f.setPosition(x, 0, z); this.push(f); }
  add(key, geom, local, color) {
    const g = geom.clone();
    const mat = local ? this.m.clone().multiply(local) : this.m;
    g.applyMatrix4(mat);
    const n = g.attributes.position.count;
    if (!g.attributes.uv) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n * 2), 2));
    const col = color !== undefined ? new THREE.Color(color) : _white; const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    if (!g.attributes.normal) g.computeVertexNormals();
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv", "color"].includes(k)) g.deleteAttribute(k);
    (this.buckets[key] ||= []).push(g);
  }
  /** axis-aligned box in the current frame, centred at (x, y, z); uv scaled so textures tile in metres */
  box(key, w, h, d, x, y, z, color, ry = 0, rx = 0, uvScale = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(w, h, d));
    const g = _box.clone();
    if (uvScale) { const uv = g.attributes.uv, nor = g.attributes.normal, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) { const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)); const px = pos.getX(i) * w, py = pos.getY(i) * h, pz = pos.getZ(i) * d; uv.setXY(i, (nx > .5 ? pz : px) / uvScale, (ny > .5 ? pz : py) / uvScale); } }
    this.add(key, g, m, color);
  }
  cyl(key, r, h, x, y, z, color, rz = 0) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(r, h, r)); this.add(key, _cyl, m, color); }
  blob(key, r, x, y, z, color, sy = .85) { const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion(), new THREE.Vector3(r, r * sy, r)); this.add(key, _ico, m, color); }
  /** flat polygon at height y (points in current frame), uv in metres / uvs */
  flat(key, P, y, color, uvs = 4) {
    const s = new THREE.Shape(P.map((p) => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(s).toNonIndexed(); g.rotateX(-Math.PI / 2); g.translate(0, y, 0);
    const uv = g.attributes.uv, pos = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / uvs, pos.getZ(i) / uvs);
    this.add(key, g, null, color);
  }
  /** wall along a segment (current frame) */
  wall(key, a, b, h, t, color, y0 = 0, uvScale = 2.4) {
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz); if (L < .05) return;
    this.box(key, L, h, t, (a[0] + b[0]) / 2, y0 + h / 2, (a[1] + b[1]) / 2, color, -Math.atan2(dz, dx), 0, uvScale);
  }
  raw(key, geom, color) { this.add(key, geom, null, color); }
  build(shadows = true) {
    const M = materials(); const group = new THREE.Group();
    for (const [k, list] of Object.entries(this.buckets)) {
      if (!list.length) continue;
      const g = mergeGeometries(list, false); if (!g) continue; g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, M[k] || M.plain); mesh.castShadow = shadows && k !== "lawn" && k !== "pav" && k !== "water"; mesh.receiveShadow = true; group.add(mesh);
    }
    this.buckets = {};
    return group;
  }
}

/** Hip / gable roof geometry spanning x0..x1, z0..z1 (already including overhang). */
export function roofGeometry(x0, x1, z0, z1, eave, pitch, type) {
  const W = x1 - x0, D = z1 - z0, t = Math.tan(pitch * Math.PI / 180); const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const A = P(x0, eave, z0), B = P(x1, eave, z0), C = P(x1, eave, z1), Dd = P(x0, eave, z1); let faces; let ends = [];
  if (type === "gable") {
    if (W >= D) { const h = D / 2 * t, zm = (z0 + z1) / 2, R1 = P(x0, eave + h, zm), R2 = P(x1, eave + h, zm); faces = [[A, R1, R2, B], [C, R2, R1, Dd]]; ends = [[Dd, R1, A], [B, R2, C]]; }
    else { const h = W / 2 * t, xm = (x0 + x1) / 2, R1 = P(xm, eave + h, z0), R2 = P(xm, eave + h, z1); faces = [[B, A, R1, R2], [Dd, C, R2, R1]]; ends = [[B, A, R1], [Dd, C, R2]]; }
  } else if (W >= D) { const h = D / 2 * t, zm = (z0 + z1) / 2, R1 = P(x0 + D / 2, eave + h, zm), R2 = P(x1 - D / 2, eave + h, zm); faces = [[A, R1, R2, B], [C, R2, R1, Dd], [Dd, R1, A], [B, R2, C]]; }
  else { const h = W / 2 * t, xm = (x0 + x1) / 2, R1 = P(xm, eave + h, z0 + W / 2), R2 = P(xm, eave + h, z1 - W / 2); faces = [[B, A, R1, R2], [Dd, C, R2, R1], [A, Dd, R1], [C, B, R2]]; }
  const mk = (list, slope) => {
    const pos = [], uv = [];
    for (const f of list) {
      const tris = f.length === 4 ? [[f[0], f[1], f[2]], [f[0], f[2], f[3]]] : [[f[0], f[1], f[2]]];
      const n = new THREE.Vector3().subVectors(f[1], f[0]).cross(new THREE.Vector3().subVectors(f[2], f[0])).normalize();
      const hx = new THREE.Vector3(n.x, 0, n.z); if (hx.lengthSq() < 1e-6) hx.set(1, 0, 0); hx.normalize(); const al = new THREE.Vector3(-hx.z, 0, hx.x);
      for (const tr of tris) for (const p of tr) { pos.push(p.x, p.y, p.z); uv.push((p.x * al.x + p.z * al.z) / 2.5, slope ? (-(p.x * hx.x + p.z * hx.z) / Math.cos(pitch * Math.PI / 180)) / 2.5 : p.y / 2.5); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals(); return g;
  };
  return { roof: mk(faces, true), ends: ends.length ? mk(ends, false) : null };
}
