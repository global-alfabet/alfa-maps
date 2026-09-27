# Setting up EstateMaps on your computer

## 1. Install once
- Git — https://git-scm.com
- Node.js 20 LTS — https://nodejs.org
- Docker Desktop — https://www.docker.com/products/docker-desktop
- GitHub CLI (`gh`) — https://cli.github.com  (then run `gh auth login`)
- Claude Code — https://docs.claude.com/en/docs/claude-code (then run `claude` once to sign in)

## 2. First-time setup
Unzip this folder where you keep your projects, open a terminal in it, and run:

**Mac / Linux**
```bash
./scripts/setup.sh                 # installs, checks, makes the first git commit
./scripts/setup.sh --github        # same, and also creates a private GitHub repo and pushes
```
**Windows (PowerShell)**
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -GitHub
```
The GitHub step creates `estatemaps` under your account. To create it under an organisation instead:
`GITHUB_OWNER=global-alfabet ./scripts/setup.sh --github` (or `-Owner global-alfabet` on Windows).

## 3. Run it
```bash
npm run dev                        # http://localhost:5173 with live reload
docker compose up -d --build       # production build at http://localhost:8081
```

## 4. Work with Claude Code
Open a terminal in the project folder and run `claude`. It reads `CLAUDE.md` automatically.
Useful slash commands in this project:
- `/check` — lint and build, fixing problems
- `/ship <what changed>` — check, commit and push
- `/preview` — run the production build in Docker

Example requests:
- "Add a testimonials section after Packages, using the brand tokens."
- "Put our WhatsApp number +263… in config.js and show a WhatsApp button in the contact section."
- "Make the 3D hero lighter on phones: turn off shadows below 700px width."

## 5. Put the website online (Netlify)
1. Push to GitHub (step 2 with `--github`, or `/ship`).
2. In Netlify: **Add new site → Import from Git →** choose the repo. Netlify reads `netlify.toml`, so no settings needed.
3. **Domain settings → Add domain →** `estatemaps.app`, then point the domain's DNS to Netlify as it instructs.
4. Contact form submissions appear in Netlify under **Forms** (turn on email notifications there).
Every push to `main` now redeploys the site.

## 6. Phase 2 — the platform
When the website is live, start the platform in Claude Code with:

> Read docs/ROADMAP.md. Build step 1 and step 2 of "Order of work": move the 3D engine into packages/engine, add
> apps/api (Express, plain JS, Postgres with Prisma), apps/app (React + Vite, plain JS), Postgres and Caddy to
> docker-compose with *.estatemaps.localhost routing, then auth with companies, developments and roles, seeded with
> a super admin and one demo company. Run everything with docker compose and make sure `npm run check` passes.
> Work on a branch called platform and commit as you go.

Then continue step by step through the roadmap.
