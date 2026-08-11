#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

ROLLBACK_REF="${1:-}"
if [[ -z "$ROLLBACK_REF" && -f .release/previous_commit ]]; then
  ROLLBACK_REF=$(cat .release/previous_commit)
fi

if [[ -z "$ROLLBACK_REF" ]]; then
  echo "Uso: ./deploy/cloud/rollback.sh <tag-o-commit>" >&2
  exit 1
fi

git fetch --tags origin
ROLLBACK_COMMIT=$(git rev-parse "$ROLLBACK_REF^{commit}")
git checkout --detach "$ROLLBACK_COMMIT"
docker compose up -d --build
docker compose restart nginx

set -a
. ./.env
set +a

for attempt in {1..24}; do
  if curl --fail --silent --show-error "https://$DOMAIN/api/health" >/dev/null; then
    printf '%s\n' "$ROLLBACK_COMMIT" > .release/current_commit
    echo "Rollback completado al commit $ROLLBACK_COMMIT"
    docker compose ps
    exit 0
  fi
  sleep 5
done

echo "El rollback arrancó los contenedores, pero la prueba de salud falló." >&2
docker compose logs --tail=80 nginx frontend backend
exit 1
