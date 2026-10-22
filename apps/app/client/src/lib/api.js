const KEY = "alfa_maps_admin_token";
export const adminToken = { get: () => { try { return sessionStorage.getItem(KEY) || ""; } catch { return ""; } }, set: (v) => { try { sessionStorage.setItem(KEY, v); } catch { /* storage blocked: nothing to save */ } } };

async function req(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", "x-admin-token": adminToken.get(), ...(opts.headers || {}) } });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(body.error || `Request failed (${r.status})`), { status: r.status });
  return body;
}
export const api = {
  load: () => req("/api/estate"),
  config: () => req("/api/config"),
  login: (password) => req("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  save: (data) => req("/api/estate", { method: "PUT", body: JSON.stringify(data) }),
  reset: () => req("/api/estate/reset", { method: "POST" }),
};

const DKEY = "alfa_maps_my_designs";
export const myDesigns = {
  load: () => { try { return JSON.parse(localStorage.getItem(DKEY) || "{}"); } catch { return {}; } },
  save: (obj) => { try { localStorage.setItem(DKEY, JSON.stringify(obj)); } catch { /* storage blocked: nothing to save */ } },
};
