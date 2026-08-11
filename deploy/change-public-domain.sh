#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

NEW_DOMAIN=${1:-}
case "$NEW_DOMAIN" in
    ""|*://*|*/*|.*|*.)
        echo "Uso: ./deploy/change-public-domain.sh nuevo-dominio" >&2
        echo "Ejemplo: ./deploy/change-public-domain.sh seal-contratos-inteligentes.westus2.cloudapp.azure.com" >&2
        exit 1
        ;;
esac

if ! printf '%s' "$NEW_DOMAIN" | grep -Eq '^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$'; then
    echo "El nombre de dominio no es válido." >&2
    exit 1
fi

if [ ! -f .env ]; then
    echo "Falta el archivo .env del despliegue." >&2
    exit 1
fi

STAMP=$(date -u +%Y%m%d-%H%M%S)
BACKUP_FILE=".env.domain-backup-$STAMP"
cp .env "$BACKUP_FILE"

rollback() {
    echo "El cambio falló. Restaurando la configuración anterior..." >&2
    cp "$BACKUP_FILE" .env
    docker compose up -d frontend backend nginx certbot >/dev/null 2>&1 || true
}
trap rollback HUP INT TERM

TMP_FILE=".env.domain-$STAMP.tmp"
awk -v domain="$NEW_DOMAIN" '
    BEGIN { replaced = 0 }
    /^DOMAIN=/ { print "DOMAIN=" domain; replaced = 1; next }
    { print }
    END { if (!replaced) print "DOMAIN=" domain }
' .env > "$TMP_FILE"
mv "$TMP_FILE" .env

if ! ./deploy/init-letsencrypt.sh; then
    rollback
    exit 1
fi

trap - HUP INT TERM
echo "Dominio actualizado: https://$NEW_DOMAIN"
echo "Respaldo de la configuración anterior: $BACKUP_FILE"
