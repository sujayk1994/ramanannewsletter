#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  push-to-github.sh  —  Commit & push everything to GitHub
#
#  Usage:
#    bash push-to-github.sh
#    bash push-to-github.sh "your commit message"
#    bash push-to-github.sh "your commit message" https://github.com/USERNAME/REPO.git
#
#  First-time setup if you haven't set a remote yet:
#    git remote add origin https://github.com/USERNAME/REPO.git
#  ─────────────────────────────────────────────────────────
set -e

COMMIT_MSG="${1:-"Update newsletter report $(date +'%Y-%m-%d %H:%M')"}"
REMOTE_URL="${2:-}"

# ── Optional: set / update the remote ──────────────────────
if [ -n "$REMOTE_URL" ]; then
  if git remote get-url origin &>/dev/null; then
    echo "🔄  Updating remote 'origin' to $REMOTE_URL"
    git remote set-url origin "$REMOTE_URL"
  else
    echo "➕  Adding remote 'origin' → $REMOTE_URL"
    git remote add origin "$REMOTE_URL"
  fi
fi

# ── Verify a remote exists ──────────────────────────────────
if ! git remote get-url origin &>/dev/null; then
  echo ""
  echo "❌  No GitHub remote found."
  echo "    Run once to set it up:"
  echo "      git remote add origin https://github.com/USERNAME/REPO.git"
  echo "    Or pass the URL as the second argument:"
  echo "      bash push-to-github.sh \"my message\" https://github.com/USERNAME/REPO.git"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")

echo ""
echo "📦  Staging all changes..."
git add -A

# Only commit if there's something to commit
if git diff --cached --quiet; then
  echo "✅  Nothing new to commit — working tree is clean."
else
  echo "💬  Committing: \"$COMMIT_MSG\""
  git commit -m "$COMMIT_MSG"
fi

echo "🚀  Pushing to origin/$BRANCH ..."
git push -u origin "$BRANCH"

echo ""
echo "✅  Done! Changes are live on GitHub."
echo "    Remote: $(git remote get-url origin)"
echo "    Branch: $BRANCH"
