#!/usr/bin/env bash
# Run from your normal Terminal. No passwords or private keys are published.
set -euo pipefail
cd "$(dirname "$0")/.."
gh auth status
if [ ! -f package-lock.json ]; then
  # The preinstalled packages came from an offline pnpm store. Use a clean npm tree.
  if [ -d node_modules ]; then mv node_modules "${TMPDIR:-/tmp}/ustime-preinstalled-$(date +%s)"; fi
  npm install
else
  npm ci
fi
npm test
npm run build
if [ ! -d .git ]; then git init -b main; fi
if ! gh repo view palp1ix/calendar-duo >/dev/null 2>&1; then
  gh repo create palp1ix/calendar-duo --public --description 'UsTime — наш маленький мир на двоих'
fi
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin https://github.com/palp1ix/calendar-duo.git; fi
gh variable set VITE_SUPABASE_URL --repo palp1ix/calendar-duo --body 'https://dujwcjdeekdkgbmqgfud.supabase.co'
gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --repo palp1ix/calendar-duo --body 'sb_publishable_F5UrTaWzUkYnp5mea-XThA_aRviXlA6'
if ! gh api repos/palp1ix/calendar-duo/pages >/dev/null 2>&1; then
 gh api --method POST repos/palp1ix/calendar-duo/pages -f build_type=workflow
else
 gh api --method PUT repos/palp1ix/calendar-duo/pages -f build_type=workflow
fi
git add src public scripts e2e supabase .github .gitignore .env.example README.md package.json package-lock.json index.html tsconfig.json vite.config.ts playwright.config.ts
if ! git diff --cached --quiet; then git commit -m 'feat: build private UsTime calendar and pixel apartment'; fi
git push -u origin main
printf '\nGitHub Pages: https://palp1ix.github.io/calendar-duo/\n'
printf '\nStarting local app for browser checks at http://localhost:5173/calendar-duo/\n'
npm run dev
