// Alfa Maps estate app: serves the built React app and a small JSON API for the admin view.
// One estate per running app for now. The estate it starts from is read from SEED_DIR (default: ./seed, the
// fictional demo estate). Point SEED_DIR at a client's folder to run their estate; client files never go in git.
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = +process.env.PORT || 8080;
// Relative paths are read from where you ran the command (npm sets INIT_CWD), so `SEED_DIR=estates/x npm run dev:app`
// works from the repo root.
const fromCwd = (p) => path.resolve(process.env.INIT_CWD || process.cwd(), p);
const SEED_DIR = process.env.SEED_DIR ? fromCwd(process.env.SEED_DIR) : path.join(ROOT, "seed");
// Each estate keeps its own working copy, so switching SEED_DIR on a laptop never mixes two estates' data.
const DATA_DIR = process.env.DATA_DIR ? fromCwd(process.env.DATA_DIR) : path.join(ROOT, "data", path.basename(SEED_DIR));
const DATA_FILE = path.join(DATA_DIR, "estate.json");
const PASSWORD = process.env.ADMIN_PASSWORD || "";
// Without a password, admin editing is open on a laptop (handy for building an estate) but switched off in production.
const ADMIN_OPEN = !PASSWORD && process.env.NODE_ENV !== "production";
const TOKEN = PASSWORD ? crypto.createHash("sha256").update("alfa-maps:" + PASSWORD).digest("hex") : "";

async function seed() {
  const plan = JSON.parse(await fs.readFile(path.join(SEED_DIR, "estate.json"), "utf8"));
  const settings = JSON.parse(await fs.readFile(path.join(SEED_DIR, "settings.json"), "utf8"));
  return { settings, stands: plan.stands, open: plan.open, houses: {}, updatedAt: null };
}
async function load() {
  if (!existsSync(DATA_FILE)) { await fs.mkdir(DATA_DIR, { recursive: true }); await write(await seed()); }
  return JSON.parse(await fs.readFile(DATA_FILE, "utf8"));
}
async function write(data) { const tmp = DATA_FILE + ".tmp"; await fs.writeFile(tmp, JSON.stringify(data)); await fs.rename(tmp, DATA_FILE); }

const app = express();
app.use(express.json({ limit: "25mb" }));
const admin = (req, res, next) => {
  if (ADMIN_OPEN || (PASSWORD && req.get("x-admin-token") === TOKEN)) return next();
  res.status(PASSWORD ? 401 : 403).json({ error: PASSWORD ? "Admin sign-in required." : "Admin is off. Set ADMIN_PASSWORD on the server." });
};

app.get("/api/config", (req, res) => res.json({ passwordRequired: !ADMIN_OPEN }));
app.post("/api/login", (req, res) => {
  if (ADMIN_OPEN) return res.json({ token: TOKEN });
  if (!PASSWORD) return res.status(403).json({ error: "Admin is off. Set ADMIN_PASSWORD on the server." });
  const a = Buffer.from(String(req.body?.password || "")), b = Buffer.from(PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? res.json({ token: TOKEN }) : res.status(401).json({ error: "Wrong password." });
});
app.get("/api/estate", async (req, res, next) => { try { res.set("Cache-Control", "no-store"); res.json(await load()); } catch (e) { next(e); } });
app.put("/api/estate", admin, async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!Array.isArray(b.stands) || !b.settings) return res.status(400).json({ error: "Missing stands or settings." });
    const data = { settings: b.settings, stands: b.stands, open: b.open || [], houses: b.houses || {}, updatedAt: new Date().toISOString() };
    await write(data); res.json({ ok: true, updatedAt: data.updatedAt });
  } catch (e) { next(e); }
});
app.post("/api/estate/reset", admin, async (req, res, next) => { try { const d = await seed(); await write(d); res.json(d); } catch (e) { next(e); } });
app.get("/api/health", (req, res) => res.json({ ok: true }));

const DIST = path.join(ROOT, "dist");
app.use(express.static(DIST, { maxAge: "1h", index: false }));
app.get("*", (req, res) => (existsSync(path.join(DIST, "index.html")) ? res.sendFile(path.join(DIST, "index.html")) : res.status(503).send("Run `npm run build` first.")));
app.use((err, req, res, _next) => { console.error(err); res.status(500).json({ error: "Something went wrong on the server." }); });

app.listen(PORT, () => console.log(`Alfa Maps running on http://localhost:${PORT}${PASSWORD ? " (admin password on)" : ADMIN_OPEN ? " (admin open: no password set)" : " (admin off: set ADMIN_PASSWORD)"}`));
