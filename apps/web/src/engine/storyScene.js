// Scroll-driven hero scene: surveyor's drawing → 3D estate → a finished home.
// progress 0..1 is supplied by the page as the visitor scrolls.
import * as THREE from "three";
import { Builder } from "@alfa-maps/engine/builder";
import { buildStand } from "@alfa-maps/engine/house";
import { materials } from "@alfa-maps/engine/materials";
import { bbox, centroid, convexHull, grow, rnd } from "@alfa-maps/engine/util";
import { fillHouses } from "@alfa-maps/engine/defaults";
import { specFromPreset } from "@alfa-maps/engine/presets";

// Brand: graphite night plan → daylight estate; drawing lines in light grey; Alfa Maps green for the featured plot.
const GRAPHITE = new THREE.Color("#1D1D1F");
const SKY = new THREE.Color("#DCE7EE");
const INK = 0xc7c7cc;
const BEACON = 0x1fa45a;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const ramp = (p, a, b) => clamp01((p - a) / (b - a));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class StoryScene {
  constructor(container, data) {
    this.el = container;
    this.data = data;
    this.progress = -1;
    this.listeners = new Set();

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.localClippingEnabled = true;
    container.appendChild(r.domElement);

    const s = (this.scene = new THREE.Scene());
    s.background = GRAPHITE.clone();
    s.fog = new THREE.Fog(GRAPHITE.clone(), 420, 1400);
    this.hemi = new THREE.HemisphereLight(0xdbeeff, 0x6f6247, 1.1);
    s.add(this.hemi);
    const sun = (this.sun = new THREE.DirectionalLight(0xfff1dc, 2.6));
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.05;
    const sc = sun.shadow.camera;
    sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.far = 900;
    sun.position.set(160, 320, -140);
    s.add(sun, sun.target);

    this.camera = new THREE.PerspectiveCamera(40, 1.6, 1, 4000);
    this.clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.06);

    this.build();
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  build() {
    const { stands, open, hero } = this.data;
    const M = materials();
    this.mats = Object.values(M);
    this.mats.forEach((m) => (m.clippingPlanes = [this.clip]));

    // ------------------------------------------------ houses: a believable mix, some stands still for sale
    const houses = fillHouses(stands, {});
    stands.forEach((s, i) => {
      if (s.status === "available" && s.no !== hero && i % 2 === 0) houses[s.no] = specFromPreset("empty");
    });
    houses[hero] = { ...specFromPreset("baobab"), pool: true, solar: true };

    // ------------------------------------------------ ground: tarred roads under the estate, parks, veld
    const pts = stands.flatMap((s) => s.poly).concat(open.flatMap((o) => o.poly));
    this.bounds = bbox(pts);
    const g = new Builder();
    g.flat("veld", [[-3000, -3000], [3000, -3000], [3000, 3000], [-3000, 3000]], -0.6, 0xdce8c6, 10);
    g.flat("tar", grow(convexHull(stands.flatMap((s) => s.poly)), 12), -0.3, 0xffffff, 6);
    open.forEach((o) => g.flat("park", o.poly, -0.1, 0xffffff, 6));
    this.ground = g.build(false);
    this.ground.children.forEach((m) => (m.receiveShadow = true));

    // ------------------------------------------------ stands + houses in one merged build
    const b = new Builder();
    const ctx = { signs: true, streetTrees: true, gardenTrees: 2, setbacks: { front: 5, side: 1.5 } };
    this.info = new Map();
    const trees = [];
    stands.forEach((s) => {
      const inf = buildStand(b, s, houses[s.no], ctx);
      this.info.set(s.no, inf);
      trees.push(...inf.trees);
    });
    open.forEach((o, i) => {
      const bb = bbox(o.poly);
      for (let k = 0; k < 40; k++) {
        const q = [bb.x0 + rnd(i * 31 + k) * (bb.x1 - bb.x0), bb.z0 + rnd(i * 37 + k * 3) * (bb.z1 - bb.z0)];
        trees.push([q[0], q[1], 0.8 + rnd(k) * 0.6, rnd(k * 7) < 0.15 ? 1 : 0]);
      }
    });
    this.estate = b.build(true);
    this.estate3d = new THREE.Group();
    this.estate3d.add(this.ground, this.estate);
    this.trees = this.makeTrees(trees);
    this.estate3d.add(this.trees.group);
    this.scene.add(this.estate3d);

    // ------------------------------------------------ the surveyor's drawing: ink lines + grid
    const blue = new THREE.Group();
    const inkMat = (this.inkMat = new THREE.MeshBasicMaterial({ color: INK, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    const band = (P, w, dash) => {
      const pos = [];
      for (let i = 0; i < P.length; i++) {
        const a = P[i], c = P[(i + 1) % P.length];
        const dx = c[0] - a[0], dz = c[1] - a[1], L = Math.hypot(dx, dz) || 1;
        const steps = dash ? Math.max(1, Math.floor(L / 4)) : 1;
        for (let k = 0; k < steps; k += dash ? 2 : 1) {
          const t0 = k / steps, t1 = Math.min(1, (k + 1) / steps);
          const ax = a[0] + dx * t0, az = a[1] + dz * t0, cx = a[0] + dx * t1, cz = a[1] + dz * t1;
          const nx = (-dz / L) * w, nz = (dx / L) * w;
          pos.push(ax - nx, 0.4, az - nz, cx - nx, 0.4, cz - nz, cx + nx, 0.4, cz + nz, ax - nx, 0.4, az - nz, cx + nx, 0.4, cz + nz, ax + nx, 0.4, az + nz);
        }
      }
      return pos;
    };
    const pos = [];
    stands.forEach((s) => pos.push(...band(s.poly, 0.55)));
    open.forEach((o) => pos.push(...band(o.poly, 0.45, true)));
    // stand numbers, like on the surveyor's plan
    stands.forEach((s) => {
      const c = centroid(s.poly);
      const cv = document.createElement("canvas");
      cv.width = 128; cv.height = 64;
      const g2 = cv.getContext("2d");
      g2.fillStyle = "#A1A1A6"; g2.font = "500 32px 'Inter Variable', system-ui, sans-serif"; g2.textAlign = "center"; g2.textBaseline = "middle";
      g2.fillText(s.no, 64, 34);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(c[0], 0.5, c[1]);
      blue.add(m);
    });
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    blue.add(new THREE.Mesh(lg, inkMat));
    const grid = (this.grid = new THREE.GridHelper(1400, 140, 0x3a3a3c, 0x2c2c2e));
    grid.material.transparent = true;
    grid.position.y = 0.2;
    blue.add(grid);
    // survey beacons at every corner of the hero stand
    const heroStand = stands.find((s) => s.no === hero);
    heroStand.poly.forEach((p) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 20), new THREE.MeshBasicMaterial({ color: BEACON, transparent: true }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(p[0], 0.5, p[1]);
      blue.add(m);
    });
    this.blueprint = blue;
    this.scene.add(blue);

    // ------------------------------------------------ highlight ring around the featured stand
    const ring = new THREE.Mesh(
      (() => {
        const q = new THREE.BufferGeometry();
        q.setAttribute("position", new THREE.Float32BufferAttribute(band(heroStand.poly, 0.5).map((v, i) => (i % 3 === 1 ? 0.14 : v)), 3));
        return q;
      })(),
      new THREE.MeshBasicMaterial({ color: BEACON, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.ring = ring;
    this.scene.add(ring);

    // ------------------------------------------------ camera path
    const heroInf = this.info.get(hero);
    const hc = centroid(heroStand.poly);
    const [ap, at] = heroInf.cams.aerial;
    const closer = (p, t, f) => p.map((v, i) => t[i] + (v - t[i]) * f);
    const bc = [(this.bounds.x0 + this.bounds.x1) / 2, (this.bounds.z0 + this.bounds.z1) / 2];
    // top view: estate centred, nudged right so the headline on the left stays clear
    const top = [bc[0], 0, bc[1]];
    this.topTarget = top;
    this.keys = [
      { t: 0.0, pos: [top[0], 430, top[2] + 0.01], tgt: top },
      { t: 0.12, pos: [top[0], 400, top[2] + 0.01], tgt: top },
      { t: 0.36, pos: [-190, 250, 290], tgt: [0, 0, 20] },
      { t: 0.62, pos: [-40, 170, 230], tgt: [hc[0] * 0.5, 0, hc[1] * 0.5] },
      { t: 0.84, pos: ap, tgt: at },
      { t: 1.0, pos: closer(ap, at, 0.72), tgt: at },
    ];
    this.anchors = {
      plan: [heroStand.poly[0][0], 0, heroStand.poly[0][1]],
      trace: this.standPoint(stands[Math.min(12, stands.length - 1)].no, 0),
      sizes: this.standPoint(stands[Math.min(5, stands.length - 1)].no, 0),
      roads: [this.bounds.x0 * 0.55, 0, this.bounds.z1 * 0.25],
      homes: this.standPoint(stands[Math.min(8, stands.length - 1)].no, 6),
      forsale: this.standPoint(stands.find((s, i) => s.status === "available" && i > 3)?.no || hero, 2),
      house: [hc[0], 7.5, hc[1]],
      pool: [hc[0] + 6, 1, hc[1] - 12],
      price: [hc[0] - 8, 0.5, hc[1] - 10],
    };
  }

  standPoint(no, y) {
    const s = this.data.stands.find((x) => x.no === no);
    const c = centroid(s.poly);
    return [c[0], y, c[1]];
  }

  makeTrees(spots) {
    const group = new THREE.Group();
    const n = spots.length;
    const trunkG = new THREE.CylinderGeometry(0.12, 0.2, 2.6, 6);
    trunkG.translate(0, 1.3, 0);
    const crownG = new THREE.IcosahedronGeometry(1.9, 1);
    crownG.scale(1, 0.85, 1);
    crownG.translate(0, 3.8, 0);
    const trunks = new THREE.InstancedMesh(trunkG, new THREE.MeshStandardMaterial({ color: 0x5b4331 }), n);
    const crowns = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), n);
    const col = new THREE.Color();
    const greens = [0x4f7d33, 0x5a8a3a, 0x44702b, 0x6a9a3c, 0x3f6f2c];
    spots.forEach((s, k) => {
      col.setHex(s[3] ? 0x8a6cc4 : greens[k % greens.length]);
      crowns.setColorAt(k, col);
    });
    trunks.castShadow = crowns.castShadow = true;
    group.add(trunks, crowns);
    return { group, spots, trunks, crowns, m: new THREE.Matrix4() };
  }

  setTreeGrowth(t) {
    const { spots, trunks, crowns, m } = this.trees;
    spots.forEach((s, k) => {
      const local = ease(clamp01(t * 1.6 - rnd(k * 1.7) * 0.6));
      const sc = Math.max(0.0001, s[2] * local);
      m.makeScale(sc, sc, sc);
      m.setPosition(s[0], 0, s[1]);
      trunks.setMatrixAt(k, m);
      crowns.setMatrixAt(k, m);
    });
    trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
  }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // keep the whole drawing in view on tall phone screens
    this.camera.fov = w / h < 0.8 ? 58 : 40;
    // on wide screens, shift the picture right so the copy on the left has room
    if (w > 900) this.camera.setViewOffset(w, h, -w * 0.16, 0, w, h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.render(true);
  }

  cameraAt(p) {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 2 && p > K[i + 1].t) i++;
    const a = K[i], b = K[i + 1];
    const t = ease(clamp01((p - a.t) / (b.t - a.t || 1)));
    const lerp = (u, v) => u.map((x, j) => x + (v[j] - x) * t);
    return { pos: lerp(a.pos, b.pos), tgt: lerp(a.tgt, b.tgt) };
  }

  setProgress(p) {
    if (Math.abs(p - this.progress) < 1e-4) return;
    this.progress = p;
    this.render();
  }

  render(force) {
    const p = clamp01(this.progress < 0 ? 0 : this.progress);
    // drawing → world
    const draw = 1 - ramp(p, 0.12, 0.34);
    const world = ramp(p, 0.14, 0.34);
    this.scene.background.copy(GRAPHITE).lerp(SKY, ease(world));
    this.scene.fog.color.copy(this.scene.background);
    this.inkMat.opacity = draw;
    this.grid.material.opacity = draw * 0.9;
    this.blueprint.visible = draw > 0.01;
    this.blueprint.children.forEach((c) => c.material !== this.inkMat && c !== this.grid && (c.material.opacity = Math.max(draw, 0)));
    const fade = world < 0.999;
    this.mats.forEach((m) => {
      m.transparent = fade;
      m.opacity = world;
    });
    this.trees.group.visible = world > 0.01;
    this.estate3d.visible = world > 0.005;
    // walls and houses rise out of the ground
    this.clip.constant = 0.06 + 16 * ease(ramp(p, 0.36, 0.64));
    this.setTreeGrowth(ramp(p, 0.46, 0.7));
    // featured stand
    this.ring.material.opacity = ramp(p, 0.68, 0.78) * 0.95;
    this.ring.visible = this.ring.material.opacity > 0.01;
    const { pos, tgt } = this.cameraAt(p);
    this.camera.position.set(...pos);
    this.camera.lookAt(...tgt);
    this.sun.target.position.set(tgt[0], 0, tgt[2]);
    this.sun.position.set(tgt[0] + 160, 320, tgt[2] - 140);
    this.renderer.render(this.scene, this.camera);
    this.listeners.forEach((fn) => fn(p));
    if (force) return;
  }

  project(v) {
    const w = new THREE.Vector3(...v).project(this.camera);
    return { x: ((w.x + 1) / 2) * this.el.clientWidth, y: ((1 - w.y) / 2) * this.el.clientHeight, behind: w.z > 1 };
  }

  onFrame(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispose() {
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
