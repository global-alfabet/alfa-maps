import { payments, money } from "../lib/pricing.js";
import { words } from "../lib/words.js";

export default function EstateIntro({ settings, stands, mode }) {
  const sale = stands.filter((s) => s.status === "available");
  const sizes = sale.map((s) => s.size); const prices = sale.map((s) => payments(s, settings.pricing).cash);
  const c = settings.contact || {};
  const w = words(settings);
  if (mode === "admin") return (
    <aside className="panel intro">
      <div className="eyebrow">Admin</div><h2>Manage the estate</h2>
      <p>Everything you change here is what visitors see after you press <b>Save changes</b>.</p>
      <ul className="bullets">
        <li><b>{w.Many}</b>: set each {w.one} as for sale, reserved or sold and pick its house.</li>
        <li>Click any {w.one} in 3D to edit its details and fine-tune its house.</li>
        <li><b>Houses</b>: fill the whole estate in one go, or show {w.many} for sale as vacant land.</li>
        <li><b>Pricing</b> and <b>Estate</b>: rates, payment plans, highlights and the sales contact.</li>
        <li>Switch to <b>Buyer view</b> at any time to see the site as a visitor does.</li>
      </ul>
    </aside>
  );
  return (
    <aside className="panel intro">
      <div className="eyebrow">{settings.location}</div>
      <h2>{settings.tagline || settings.estateName}</h2>
      {settings.about && <p>{settings.about}</p>}
      <div className="kpis">
        <div><b>{sale.length}</b><span>{w.many} for sale</span></div>
        <div><b>{sizes.length ? `${Math.round(Math.min(...sizes))}–${Math.round(Math.max(...sizes))}` : "–"}</b><span>m² {w.one} sizes</span></div>
        <div><b>{prices.length ? money(Math.min(...prices)) : "–"}</b><span>cash prices from</span></div>
      </div>
      {settings.features?.filter(Boolean).length > 0 && <ul className="bullets">{settings.features.filter(Boolean).map((f, i) => <li key={i}>{f}</li>)}</ul>}
      <div className="howto">
        <h3>How to explore</h3>
        <ol><li>Pick a {w.one} from the list or click one on the map. {w.Many} for sale have a green board.</li><li>Switch between Street, Aerial, Garden and Site plan views, or use Free roam.</li><li>Change the house: pick a house type, then storeys, garage, pool and more. Or drag a house type onto any {w.one}.</li><li>Download a {w.one} pack with the views, price and payment plans.</li></ol>
      </div>
      {(c.name || c.phone || c.email) && <div className="contact"><h3>Talk to us</h3>{c.name && <p>{c.name}</p>}{c.phone && <p>Phone: <span className="sel-text">{c.phone}</span></p>}{c.email && <p>Email: <span className="sel-text">{c.email}</span></p>}</div>}
      <p className="note">Houses shown are illustrations to help you picture the estate. Prices exclude VAT.</p>
    </aside>
  );
}
