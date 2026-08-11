#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

sudo docker compose \
  --env-file .env \
  -f compose.yaml \
  -f deploy/vm/compose.vm.yaml \
  down

echo "SEAL fue detenido. Los servicios externos al proyecto seal no se modificaron."
