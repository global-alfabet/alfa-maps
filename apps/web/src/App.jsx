import { useEffect, useState } from "react";
import ScrollStory from "./components/ScrollStory.jsx";
import { Logo } from "./components/Brand.jsx";
import { Intro, HowItWorks, Features, Audiences, Integrate, Packages, Faq, Contact } from "./components/Sections.jsx";
import { SITE } from "./config.js";

export default function App() {
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 4.2);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <>
      <a className="skip" href="#why">
        Skip the animation
      </a>
      <header className={`nav${solid ? " is-solid" : ""}`}>
        <div className="nav-in">
          <a href="#top" aria-label="Alfa Maps home">
            <Logo />
          </a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#packages">Packages</a>
            <a href="#faq">FAQ</a>
            {SITE.demoUrl && <a href={SITE.demoUrl}>Demo</a>}
          </nav>
          <a className="btn primary sm" href="#contact">
            Book a demo
          </a>
        </div>
      </header>
      <main id="top">
        <ScrollStory />
        <Intro />
        <HowItWorks />
        <Features />
        <Audiences />
        <Integrate />
        <Packages />
        <Faq />
        <Contact />
      </main>
      <footer className="foot">
        <div className="wrap foot-in">
          <Logo />
          <p>
            {SITE.name} is a{" "}
            <a href={SITE.parent.url} target="_blank" rel="noopener noreferrer">
              {SITE.parent.name}
            </a>{" "}
            product. © {new Date().getFullYear()}
          </p>
          <p className="muted">3D homes shown are concept illustrations.</p>
        </div>
      </footer>
    </>
  );
}
