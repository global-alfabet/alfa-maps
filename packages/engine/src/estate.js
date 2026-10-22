import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Builder } from "./builder.js";
import { buildStand } from "./house.js";
import { materials, textures } from "./materials.js";
import { bbox, centroid, convexHull, grow, rnd, inPoly } from "./util.js";

const CHUNK = 90; // metres

/** The whole estate in 3D: ground, every stand with its house, trees, selection, cameras. */
export class EstateScene {
  constructor(container) {
    this.el = container; textures(); materials();
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    container.appendChild(r.domElement);
    const s = (this.scene = new THREE.Scene()); s.background = textures().sky; s.fog = new THREE.Fog(0xdde9f1, 500, 2200);
    s.add(new THREE.HemisphereLight(0xdbeeff, 0x6f6247, 1.1));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff1dc, 2.6)); sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -.0004; sun.shadow.normalBias = .05; s.add(sun, sun.target);
    this.persp = new THREE.PerspectiveCamera(50, 1.6, .5, 5000); this.ortho = new THREE.OrthographicCamera(-50, 50, 30, -30, .1, 3000); this.camera = this.persp;
    const c = (this.controls = new OrbitControls(this.persp, r.domElement)); c.enableDamping = true; c.dampingFactor = .09; c.maxPolarAngle = Math.PI / 2.06; c.minDistance = 4; c.maxDistance = 2600;
    c.addEventListener("change", () => { this.needs = true; this.shadowDirty = true; });
    c.addEventListener("start", () => { this.anim = null; this.onUserMove && this.onUserMove(); });
    this.root = new THREE.Group(); s.add(this.root);
    this.chunks = new Map(); this.info = new Map(); this.treeGroups = []; this.hiddenTrees = []; this.ray = new THREE.Raycaster(); this.listeners = new Set();
    this.hl = new THREE.Group(); s.add(this.hl);
    new ResizeObserver(() => this.resize()).observe(container); this.resize();
    const loop = (t) => { this._raf = requestAnimationFrame(loop); this.tick(t); }; this._raf = requestAnimationFrame(loop);
  }
  dispose() { cancelAnimationFrame(this._raf); this.renderer.dispose(); this.renderer.domElement.remove(); }
  onRender(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); if (this.orthoFit) this.fitOrtho(this.orthoFit); this.needs = true; }
  tick(t) {
    if (this.anim) { const a = this.anim, k = Math.min(1, (t - a.t0) / a.dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.persp.position.lerpVectors(a.p0, a.p1, e); this.controls.target.lerpVectors(a.q0, a.q1, e); if (k >= 1) this.anim = null; this.needs = true; this.shadowDirty = true; }
    if (this.camera === this.persp && this.controls.update()) this.needs = true;
    if (this.shadowDirty) { this.followShadow(); this.shadowDirty = false; }
    if (!this.needs) return; this.needs = false; this.renderer.render(this.scene, this.camera); this.listeners.forEach((fn) => fn());
  }
  followShadow() {
    const tgt = this.camera === this.ortho ? new THREE.Vector3(this.ortho.position.x, 0, this.ortho.position.z) : this.controls.target;
    const dist = this.camera === this.ortho ? (this.ortho.right - this.ortho.left) : this.persp.position.distanceTo(tgt);
    const span = Math.max(45, Math.min(650, dist * .85));
    this.sun.position.set(tgt.x + span * .55, span * 1.3 + 60, tgt.z - span * .45); this.sun.target.position.copy(tgt);
    const sc = this.sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = span * 4 + 300; sc.updateProjectionMatrix();
  }

  // ------------------------------------------------------------------ building
  /** estate = { stands, open }, specs = Map stand.no → house spec, look = settings.look */
  load(estate, specs, look) {
    this.estate = estate; this.specs = specs; this.look = look || {}; this.root.clear(); this.treeGroups = []; this.hiddenTrees = []; this.chunks.clear(); this.info.clear();
    const stands = estate.stands; this.byNo = new Map(stands.map((s) => [s.no, s]));
    const pts = stands.flatMap((s) => s.poly).concat(estate.open.flatMap((o) => o.poly)); this.bounds = bbox(pts);
    const b = new Builder();
    b.flat("veld", [[-6000, -6000], [6000, -6000], [6000, 6000], [-6000, 6000]], -.6, 0xffffff, 10);
    const hull = grow(convexHull(pts), 10); b.flat("tar", hull, -.3, 0xffffff, 6);
    estate.open.forEach((o) => b.flat("park", o.poly, -.1, 0xffffff, 6));
    const ground = b.build(false); ground.children.forEach((m) => { m.receiveShadow = true; m.castShadow = false; }); this.root.add(ground);
    // parks: trees
    this.parkTrees = [];
    estate.open.forEach((o, i) => { const bb = bbox(o.poly); const n = Math.round((this.look.parkTrees ?? .6) * (bb.x1 - bb.x0) * (bb.z1 - bb.z0) / 700); for (let k = 0; k < n; k++) { const q = [bb.x0 + rnd(i * 91 + k) * (bb.x1 - bb.x0), bb.z0 + rnd(i * 97 + k * 7) * (bb.z1 - bb.z0)]; if (inPoly(q, o.poly)) this.parkTrees.push([q[0], q[1], .8 + rnd(k) * .7, rnd(k * 3) < .15 ? 1 : 0]); } });
    this.root.add(this.treesMesh(this.parkTrees));
    // chunks of stands
    this.chunkOf = new Map();
    stands.forEach((s) => { const c = centroid(s.poly); const key = `${Math.floor(c[0] / CHUNK)}_${Math.floor(c[1] / CHUNK)}`; if (!this.chunks.has(key)) this.chunks.set(key, { key, stands: [], group: null }); this.chunks.get(key).stands.push(s); this.chunkOf.set(s.no, key); });
    for (const ch of this.chunks.values()) this.buildChunk(ch);
    this.buildPickMesh();
    this.needs = true; this.shadowDirty = true;
  }
  ctx() { const L = this.look || {}; return { signs: L.signs !== false, streetTrees: L.streetTrees !== false, gardenTrees: Math.round((L.treeDensity ?? .5) * 6), tintAvailable: false, setbacks: { front: 5, side: 1.5 } }; }
  buildChunk(ch) {
    if (ch.group) { this.root.remove(ch.group); ch.group.traverse((o) => o.geometry && o.geometry.dispose()); this.treeGroups = this.treeGroups.filter((g) => g.parent !== ch.group); this.hiddenTrees = []; }
    const b = new Builder(); const trees = []; const ctx = this.ctx();
    for (const s of ch.stands) { const inf = buildStand(b, s, this.specs.get(s.no), ctx); this.info.set(s.no, inf); trees.push(...inf.trees); }
    const g = b.build(true); g.add(this.treesMesh(trees)); ch.group = g; this.root.add(g); this.needs = true; this.shadowDirty = true;
    if (this.sight) { const [p, t] = this.sight; this.clearSight(p, t); }
  }
  treesMesh(spots) {
    const grp = new THREE.Group(); if (!spots.length) return grp;
    const trunkG = new THREE.CylinderGeometry(.12, .2, 2.6, 6); trunkG.translate(0, 1.3, 0);
    const crownG = new THREE.IcosahedronGeometry(1.9, 1); crownG.scale(1, .85, 1); crownG.translate(0, 3.8, 0);
    const mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: .9 });
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x5b4331 }), spots.length), crowns = new THREE.InstancedMesh(crownG, mat, spots.length);
    const m = new THREE.Matrix4(), col = new THREE.Color(); const greens = [0x4f7d33, 0x5a8a3a, 0x44702b, 0x6a9a3c, 0x3f6f2c];
    spots.forEach((s, k) => { const sc = s[2]; m.makeScale(sc, sc * (.9 + rnd(k) * .3), sc); m.setPosition(s[0], 0, s[1]); trunks.setMatrixAt(k, m); crowns.setMatrixAt(k, m); col.setHex(s[3] ? 0x8a6cc4 : greens[k % greens.length]); crowns.setColorAt(k, col); });
    trunks.castShadow = crowns.castShadow = true; grp.userData.trees = { spots, trunks, crowns }; this.treeGroups.push(grp); grp.add(trunks, crowns); return grp;
  }
  buildPickMesh() {
    if (this.pick) this.scene.remove(this.pick);
    const pos = []; this.triStand = [];
    this.estate.stands.forEach((s) => { const shape = new THREE.Shape(s.poly.map((p) => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ShapeGeometry(shape).toNonIndexed(); g.rotateX(-Math.PI / 2); const a = g.attributes.position; for (let i = 0; i < a.count; i++) pos.push(a.getX(i), .05, a.getZ(i)); for (let i = 0; i < a.count / 3; i++) this.triStand.push(s.no); });
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeBoundingSphere();
    this.pick = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })); this.scene.add(this.pick);
  }
  /** Change one stand's house and rebuild only its neighbourhood chunk. */
  setSpec(no, spec) { this.specs.set(no, spec); const ch = this.chunks.get(this.chunkOf.get(no)); if (ch) this.buildChunk(ch); if (this.selected === no) this.highlight(no, this.selStyle); }
  setLook(look) { this.look = look || {}; for (const ch of this.chunks.values()) this.buildChunk(ch); }

  // ------------------------------------------------------------------ picking + highlight
  standAt(clientX, clientY) {
    const r = this.renderer.domElement.getBoundingClientRect(); const v = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(v, this.camera); const hit = this.ray.intersectObject(this.pick, false)[0]; return hit ? this.triStand[hit.faceIndex] : null;
  }
  highlight(no, style = "select") {
    this.hl.clear(); this.selected = no; this.selStyle = style; if (!no) { this.needs = true; return; }
    const s = this.byNo.get(no); if (!s) return;
    const col = style === "drop" ? 0xC0471C : 0x13a394; const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9, depthWrite: false });
    const P = s.poly; const pos = [];
    for (let i = 0; i < P.length; i++) { const a = P[i], c = P[(i + 1) % P.length]; const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz) || 1, nx = -dz / L * .45, nz = dx / L * .45;
      const q = [[a[0] - nx, a[1] - nz], [c[0] - nx, c[1] - nz], [c[0] + nx, c[1] + nz], [a[0] + nx, a[1] + nz]]; const y = .12; pos.push(q[0][0], y, q[0][1], q[1][0], y, q[1][1], q[2][0], y, q[2][1], q[0][0], y, q[0][1], q[2][0], y, q[2][1], q[3][0], y, q[3][1]); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    const band = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); this.hl.add(band);
    const fillShape = new THREE.Shape(P.map((p) => new THREE.Vector2(p[0], -p[1]))); const fg = new THREE.ShapeGeometry(fillShape); fg.rotateX(-Math.PI / 2); fg.translate(0, .09, 0);
    const fill = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .16, depthWrite: false })); this.hl.add(fill);
    // corner beacons
    P.forEach((p) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, 2.4, 8), mat); m.position.set(p[0], 1.2, p[1]); this.hl.add(m); });
    this.needs = true;
  }

  // ------------------------------------------------------------------ keep trees out of the way of a camera
  restoreTrees() {
    const m = new THREE.Matrix4();
    for (const [g, k] of this.hiddenTrees) { const { spots, trunks, crowns } = g.userData.trees; const s = spots[k]; m.makeScale(s[2], s[2], s[2]); m.setPosition(s[0], 0, s[1]); trunks.setMatrixAt(k, m); crowns.setMatrixAt(k, m); trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; }
    this.hiddenTrees = []; this.sight = null; this.needs = true;
  }
  clearSight(pos, target) {
    this.restoreTrees(); this.sight = [pos, target]; const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const ax = pos[0], az = pos[2], bx = target[0], bz = target[2], dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
    for (const g of this.treeGroups) { if (!g.parent) continue; const { spots, trunks, crowns } = g.userData.trees;
      spots.forEach((s, k) => { const t = ((s[0] - ax) * dx + (s[1] - az) * dz) / L2; if (t < -.05 || t > .9) return; const d = Math.hypot(s[0] - ax - t * dx, s[1] - az - t * dz); if (d < 2.4 * s[2] + 1.2 + t * 2) { trunks.setMatrixAt(k, zero); crowns.setMatrixAt(k, zero); trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; this.hiddenTrees.push([g, k]); } }); }
    this.needs = true;
  }

  // ------------------------------------------------------------------ cameras
  flyTo(pos, target, animate = true) {
    this.camera = this.persp; this.controls.enabled = true; this.orthoFit = null;
    const p1 = new THREE.Vector3(...pos), q1 = new THREE.Vector3(...target);
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { this.persp.position.copy(p1); this.controls.target.copy(q1); this.controls.update(); this.anim = null; this.needs = true; this.shadowDirty = true; return; }
    this.anim = { p0: this.persp.position.clone(), q0: this.controls.target.clone(), p1, q1, t0: performance.now(), dur: 1200 };
  }
  overview(animate = true) { this.restoreTrees(); const b = this.bounds, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, s = Math.max(b.x1 - b.x0, b.z1 - b.z0); this.flyTo([cx - s * .05, s * .52, cz + s * .6], [cx, 0, cz], animate); }
  freeRoam() { if (this.camera !== this.persp) { this.camera = this.persp; this.controls.enabled = true; this.orthoFit = null; this.needs = true; this.shadowDirty = true; } }
  standView(no, view, animate = true) {
    if (view === "planEstate") { const b = this.bounds; this.fitOrtho({ cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, hw: (b.x1 - b.x0) / 2 + 20, hh: (b.z1 - b.z0) / 2 + 20, up: [0, -1] }); return; }
    const inf = this.info.get(no); if (!inf) return;
    this.restoreTrees();
    if (view === "plan") { const b = inf.bounds, up = inf.F.uz; this.fitOrtho({ cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, hw: (b.x1 - b.x0) / 2 + 14, hh: (b.z1 - b.z0) / 2 + 14, up }); return; }
    if (view === "planEstate") { const b = this.bounds; this.fitOrtho({ cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2, hw: (b.x1 - b.x0) / 2 + 20, hh: (b.z1 - b.z0) / 2 + 20, up: [0, -1] }); return; }
    const c = inf.cams[view]; if (c) { this.clearSight(c[0], c[1]); this.flyTo(c[0], c[1], animate); }
  }
  fitOrtho(fit) {
    this.orthoFit = fit; const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1, asp = w / h; let hw = fit.hw, hh = fit.hh; if (hw / hh > asp) hh = hw / asp; else hw = hh * asp;
    Object.assign(this.ortho, { left: -hw, right: hw, top: hh, bottom: -hh }); this.ortho.updateProjectionMatrix(); this.ortho.position.set(fit.cx, 600, fit.cz); this.ortho.up.set(fit.up[0], 0, fit.up[1]); this.ortho.lookAt(fit.cx, 0, fit.cz);
    this.camera = this.ortho; this.controls.enabled = false; this.anim = null; this.needs = true; this.shadowDirty = true;
  }
  project(p) { const v = new THREE.Vector3(...p).project(this.camera); return [(v.x + 1) / 2 * this.el.clientWidth, (1 - v.y) / 2 * this.el.clientHeight, v.z]; }
  /** Stand-number labels for stands near the camera (for the HTML overlay). */
  labels(max = 70) {
    if (!this.estate) return []; const cam = this.camera === this.ortho ? null : this.persp.position; const out = [];
    const dist = cam ? cam.distanceTo(this.controls.target) : 0; if (cam && (dist > 330 || cam.y < 16)) return [];
    if (!cam && this.ortho.right - this.ortho.left > 500) return [];
    for (const s of this.estate.stands) { if (!s.numbered) continue; const c = centroid(s.poly); if (cam) { const d = Math.hypot(cam.x - c[0], cam.z - c[1]); if (d > 190) continue; }
      const [x, y, z] = this.project([c[0], 6.5, c[1]]); if (z > 1 || x < 0 || y < 0 || x > this.el.clientWidth || y > this.el.clientHeight) continue; out.push({ no: s.no, x, y, status: s.status }); if (out.length >= max) break; }
    return out;
  }
  /** Render views of a stand to JPEG data URLs (for the PDF). */
  capture(no, views, w = 1600, h = 1000, drawOverlay) {
    const old = { cam: this.camera, pos: this.persp.position.clone(), tgt: this.controls.target.clone(), fit: this.orthoFit };
    this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false); this.persp.aspect = w / h; this.persp.updateProjectionMatrix(); const out = [];
    const saveEl = this.el; this.el = { clientWidth: w, clientHeight: h };
    for (const v of views) {
      this.anim = null; if (v.key === "plan") this.standView(no, "plan"); else { const c = this.info.get(no).cams[v.key]; this.clearSight(c[0], c[1]); this.persp.position.set(...c[0]); this.controls.target.set(...c[1]); this.persp.lookAt(...c[1]); this.camera = this.persp; }
      this.followShadow(); this.renderer.render(this.scene, this.camera);
      let url; if (drawOverlay && v.key === "plan") { const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"); g.drawImage(this.renderer.domElement, 0, 0); drawOverlay(g, this, no, w, h); url = cv.toDataURL("image/jpeg", .88); } else url = this.renderer.domElement.toDataURL("image/jpeg", .88);
      out.push({ ...v, data: url });
    }
    this.el = saveEl; this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); this.resize();
    this.persp.position.copy(old.pos); this.controls.target.copy(old.tgt); this.camera = old.cam; if (old.fit) this.fitOrtho(old.fit); this.needs = true; this.shadowDirty = true; return out;
  }
}
