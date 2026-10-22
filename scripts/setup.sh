#!/usr/bin/env bash
# Alfa Maps first-time setup (Mac/Linux).  Usage: ./scripts/setup.sh [--github]
set -euo pipefail
cd "$(dirname "$0")/.."
GITHUB=0; [ "${1:-}" = "--github" ] && GITHUB=1
ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$1"; }
need() { command -v "$1" >/dev/null 2>&1; }

echo "Alfa Maps setup"
need git  && ok "git $(git --version | awk '{print $3}')" || { echo "Install Git first: https://git-scm.com"; exit 1; }
need node && ok "node $(node -v)" || { echo "Install Node.js 22: https://nodejs.org"; exit 1; }
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 20 ] || warn "Node 22 recommended"
need docker && ok "docker found" || warn "Docker not found: needed for 'docker compose' (https://www.docker.com)"
need claude && ok "Claude Code found" || warn "Claude Code not found: https://docs.claude.com/en/docs/claude-code"

echo "Installing dependencies (website, app and 3D engine)…"
npm ci --no-audit --no-fund
echo "Checking everything (lint + build)…"
npm run check >/dev/null && ok "lint and build pass"

[ -f .env ] || { cp .env.example .env; ok "created .env from .env.example"; }

if [ ! -d .git ]; then
  git init -b main >/dev/null
  git add -A
  git commit -m "chore: initial Alfa Maps website and project setup" >/dev/null
  ok "git repository created with a first commit"
else
  ok "git repository already exists"
fi

if [ "$GITHUB" = "1" ]; then
  need gh || { echo "Install the GitHub CLI and run 'gh auth login': https://cli.github.com"; exit 1; }
  OWNER="${GITHUB_OWNER:-}"
  NAME="${OWNER:+$OWNER/}alfa-maps"
  if git remote get-url origin >/dev/null 2>&1; then
    git push -u origin main && ok "pushed to $(git remote get-url origin)"
  else
    gh repo create "$NAME" --private --source . --remote origin --push && ok "created private repo $NAME and pushed"
  fi
fi

echo
echo "Done. Next:"
echo "  npm run dev                    → http://localhost:5173"
echo "  docker compose up -d --build   → http://localhost:8081"
echo "  claude                         → start Claude Code in this folder"
