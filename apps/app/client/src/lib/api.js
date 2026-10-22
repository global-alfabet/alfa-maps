const KEY = "alfa_maps_admin_token";
export const adminToken = { get: () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } }, set: (v) => { try { sessionStorage.setItem(KEY, v); } catch { /* storage blocked: nothing to save */ } } };

async function req(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", "x-admin-token": adminToken.get(), ...(opts.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || `Request failed (${r.status})`), { status: r.status });
  return body;
}
const serverApi = {
  load: () => req("/api/estate"),
  config: () => req("/api/config"),
  login: (password) => req("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  save: (data) => req("/api/estate", { method: "PUT", body: JSON.stringify(data) }),
  reset: () => req("/api/estate/reset", { method: "POST" }),
};

// The demo build (`vite build --mode demo`) runs with no server: it starts from the fictional estate in seed/ and
// keeps admin changes in this browser tab only.
export const isDemo = import.meta.env.MODE === "demo";
const DEMO_KEY = "alfa_maps_demo_estate";
async function demoSeed() {
  const [plan, settings] = await Promise.all([import("../../../seed/estate.json"), import("../../../seed/settings.json")]);
  return { settings: settings.default, stands: plan.default.stands, open: plan.default.open, houses: {}, updatedAt: null };
}
const demoApi = {
  load: async () => { try { const saved = sessionStorage.getItem(DEMO_KEY); if (saved) return JSON.parse(saved); } catch { /* storage blocked: use the seed */ } return demoSeed(); },
  config: async () => ({ passwordRequired: false, demo: true }),
  login: async () => ({ token: "" }),
  save: async (data) => { try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { /* storage blocked: changes last until reload */ } return { ok: true, updatedAt: new Date().toISOString() }; },
  reset: async () => { try { sessionStorage.removeItem(DEMO_KEY); } catch { /* storage blocked */ } return demoSeed(); },
};

export const api = isDemo ? demoApi : serverApi;

const DKEY = "alfa_maps_my_designs";
export const myDesigns = {
  load: () => { try { return JSON.parse(localStorage.getItem(DKEY) || "{}"); } catch { return {}; } },
  save: (obj) => { try { localStorage.setItem(DKEY, JSON.stringify(obj)); } catch { /* storage blocked: nothing to save */ } },
};
