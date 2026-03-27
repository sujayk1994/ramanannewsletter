#!/usr/bin/env bash
set -e

# ── install pnpm if missing ───────────────────────────────────────────────────
if ! command -v pnpm &>/dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# ── install dependencies ──────────────────────────────────────────────────────
echo "Installing dependencies..."
pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
echo "Building newsletter report..."
PORT=3000 BASE_PATH=/ NODE_ENV=production \
  pnpm --filter @workspace/newsletter-report build

# ── serve ─────────────────────────────────────────────────────────────────────
PORT=${PORT:-3000}
echo "Starting server on port $PORT..."
npx serve -s artifacts/newsletter-report/dist/public -l "$PORT"
