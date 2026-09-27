# EstateMaps first-time setup (Windows PowerShell)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 [-GitHub] [-Owner global-alfabet]
param([switch]$GitHub, [string]$Owner = "")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")
function Ok($m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Warn($m) { Write-Host "  !   $m" -ForegroundColor Yellow }
function Has($c) { $null -ne (Get-Command $c -ErrorAction SilentlyContinue) }

Write-Host "EstateMaps setup"
if (-not (Has git)) { throw "Install Git first: https://git-scm.com" }; Ok (git --version)
if (-not (Has node)) { throw "Install Node.js 20: https://nodejs.org" }; Ok ("node " + (node -v))
if (Has docker) { Ok "docker found" } else { Warn "Docker not found: needed for 'docker compose'" }
if (Has claude) { Ok "Claude Code found" } else { Warn "Claude Code not found: https://docs.claude.com/en/docs/claude-code" }

Write-Host "Installing website dependencies..."
npm --prefix apps/web ci --no-audit --no-fund
Write-Host "Checking the website (lint + build)..."
npm run check | Out-Null; if ($LASTEXITCODE -ne 0) { throw "lint/build failed" }; Ok "lint and build pass"

if (-not (Test-Path .env)) { Copy-Item .env.example .env; Ok "created .env" }

if (-not (Test-Path .git)) {
  git init -b main | Out-Null
  git add -A
  git commit -m "chore: initial EstateMaps website and project setup" | Out-Null
  Ok "git repository created with a first commit"
} else { Ok "git repository already exists" }

if ($GitHub) {
  if (-not (Has gh)) { throw "Install the GitHub CLI and run 'gh auth login': https://cli.github.com" }
  $name = if ($Owner) { "$Owner/estatemaps" } else { "estatemaps" }
  git remote get-url origin 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { git push -u origin main; Ok "pushed" }
  else { gh repo create $name --private --source . --remote origin --push; Ok "created private repo $name and pushed" }
}

Write-Host ""
Write-Host "Done. Next:"
Write-Host "  npm run dev                    -> http://localhost:5173"
Write-Host "  docker compose up -d --build   -> http://localhost:8081"
Write-Host "  claude                         -> start Claude Code in this folder"
