#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
cd "$ROOT_DIR"

RELEASE_REF="${1:-main}"

for required in .env Back/.env Back/secrets/firebase-admin.json; do
  if [[ ! -f "$required" ]]; then
    echo "Falta $required en el servidor." >&2
    exit 1
  fi
done

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "El servidor tiene cambios rastreados sin guardar. Se cancela el despliegue." >&2
  exit 1
fi

mkdir -p .release
CURRENT_COMMIT=$(git rev-parse HEAD)
git fetch --tags origin

if git rev-parse --verify --quiet "origin/$RELEASE_REF^{commit}" >/dev/null; then
  TARGET_COMMIT=$(git rev-parse "origin/$RELEASE_REF^{commit}")
else
  TARGET_COMMIT=$(git rev-parse "$RELEASE_REF^{commit}")
fi

printf '%s\n' "$CURRENT_COMMIT" > .release/previous_commit
git checkout --detach "$TARGET_COMMIT"

set -a
. ./.env
set +a

if [[ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]]; then
  docker compose up -d --build
  # Frontend y backend pueden recibir nuevas IP internas al recrearse. El
  # reinicio hace que Nginx vuelva a resolver ambos nombres en la red Docker.
  docker compose restart nginx
else
  ./deploy/init-letsencrypt.sh
fi

for attempt in {1..24}; do
  if curl --fail --silent --show-error "https://$DOMAIN/api/health" >/dev/null; then
    printf '%s\n' "$TARGET_COMMIT" > .release/current_commit
    echo "Release $TARGET_COMMIT disponible en https://$DOMAIN"
    docker compose ps
    exit 0
  fi
  sleep 5
done

echo "La verificación de salud falló. Ejecuta ./deploy/cloud/rollback.sh" >&2
docker compose ps
docker compose logs --tail=80 nginx frontend backend
exit 1
