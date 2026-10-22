import { useState } from "react";
import { api, adminToken } from "../lib/api.js";

export default function LoginModal({ onClose, onOk }) {
  const [pw, setPw] = useState(""); const [err, setErr] = useState("");
  const submit = async (e) => { e.preventDefault(); try { const r = await api.login(pw); adminToken.set(r.token); onOk(); } catch (x) { setErr(x.status === 401 ? "That password isn't right." : x.message); } };
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="lg-t" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal-card" onSubmit={submit}>
        <h2 id="lg-t">Admin sign-in</h2>
        <p className="note">Enter the admin password set when the site was started.</p>
        <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} aria-label="Admin password" autoComplete="current-password" />
        {err && <p className="err">{err}</p>}
        <div className="row-end"><button type="button" className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary">Sign in</button></div>
      </form>
    </div>
  );
}
