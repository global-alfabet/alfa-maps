# EstateMaps

**See the estate before it's built.** A 3D sales platform for property developers, by [Global Alfabet](https://globalalfabet.com).

- `apps/web` — the marketing website at estatemaps.app (React + Vite, three.js scroll story)
- `apps/platform` — the multi-company platform (next phase, see `docs/ROADMAP.md`)
- `tools/plan-import` — turns surveyor plans into 3D-ready stand data

Getting started: see [`docs/INSTRUCTIONS.md`](docs/INSTRUCTIONS.md). Working with Claude Code: [`CLAUDE.md`](CLAUDE.md).

```bash
./scripts/setup.sh        # or scripts\setup.ps1 on Windows
npm run dev               # http://localhost:5173
docker compose up -d --build   # http://localhost:8081
```
