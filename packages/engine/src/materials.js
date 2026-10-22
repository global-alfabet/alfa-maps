import * as THREE from "three";
import { rnd } from "./util.js";

function tex(w, h, draw, repeat = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function speckle(base, n, vary, seed, size = 2) {
  return (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = rnd(i + seed) * vary * 2 - vary; const c = new THREE.Color(base); g.fillStyle = `rgb(${Math.round(c.r * 255 + v)},${Math.round(c.g * 255 + v)},${Math.round(c.b * 255 + v * .6)})`; g.fillRect(rnd(i * 3 + seed) * w, rnd(i * 7 + seed) * h, size, size); } };
}

let T = null;
export function textures() {
  if (T) return T;
  T = {
    grass: tex(256, 256, speckle("#6f9a45", 9000, 20, 1)),
    lawn: tex(256, 256, speckle("#7aa84c", 9000, 17, 9)),
    veld: tex(256, 256, speckle("#a9a672", 9000, 18, 2, 3)),
    park: tex(256, 256, speckle("#86a655", 9000, 20, 5, 3)),
    tar: tex(256, 256, speckle("#55585d", 9000, 15, 4, 1.5)),
    pav: tex(256, 256, (g, w, h) => { g.fillStyle = "#b8aa98"; g.fillRect(0, 0, w, h); const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = rnd(i * 31 + j) * 24 - 12; g.fillStyle = `rgb(${192 + v},${178 + v},${160 + v})`; g.fillRect(i * s + (j % 2) * s / 2 + 1, j * s + 1, s - 2, s - 2); g.fillRect(i * s + (j % 2) * s / 2 + 1 - w, j * s + 1, s - 2, s - 2); } }),
    precast: tex(256, 256, (g, w, h) => { speckle("#c9c2b5", 3000, 8, 3)(g, w, h); g.strokeStyle = "#a39b8d"; g.lineWidth = 3; for (let x = 0; x <= w; x += w / 2) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += h / 4) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }),
    plaster: tex(128, 128, speckle("#f4f2ee", 1500, 5, 6)),
    stone: tex(256, 256, (g, w, h) => { g.fillStyle = "#6d6358"; g.fillRect(0, 0, w, h); let y = 0, r = 0; while (y < h) { const hh = 14 + rnd(r) * 14; let x = -rnd(r * 7) * 40, k = 0; while (x < w) { const ww = 30 + rnd(r * 13 + k) * 50; const v = rnd(r * 5 + k * 3) * 50 - 25; g.fillStyle = `rgb(${150 + v},${136 + v},${118 + v})`; g.fillRect(x + 2, y + 2, ww - 3, hh - 3); x += ww; k++; } y += hh; r++; } }),
    brick: tex(256, 256, (g, w, h) => { g.fillStyle = "#d9d2c6"; g.fillRect(0, 0, w, h); const bh = 16, bw = 48; for (let r = 0; r * bh < h; r++) for (let x = -(r % 2) * bw / 2; x < w; x += bw) { const v = rnd(r * 17 + x) * 30 - 15; g.fillStyle = `rgb(${160 + v},${86 + v * .6},${60 + v * .4})`; g.fillRect(x + 2, r * bh + 2, bw - 3, bh - 3); } }),
    tile: tex(128, 128, (g, w, h) => { g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = "#b5b5b5"; g.fillRect(0, y + 12, w, 4); for (let x = ((y / 16) % 2) * 10; x < w; x += 20) { g.fillStyle = "#cdcdcd"; g.fillRect(x, y, 2, 12); } } }),
    wood: tex(128, 128, (g, w, h) => { g.fillStyle = "#8a5a36"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,35,20,${.2 + rnd(i) * .3})`; g.fillRect(0, rnd(i * 3) * h, w, 1 + rnd(i) * 2); } }),
    water: tex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#5cc6e0"); gr.addColorStop(1, "#2e9fc4"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 2; for (let i = 0; i < 40; i++) { g.beginPath(); const x = rnd(i) * w, y = rnd(i * 3) * h; g.moveTo(x, y); g.bezierCurveTo(x + 10, y - 6, x + 20, y + 6, x + 34, y); g.stroke(); } }),
    sky: tex(16, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#6fa6d6"); gr.addColorStop(.55, "#b9d6ec"); gr.addColorStop(1, "#e9f1f5"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, false),
    white: tex(4, 4, (g) => { g.fillStyle = "#fff"; g.fillRect(0, 0, 4, 4); }),
  };
  return T;
}

let MATS = null;
/** Materials shared by every merged mesh. Every geometry carries uv + colour so buckets always merge. */
export function materials() {
  if (MATS) return MATS; const t = textures();
  const std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: .9, metalness: 0, vertexColors: true }, o));
  MATS = {
    plain: std({ map: t.white }),
    plaster: std({ map: t.plaster }),
    roof: std({ map: t.tile, side: THREE.DoubleSide }),
    glass: std({ map: t.white, roughness: .15, metalness: .45 }),
    metal: std({ map: t.white, roughness: .4, metalness: .5 }),
    water: std({ map: t.water, roughness: .05, metalness: .1 }),
    stone: std({ map: t.stone }), brick: std({ map: t.brick }), wood: std({ map: t.wood }),
    pav: std({ map: t.pav }), precast: std({ map: t.precast }), lawn: std({ map: t.lawn }), grass: std({ map: t.grass }),
    leaf: std({ map: t.white, flatShading: true }),
    veld: std({ map: t.veld }), park: std({ map: t.park }), tar: std({ map: t.tar, roughness: .95 }),
  };
  return MATS;
}
