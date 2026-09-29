import { useEffect, useRef, useState } from "react";
import demo from "../data/demo-estate.json";

// Callouts that look like tooltips pinned to the 3D scene. [from, to] is the scroll window they show in.
const CALLOUTS = [
  { id: "plan", anchor: "plan", from: 0.0, to: 0.13, title: "Starts with your layout plan", body: "The surveyor's general plan you already have." },
  { id: "trace", anchor: "trace", from: 0.02, to: 0.13, title: "Every plot traced", body: "Outlines, sizes and numbers read straight from the plan." },
  { id: "sizes", anchor: "sizes", from: 0.24, to: 0.4, title: "True to scale", body: "Real plot sizes, frontages and boundaries." },
  { id: "roads", anchor: "roads", from: 0.26, to: 0.4, title: "Roads, parks & open space", body: "The whole layout, not just one plot." },
  { id: "homes", anchor: "homes", from: 0.5, to: 0.7, title: "Homes on every plot", body: "Single, double and triple storey, so buyers see the finished estate." },
  { id: "forsale", anchor: "forsale", from: 0.53, to: 0.7, title: "Available plots marked", body: "Sold and reserved plots update from your admin panel." },
  { id: "house", anchor: "house", from: 0.8, to: 1.2, title: "Design the house", body: "Swap house types, storeys, garages, pools and colours." },
  { id: "price", anchor: "price", from: 0.84, to: 1.2, title: "Price & payment plans", body: "Cash, instalments and mortgage, worked out per plot." },
  { id: "pool", anchor: "pool", from: 0.88, to: 1.2, title: "Street, aerial & garden views", body: "Plus a site plan and a PDF plot pack." },
];

const STEPS = [
  { n: "01", from: 0, title: "Your plan", body: "Send us the surveyor's layout plan and your plot list." },
  { n: "02", from: 0.2, title: "Your estate, in 3D", body: "Every plot, road and park, built to scale." },
  { n: "03", from: 0.44, title: "Built out", body: "Homes, walls and gardens appear, so buyers can picture the finished estate." },
  { n: "04", from: 0.74, title: "Their future home", body: "Buyers pick a plot, design the house and see the price, on their phone." },
];

const fadeIn = (p, a, b) => Math.max(0, Math.min(1, Math.min((p - a) / 0.04, (b - p) / 0.04)));

// Works out which callouts are on screen and lifts a card higher when it would overlap one already placed.
function placeCallouts(list, pts, p, w) {
  const narrow = w < 900;
  const cw = narrow ? 190 : 236;
  const ch = narrow ? 48 : 96;
  const placed = [];
  const out = [];
  for (const c of list) {
    const pt = pts[c.anchor];
    const o = fadeIn(p, c.from, c.to);
    if (!pt || pt.behind || o <= 0) continue;
    if (pt.x < 8 || pt.x > w - 8 || pt.y < 70) continue;
    const flip = pt.x > w - 260;
    const x0 = flip ? pt.x + 7 - cw : pt.x - 7;
    let lift = 0;
    for (let tries = 0; tries < 4; tries++) {
      const y1 = pt.y - 43 - lift;
      const hit = placed.find((r) => x0 < r.x1 && x0 + cw > r.x0 && y1 - ch < r.y1 && y1 > r.y0);
      if (!hit) break;
      lift += y1 - hit.y0 + 10;
    }
    if (o > 0.15) placed.push({ x0, x1: x0 + cw, y0: pt.y - 43 - lift - ch, y1: pt.y - 43 - lift });
    out.push({ c, pt, o, flip, lift });
  }
  return out;
}

export default function ScrollStory() {
  const section = useRef(null);
  const stage = useRef(null);
  const sceneRef = useRef(null);
  const [p, setP] = useState(0);
  const [pts, setPts] = useState({});
  const [failed, setFailed] = useState(false); // when WebGL is unavailable the copy still reads on the navy background

  useEffect(() => {
    let scene;
    let off = () => {};
    let cancelled = false;
    import("../engine/storyScene.js")
      .then(({ StoryScene }) => {
        if (cancelled) return;
        try {
          scene = new StoryScene(stage.current, demo);
        } catch {
          setFailed(true);
          return;
        }
        sceneRef.current = scene;
        off = scene.onFrame(() => {
          const out = {};
          for (const [k, v] of Object.entries(scene.anchors)) out[k] = scene.project(v);
          setPts(out);
        });
        scene.setProgress(0.0001);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      off();
      scene && scene.dispose();
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = Math.max(0, Math.min(1, -r.top / (total || 1)));
      setP(v);
      sceneRef.current && sceneRef.current.setProgress(v);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const step = [...STEPS].reverse().find((s) => p >= s.from) || STEPS[0];
  const dark = p < 0.28;

  return (
    <section className={`story${dark || failed ? " is-dark" : ""}`} ref={section} aria-label="How EstateMaps turns a plan into a 3D estate">
      <div className="story-stage">
        <div className="story-canvas" ref={stage} aria-hidden="true" />

        <div className="story-copy">
          <p className="eyebrow">EstateMaps · 3D sales platform for property developers</p>
          <h1 className={p > 0.06 ? "is-small" : ""}>
            See the estate
            <br />
            before it's built.
          </h1>
          <ol className="steps" aria-label="Steps">
            {STEPS.map((s) => (
              <li key={s.n} className={s === step ? "is-on" : ""} aria-current={s === step ? "step" : undefined}>
                <span className="n">{s.n}</span>
                <span className="t">
                  <b>{s.title}</b>
                  <span>{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="callouts" aria-hidden="true">
          {placeCallouts(CALLOUTS, pts, p, stage.current ? stage.current.clientWidth : 1200).map(({ c, pt, o, flip, lift }) => (
            <div
              key={c.id}
              className={`callout${flip ? " flip" : ""}`}
              style={{ left: pt.x, top: pt.y, opacity: o, "--lift": `${lift}px` }}
            >
              <span className="pin" />
              <div className="card">
                <b>{c.title}</b>
                <span>{c.body}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${p})` }} />
        </div>
        <p className="scroll-hint" style={{ opacity: 1 - Math.min(1, p * 12) }}>
          Scroll to build the estate
        </p>
      </div>
    </section>
  );
}
