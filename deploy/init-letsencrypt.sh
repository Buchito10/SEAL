#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

if [ ! -f .env ]; then
    echo "Falta .env. Copia .env.example y configura DOMAIN y CERTBOT_EMAIL." >&2
    exit 1
fi

if [ ! -f Back/.env ]; then
    echo "Falta Back/.env. Copia Back/.env.example y agrega los secretos reales." >&2
    exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

case "${DOMAIN:-}" in
    ""|seal.example.com)
        echo "DOMAIN no contiene un dominio real." >&2
        exit 1
        ;;
esac

case "${CERTBOT_EMAIL:-}" in
    ""|admin@example.com)
        echo "CERTBOT_EMAIL no contiene un correo real." >&2
        exit 1
        ;;
esac

if [ -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "Ya existe un certificado para $DOMAIN. Iniciando los servicios..."
    docker compose up -d --build
    exit 0
fi

mkdir -p "certbot/conf/live/$DOMAIN" certbot/www

echo "Creando un certificado temporal para que Nginx pueda iniciar..."
docker compose run --rm --entrypoint sh certbot -c \
    "openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=$DOMAIN'"

echo "Construyendo SEAL e iniciando Nginx..."
docker compose up -d --build frontend backend nginx

echo "Eliminando el certificado temporal..."
docker compose run --rm --entrypoint sh certbot -c \
    "rm -rf '/etc/letsencrypt/live/$DOMAIN'"

STAGING_ARG=""
if [ "${CERTBOT_STAGING:-0}" = "1" ]; then
    STAGING_ARG="--staging"
    echo "Se solicitara un certificado de PRUEBA (CERTBOT_STAGING=1)."
fi

echo "Solicitando el certificado a Let's Encrypt..."
# SC2086 es intencional: STAGING_ARG debe omitirse o convertirse en un argumento.
# shellcheck disable=SC2086
docker compose run --rm --entrypoint certbot certbot \
    certonly --webroot --webroot-path=/var/www/certbot \
    --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email \
    --rsa-key-size 4096 $STAGING_ARG \
    -d "$DOMAIN"

docker compose exec nginx nginx -s reload
docker compose up -d certbot

echo "SEAL quedo disponible en https://$DOMAIN"
