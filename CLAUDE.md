# EstateMaps — project guide for Claude Code

EstateMaps (estatemaps.app) is a Global Alfabet product: a 3D sales platform for property developers.
Developers send a surveyor's layout plan and a stand list; we turn it into an interactive 3D estate that buyers
explore on their phone (views, house designer, prices and payment plans, PDF stand packs).
Focus: land/stands, houses and cluster homes. Main market: Zimbabwe and the diaspora.

## Repo layout
```
apps/web/        Marketing website (estatemaps.app). React 18 + Vite, plain JavaScript (JSX), ESLint, three.js.
  src/components/  ScrollStory.jsx (3D scroll hero), Sections.jsx (page sections), Brand.jsx (logo)
  src/engine/      three.js engine: storyScene.js (hero scene), house.js (parametric houses), builder.js, materials.js, util.js
  src/data/        demo-estate.json (fictional estate from tools/make_demo_estate.py), presets.js (house types)
  src/config.js    Contact email, WhatsApp, demo URL — edit here, not in components
  src/styles/site.css  All styles and brand tokens
apps/platform/   The multi-company platform (API + admin + viewer). Not built yet — spec in docs/ROADMAP.md.
tools/make_demo_estate.py  Regenerates the fictional demo estate. Never use a real client's plan on the website.
tools/plan-import/  Python: turns a plan PDF + stand sheet into stand polygons (used by the platform later).
docs/            INSTRUCTIONS.md (setup), ROADMAP.md (platform spec), BRAND.md (brand rules)
scripts/         setup.sh / setup.ps1 (first-time setup)
.claude/commands/  Slash commands: /check, /ship, /preview
```

## Commands (run from repo root)
- `npm run setup` — install website dependencies
- `npm run dev` — website with live reload at http://localhost:5173
- `npm run lint` / `npm run build` / `npm run check` (both)
- `docker compose up -d --build` — production build served by nginx at http://localhost:8081
- `docker compose --profile dev up` — dev server inside Docker

## Rules
- Plain JavaScript for now (no TypeScript). ES modules, function components, hooks.
- `npm run check` must pass (ESLint clean + Vite build) before any commit.
- Keep the site fast: three.js is lazy-loaded by ScrollStory; do not import it from other components.
- Brand tokens live at the top of `site.css` (see docs/BRAND.md). Use them; don't hard-code new colours.
- Copy: plain, specific, short sentences. Say "stands", "houses", "cluster homes". No lorem ipsum.
- Never commit secrets. Use `.env` files (git-ignored) and document variables in `.env.example`.
- Commit messages: conventional style, e.g. `feat(web): add pricing FAQ`, `fix(engine): garage door offset`.
- Work on a branch for anything big; `main` deploys the website to Netlify automatically.
- When changing the 3D hero, check it at desktop (1440×900) and phone (390×844) widths.

## Deployment
- Website: Netlify builds `apps/web` on every push to `main` (see netlify.toml). Domain: estatemaps.app.
- Platform (later): Docker image on Render/Railway or a VPS; app.estatemaps.app and <company>.estatemaps.app.
