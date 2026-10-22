# Alfa Maps

**See the estate before it's built.** A 3D sales platform for property developers, by [Global Alfabet](https://www.globalalfabet.com).

| Folder | What it is |
| --- | --- |
| `apps/web` | The marketing website at maps.globalalfabet.com (React + Vite, three.js scroll story). Deploys to Netlify. |
| `apps/app` | The 3D estate app buyers use: every plot in 3D, house designer, prices and payment plans, PDF plot packs, admin view. React + Vite with a small Express server. Runs one estate per container. |
| `packages/engine` | The three.js engine both apps share: plots, parametric houses, the estate scene. |
| `tools/` | Python: `make_demo_estate.py` (the fictional demo estate) and `plan-import/` (plan PDF + plot list → plot polygons). |

The multi-company platform (sign-in, company admin, many developments) grows out of `apps/app`. The plan is in
[`docs/ROADMAP.md`](docs/ROADMAP.md).

## Run it
```bash
npm ci                       # once: installs everything (npm workspaces)
npm run dev                  # website   → http://localhost:5173
npm run dev:app              # 3D app    → http://localhost:5174 (API on 8080)
npm run dev:demo             # the app as a browser-only demo, as served at maps.globalalfabet.com/demo/
npm run check                # lint + build everything; must pass before a commit
docker compose up -d --build # website → http://localhost:8081, app → http://localhost:8080
```

The website serves a browser-only build of the app at `/demo/` (`npm run build:site`): the fictional estate with
no server, where admin changes stay in the visitor's browser.

The app starts with the fictional demo estate in `apps/app/seed`. Client plans, plot lists and estate data never go
in git: keep them in `estates/<client>/` (ignored) and point the app at that folder with `SEED_DIR` (or `ESTATE_DIR`
in `.env` for Docker).

Setup on a new computer: [`docs/INSTRUCTIONS.md`](docs/INSTRUCTIONS.md). Working with Claude Code: [`CLAUDE.md`](CLAUDE.md).
Brand: [`docs/BRAND.md`](docs/BRAND.md).
