# Setting up Alfa Maps on your computer

## 1. Install once
- Git: https://git-scm.com
- Node.js 22 LTS: https://nodejs.org
- Docker Desktop: https://www.docker.com/products/docker-desktop
- GitHub CLI (`gh`): https://cli.github.com (then run `gh auth login`)
- Claude Code: https://docs.claude.com/en/docs/claude-code (then run `claude` once to sign in)

## 2. Get the code
```bash
gh repo clone global-alfabet/alfa-maps
cd alfa-maps
./scripts/setup.sh                 # Mac / Linux: installs, checks, creates .env
```
```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup.ps1   # Windows
```

## 3. Run it
```bash
npm run dev                        # website with live reload: http://localhost:5173
npm run dev:app                    # 3D estate app: http://localhost:5174 (its API runs on 8080)
docker compose up -d --build       # production builds: website http://localhost:8081, app http://localhost:8080
```
In the app, **Admin** (top right) lets you change plot status, prices, payment plans and the house on each plot.
Without `ADMIN_PASSWORD` admin is open on your computer; in production it is off until you set one.

### Running a client's estate
1. Put the client's `estate.json` (plots from plan-import) and `settings.json` (name, prices, contacts) in
   `estates/<client>/`. That folder is ignored by git; client files never go in the repo.
2. `SEED_DIR=estates/<client> npm run dev:app`, or set `ESTATE_DIR=./estates/<client>` in `.env` and run
   `docker compose up -d --build app`.
3. The first time it starts, the app copies the seed into a working copy (`apps/app/data/<client>/`, or `/data` in
   Docker) and saves admin changes there. **Admin → Data → Reset to original data** starts again from the seed.

## 4. Work with Claude Code
Open a terminal in the project folder and run `claude`. It reads `CLAUDE.md` automatically.
Useful slash commands in this project:
- `/check`: lint and build, fixing problems
- `/ship <what changed>`: check, commit and push
- `/preview`: run the production builds in Docker

Example requests:
- "Add a testimonials section after Packages, using the brand tokens."
- "Show a WhatsApp button in the contact section, using the number in config.js."
- "Make the 3D hero lighter on phones: turn off shadows below 700px width."

## 5. Put the website online (Netlify)
1. In Netlify: **Add new site → Import from Git →** choose `global-alfabet/alfa-maps`. Netlify reads `netlify.toml`
   (it builds from the repo root and publishes `apps/web/dist`), so leave the build settings empty.
2. **Domain settings → Add domain →** `maps.globalalfabet.com`, then add the DNS record Netlify shows you.
3. Contact form submissions appear in Netlify under **Forms** (turn on email notifications there).
Every merge to `main` redeploys the site.

## 6. Put the app online
Any host that runs a Dockerfile works (Render, Railway, Fly.io or a VPS):
- Build from the repo root with `apps/app/Dockerfile`.
- Add a persistent volume at `/data` and set `ADMIN_PASSWORD`.
- For a client's estate, mount their folder and set `SEED_DIR` to it.

## 7. Next: the platform
The plan for the multi-company platform is in `docs/ROADMAP.md`. Start the next step in Claude Code with:

> Read docs/ROADMAP.md and CLAUDE.md. Build step 2 of "Order of work": add apps/api (Express, plain JS, Postgres),
> Postgres and Caddy to docker-compose with *.maps.localhost routing, then auth with companies, developments and
> roles, seeded with a super admin and one demo company. Keep `npm run check` passing. Work on a branch and open a
> pull request.
