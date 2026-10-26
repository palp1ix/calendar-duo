#!/usr/bin/env bash
# Runs UI tests against local production assets. Backend calls in playful.spec are mocked.
set -euo pipefail
cd "$(dirname "$0")/.."
npm test
npm run build
VITE_TEST_PORT=5187
npm run preview -- --host 127.0.0.1 --port "$VITE_TEST_PORT" > /tmp/ustime-preview.log 2>&1 &
USTIME_PREVIEW_PID=$!
trap 'kill "$USTIME_PREVIEW_PID" 2>/dev/null || true' EXIT
E2E_URL="http://127.0.0.1:$VITE_TEST_PORT/calendar-duo/" npx playwright test e2e/playful.spec.ts --workers=1
