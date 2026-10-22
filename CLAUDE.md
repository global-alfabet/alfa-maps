# Alfa Maps — project guide for Claude Code

Alfa Maps (maps.globalalfabet.com) is a Global Alfabet product: a 3D sales platform for property developers.
Developers send a surveyor's layout plan and a plot list; we turn it into an interactive 3D estate that buyers
explore on their phone (views, house designer, prices and payment plans, PDF plot packs).
Focus: plots, houses and townhouses. Main market: Zimbabwe and buyers living abroad.

## Repo layout (npm workspaces)
```
apps/web/          Marketing website (maps.globalalfabet.com). React 18 + Vite, plain JavaScript (JSX), three.js.
  src/components/    ScrollStory.jsx (3D scroll hero), Sections.jsx (page sections), Brand.jsx (logo)
  src/engine/        storyScene.js: the hero scene, built from @alfa-maps/engine
  src/data/          demo-estate.json (fictional estate from tools/make_demo_estate.py)
  src/config.js      Contact email, WhatsApp, demo URL: edit here, not in components
  src/styles/site.css  All styles and brand tokens
apps/app/          The 3D estate app. React + Vite client (client/), Express server (server/index.js) with a JSON
                   data file. One estate per running app. Starts from seed/ (the fictional demo estate).
  client/src/components/  Viewer, StandList, StandPanel, Designer, AdminPanel, HouseTray, EstateIntro, LoginModal
  client/src/lib/         api.js, pricing.js, pdf.js (plot packs), facts.js, words.js (the estate's word for a plot)
packages/engine/   Shared three.js engine: util, materials, builder, house, presets, defaults, estate (EstateScene).
                   Import as "@alfa-maps/engine/<file>". three is a peer dependency.
tools/make_demo_estate.py  Regenerates the fictional demo estate (website + app seed).
tools/plan-import/  Python: turns a plan PDF + plot list into plot polygons.
docs/              INSTRUCTIONS.md (setup), ROADMAP.md (platform plan), BRAND.md (brand rules)
.claude/commands/  Slash commands: /check, /ship, /preview
```

## Commands (run from the repo root)
- `npm ci`: install everything
- `npm run dev`: website with live reload at http://localhost:5173
- `npm run dev:app`: app at http://localhost:5174, API at http://localhost:8080 (admin is open when no password is set)
- `npm run lint` / `npm run build` / `npm run check` (both, for every workspace)
- `docker compose up -d --build`: website on http://localhost:8081, app on http://localhost:8080
- `docker compose --profile dev up`: website dev server inside Docker

## Rules
- Plain JavaScript (no TypeScript). ES modules, function components, hooks. One ESLint config at the root.
- `npm run check` must pass (ESLint clean + Vite builds) before any commit.
- Design language: the Global Alfabet ecosystem look, based on business.apple.com. White and #f5f5f7 sections, Inter,
  large confident headings, pill buttons, rounded 28px cards. Alfa Maps green is the one accent. Tokens are at
  the top of `apps/web/src/styles/site.css` and `apps/app/client/src/styles.css` (see docs/BRAND.md). Don't add new colours.
- Logos come from the brand kit (github.com/global-alfabet/brand). Don't redraw them here.
- Keep the website fast: three.js is lazy-loaded by ScrollStory; don't import it from other components.
- Engine code is shared. A change in `packages/engine` must work in both apps; check both.
- Buyer-facing words: say "plots", "houses", "townhouses" (not "stands" or "cluster homes"). In the app, use
  `words(settings)` so each estate can choose its word (an estate in Zimbabwe may say "stand"). Engine and data
  keep "stand" internally because the surveyed plans do.
- Client files never go in git: plan PDFs, plot lists, client estate.json/settings.json. Keep them in `estates/`
  (ignored) or outside the repo. Never use a real client's plan on the website or in seed data.
- The app needs `ADMIN_PASSWORD` in production; without it, admin editing is switched off.
- Copy: plain, specific, short sentences. No lorem ipsum. Only claim what the product does today.
- Never commit secrets. Use `.env` files (git-ignored) and document variables in `.env.example`.
- Work on a branch and open a pull request. Julius approves every merge; `main` deploys the website to Netlify.
- Commit messages: conventional style, e.g. `feat(web): add pricing FAQ`, `fix(engine): garage door offset`.
- Check layout at 1440×900 and 390×844. No horizontal scrolling on phones.

## Deployment
- Website: Netlify builds from the repo root on every push to `main` (see netlify.toml) and publishes `apps/web/dist`.
  Domain: maps.globalalfabet.com.
- App: Docker image (`apps/app/Dockerfile`, built from the repo root) on Render/Railway or a VPS, with a volume at
  `/data` and `ADMIN_PASSWORD` set. Later: app.maps.globalalfabet.com and <company>.maps.globalalfabet.com.
