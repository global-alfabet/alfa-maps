import { useState } from "react";
import { SITE } from "../config.js";

const Icon = ({ d }) => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);
const I = {
  map: ["M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z", "M9 4v14", "M15 6v14"],
  house: ["M3 11l9-7 9 7", "M5 10v10h14V10", "M10 20v-6h4v6"],
  price: ["M12 3v18", "M16 7H10a3 3 0 000 6h4a3 3 0 010 6H7"],
  pdf: ["M6 3h9l4 4v14H6z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  admin: ["M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z", "M9 12l2 2 4-4"],
  phone: ["M7 3h10v18H7z", "M11 18h2"],
  link: ["M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1", "M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"],
  frame: ["M3 5h18v14H3z", "M3 9h18"],
  globe: ["M12 3a9 9 0 100 18 9 9 0 000-18z", "M3 12h18", "M12 3c3 3 3 15 0 18", "M12 3c-3 3-3 15 0 18"],
};

export function Intro() {
  return (
    <section className="intro wrap" id="why">
      <p className="eyebrow">Why Alfa Maps</p>
      <h2>Buyers don't buy technical drawings. They buy the life they can picture.</h2>
      <div className="intro-cols">
        <p>
          Most developments are sold from a black-and-white layout plan and a spreadsheet of plot numbers. That works
          for surveyors. It doesn't help a family in Harare, or a buyer in London or Johannesburg who can't visit the
          site, imagine where their home will stand.
        </p>
        <p>
          Alfa Maps turns the plan you already have into a 3D estate buyers can explore on their phone. They see every
          plot to scale, try a house on the one they like, and understand the price and payments before they call your
          sales team.
        </p>
      </div>
      {SITE.demoUrl && (
        <div className="cta-row">
          <a className="btn primary" href={SITE.demoUrl}>
            Try the demo estate
          </a>
          <span className="muted">A fictional estate with 170 plots. Works on your phone.</span>
        </div>
      )}
    </section>
  );
}

const HOW = [
  { t: "Send your plans", b: "Share the surveyor's layout plan (PDF from CAD) and your plot or unit list with sizes and prices." },
  { t: "We build your estate", b: "Every plot is traced, measured and turned into a branded 3D site for your development, usually within a week." },
  { t: "Share and sell", b: "Put the link on your website, WhatsApp and adverts. Your team marks plots sold or reserved in seconds." },
];
export function HowItWorks() {
  return (
    <section className="how" id="how">
      <div className="wrap">
        <p className="eyebrow">How it works</p>
        <h2>From layout plan to live 3D estate in three steps.</h2>
        <ol className="how-steps">
          {HOW.map((s, i) => (
            <li key={s.t}>
              <span className="how-n">{String(i + 1).padStart(2, "0")}</span>
              <h3>{s.t}</h3>
              <p>{s.b}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const FEATURES = [
  { i: I.map, t: "The whole estate in 3D", b: "Fly over every plot, road and park. Whole estate, estate map, street, aerial, garden and free-roam views." },
  { i: I.house, t: "House designer", b: "Buyers swap between house types and change storeys, garage size, pool, roof and colours. The house always fits the plot." },
  { i: I.price, t: "Prices & payment plans", b: "Cash prices and monthly instalment or mortgage payments, worked out from your own rates and terms." },
  { i: I.pdf, t: "Plot packs", b: "A branded PDF with views of the plot, the site plan with boundary lengths, and the payment options." },
  { i: I.admin, t: "Your admin panel", b: "Mark plots sold or reserved, change prices, set the house shown on each plot and update your contact details." },
  { i: I.phone, t: "Made for phones", b: "Runs in the browser, no app to install. Share a link to one plot straight into a WhatsApp chat." },
];
export function Features() {
  return (
    <section className="features wrap" id="features">
      <p className="eyebrow">What's included</p>
      <h2>Everything a buyer needs to say yes.</h2>
      <div className="feature-grid">
        {FEATURES.map((f) => (
          <article key={f.t} className="feature">
            <span className="ficon">
              <Icon d={f.i} />
            </span>
            <h3>{f.t}</h3>
            <p>{f.b}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function Audiences() {
  return (
    <section className="aud" id="who">
      <div className="wrap aud-grid">
        <div className="aud-col">
          <p className="eyebrow">For developers</p>
          <h2>Sell faster, with fewer site visits.</h2>
          <ul className="ticks">
            <li>Reach buyers living abroad who can't walk the site</li>
            <li>Stand out from developments sold off a PDF</li>
            <li>Keep availability and prices up to date yourself</li>
            <li>Every new phase added from the same plans</li>
          </ul>
        </div>
        <div className="aud-col">
          <p className="eyebrow">For buyers</p>
          <h2>Know exactly what you're buying.</h2>
          <ul className="ticks">
            <li>See the plot's size, frontage and neighbours</li>
            <li>Picture your own home on it, then change it</li>
            <li>Understand the deposit and monthly payments</li>
            <li>Share it with family before you decide</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

const WAYS = [
  { i: I.link, t: "A link or button", b: "Add an “Explore in 3D” button to your development page, adverts and WhatsApp messages." },
  { i: I.frame, t: "Inside your website", b: "Embed the 3D estate directly on your own page with one line of code." },
  { i: I.globe, t: "Your own address", b: "Use your own web address, such as 3d.yourcompany.com, with your branding throughout." },
];
export function Integrate() {
  return (
    <section className="ways wrap" id="integrate">
      <p className="eyebrow">Works with your website</p>
      <h2>Your brand, your address, your buyers.</h2>
      <div className="ways-grid">
        {WAYS.map((w) => (
          <article key={w.t} className="way">
            <span className="ficon">
              <Icon d={w.i} />
            </span>
            <h3>{w.t}</h3>
            <p>{w.b}</p>
          </article>
        ))}
      </div>
      <pre className="snippet" aria-label="Example button code">
        <code>{`<a href="https://yourcompany.maps.globalalfabet.com/phase-2">Explore Phase 2 in 3D</a>`}</code>
      </pre>
    </section>
  );
}

const PLANS = [
  { t: "Pilot", s: "Try it on one development", items: ["One development in 3D", "Your branding and contacts", "Admin panel for your team", "Launch support"] },
  { t: "Development", s: "For each live development", items: ["Everything in Pilot", "Plot packs (PDF)", "Updates to plots and prices", "Link, button or embed"], featured: true },
  { t: "Portfolio", s: "For developers with several estates", items: ["All your developments", "Your own web address", "Photo-style renders and fly-through video", "Priority support"] },
];
export function Packages() {
  return (
    <section className="plans" id="packages">
      <div className="wrap">
        <p className="eyebrow">Packages</p>
        <h2>A one-off setup per development, then a simple monthly fee.</h2>
        <div className="plan-grid">
          {PLANS.map((p) => (
            <article key={p.t} className={`plan${p.featured ? " is-featured" : ""}`}>
              {p.featured && <span className="badge">Most popular</span>}
              <h3>{p.t}</h3>
              <p className="plan-s">{p.s}</p>
              <ul className="ticks">
                {p.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
              <a className="btn" href="#contact">
                Ask for pricing
              </a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
  ["What do you need from us?", "The surveyor's general or layout plan as a PDF exported from CAD, and a list of plots or units with sizes, prices and status. Your logo and brand colours if you'd like them used."],
  ["How long does it take?", "Most developments are ready within a week of receiving the plans. Changes to prices and availability are instant from your admin panel."],
  ["Do buyers need to install anything?", "No. It runs in the browser on phones, tablets and computers. You share a normal web link."],
  ["Are the houses real designs?", "They're concept homes to help buyers picture the finished estate. If you have your own house plans, we can add them as house types."],
  ["Can it handle townhouses and houses, not just plots?", "Yes. Plots, houses and townhouse developments are our focus. Talk to us about apartment blocks."],
  ["Who owns the data?", "Your plans, prices and buyer information stay yours. Alfa Maps provides the software and hosting as a service."],
];
export function Faq() {
  return (
    <section className="faq wrap" id="faq">
      <p className="eyebrow">Questions</p>
      <h2>Good to know</h2>
      <div className="faq-list">
        {FAQ.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Contact() {
  const [state, setState] = useState("idle");
  const submit = async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const body = new URLSearchParams(new FormData(form)).toString();
    setState("sending");
    try {
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
      if (!r.ok) throw new Error();
      setState("sent");
      form.reset();
    } catch {
      setState("error");
    }
  };
  return (
    <section className="contact" id="contact">
      <div className="wrap contact-grid">
        <div>
          <p className="eyebrow">Book a demo</p>
          <h2>See your own development in 3D.</h2>
          <p className="lede">
            Tell us about your development and we'll show you a live demo. Send us a plan and we can show it to you as a
            3D estate.
          </p>
          {SITE.demoUrl && (
            <p className="direct">
              Want a look first? <a href={SITE.demoUrl}>Try the demo estate</a>.
            </p>
          )}
          <p className="direct">
            Or email <span className="sel">{SITE.email}</span>
            {SITE.whatsapp && (
              <>
                {" "}
                · WhatsApp <span className="sel">{SITE.whatsapp}</span>
              </>
            )}
          </p>
        </div>
        <form name="contact" method="POST" data-netlify="true" onSubmit={submit} className="form">
          <input type="hidden" name="form-name" value="contact" />
          <p hidden>
            <label>
              Leave empty <input name="company-website" />
            </label>
          </p>
          <label>
            Your name
            <input id="c-name" name="name" required autoComplete="name" />
          </label>
          <label>
            Company
            <input id="c-company" name="company" autoComplete="organization" />
          </label>
          <label>
            Email
            <input id="c-email" name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Phone or WhatsApp
            <input id="c-phone" name="phone" autoComplete="tel" />
          </label>
          <label className="wide">
            About your development
            <textarea id="c-msg" name="message" rows="4" placeholder="Location, number of plots or units, stage of sales…" />
          </label>
          <button className="btn primary wide" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Request a demo"}
          </button>
          {state === "sent" && <p className="wide ok">Thanks. We'll be in touch within one working day.</p>}
          {state === "error" && (
            <p className="wide err">
              That didn't send. Please email us at <span className="sel">{SITE.email}</span>.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
