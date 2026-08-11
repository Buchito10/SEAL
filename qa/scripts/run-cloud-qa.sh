#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

BASE_URL="${BASE_URL:-${1:-}}"
if [[ -z "$BASE_URL" ]]; then
  echo "Uso: BASE_URL=https://tu-dominio ./qa/scripts/run-cloud-qa.sh" >&2
  exit 1
fi

mkdir -p qa/reports/k6 qa/reports/lighthouse

echo "=== Jest: unitarias y caja blanca ==="
npm --prefix Back run test:coverage

echo "=== Playwright: integración ==="
BASE_URL="$BASE_URL" npm --prefix qa run test:e2e

echo "=== k6: 50 usuarios durante 30 segundos ==="
if command -v k6 >/dev/null 2>&1; then
  BASE_URL="$BASE_URL" k6 run \
    --summary-export=qa/reports/k6/summary.json qa/k6/load-test.js
else
  docker run --rm \
    -e BASE_URL="$BASE_URL" -e VUS=50 -e DURATION=30s \
    -v "$ROOT_DIR/qa/k6:/scripts:ro" \
    -v "$ROOT_DIR/qa/reports/k6:/reports" \
    grafana/k6 run --summary-export=/reports/summary.json /scripts/load-test.js
fi

echo "=== Lighthouse: UX, accesibilidad y mejores prácticas ==="
BASE_URL="$BASE_URL" npm --prefix qa run lighthouse

echo "QA terminada. Revisa qa/reports y Back/coverage."
