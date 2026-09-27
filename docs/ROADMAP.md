# EstateMaps platform — specification (Phase 2)

This is the brief for building the multi-company platform. Build it in `apps/` as new services and add them to
`docker-compose.yml`. The working prototype this is based on (single estate, Express + React + three.js) lives
in `apps/web`; its engine is in `apps/web/src/engine` and should move to a shared package.

## Addresses
| Address | What |
|---|---|
| `estatemaps.app` | Marketing website (`apps/web`, Netlify) |
| `app.estatemaps.app` | Sign-in and admin panels (super admin + company admins) |
| `<company>.estatemaps.app/<development>` | Public 3D site for one development, e.g. `westprop.estatemaps.app/pomona` |
| `api.estatemaps.app/v1` | API (used by our apps now; opened to companies later with API keys) |
| Custom domains | Optional per company, e.g. `3d.westprop.com` (CNAME to us) |

Locally, `*.localhost` works in browsers with no setup: `app.estatemaps.localhost`, `westprop.estatemaps.localhost`.
Use Caddy (or Traefik) in docker-compose as the local reverse proxy that routes by host name.

## Services
```
apps/api        Node 20 + Express, plain JS. Postgres via Prisma (or Knex). Zod for request validation.
apps/app        React + Vite (plain JS): admin panels and the public 3D viewer (routes by host name).
packages/engine three.js engine shared by apps/app and apps/web.
tools/plan-import  Python (FastAPI or a CLI in its own container): plan PDF + sheet → stands JSON.
db              Postgres 16
storage         Uploaded logos, plans, stand-pack PDFs. Local: a Docker volume or MinIO. Online: S3/Cloudflare R2.
```

## Accounts and roles
- **Super admin** (us): create companies, create developments, run plan import, invite company users, see everything.
- **Company admin**: edit their company branding (logo, colours, contacts, WhatsApp), their developments' stands
  (status, price, notes), pricing tiers and payment plans, default houses, and invite their staff.
- **Company staff**: update stand status and prices only.
- **Buyers**: no account. Public viewer; optional contact form creates a lead.

Auth: email + password with argon2 hashing, http-only secure session cookies (express-session + Postgres store),
password reset by email, and optional magic-link sign-in later. Every query is scoped by `company_id`.

## Data model (first version)
```
companies(id, slug, name, logo_url, brand_color, contact jsonb, custom_domain, created_at)
users(id, email, password_hash, name, created_at)
memberships(user_id, company_id, role: 'owner'|'admin'|'staff')
super_admins(user_id)
developments(id, company_id, slug, name, location, status: draft|live|archived, settings jsonb (pricing, look), created_at)
stands(id, development_id, number, size_m2, status: available|reserved|sold|hidden, price, seller, note,
       polygon jsonb, edges jsonb, house jsonb, updated_at)
open_spaces(id, development_id, polygon jsonb, kind)
uploads(id, company_id, development_id, kind: plan|sheet|logo|image, url, created_at)
leads(id, development_id, stand_number, name, phone, email, message, design jsonb, created_at)
audit_log(id, company_id, user_id, action, detail jsonb, created_at)
api_keys(id, company_id, key_hash, label, created_at, last_used_at)   -- later
```

## Admin panel features
- Super admin: companies list → company → developments → "New development" (upload plan PDF + sheet → run
  plan-import → review traced stands on the plan → publish). Copy the public link and embed code.
- Company admin: branding page (logo upload, colour, contacts), developments list, stand table with bulk status
  changes, pricing & payment plans, estate look (trees, default houses), leads inbox with CSV export.
- Everything the prototype admin already does (stand status, prices, house presets) moves here, scoped per company.

## Public viewer
- Same as the prototype: whole estate, estate map, street/aerial/garden/site plan, free roam, 8 house types with
  options, drag-and-drop, prices and payments, PDF stand pack, WhatsApp enquiry.
- Company logo and colours in the header. Deep link to a stand: `/<development>?stand=145`.
- Embeddable: `?embed=1` hides the page chrome for iframes.

## Integration with company websites
1. Link/button: "Explore in 3D" → `https://<company>.estatemaps.app/<development>`
2. Embed: `<iframe src="https://<company>.estatemaps.app/<development>?embed=1" ...>`
3. Custom domain: company adds a CNAME; we issue HTTPS automatically (Caddy on-demand TLS or host feature).

## Order of work
1. Monorepo: move engine to `packages/engine`; add `apps/api`, `apps/app`, Postgres, Caddy to docker-compose.
2. Auth + companies + developments + roles, with seed data (Global Alfabet super admin, one demo company).
3. Import the fictional demo estate (`apps/web/src/data/demo-estate.json`) as a demo development.
4. Public viewer by host name + development slug; branding from the company record.
5. Admin panels (company branding, stands, pricing, leads).
6. Plan-import service wired to "New development".
7. Deploy: Render/Railway (or VPS) with managed Postgres, R2 storage, wildcard DNS `*.estatemaps.app`.
