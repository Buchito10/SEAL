#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "Uso: ./deploy/cloud/verify-production.sh dominio.example.com" >&2
  exit 1
fi

echo "1. Redirección HTTP a HTTPS"
curl --fail --silent --show-error --head "http://$DOMAIN" | sed -n '1,6p'

echo
echo "2. Respuesta HTTPS"
curl --fail --silent --show-error --head "https://$DOMAIN/login" | sed -n '1,8p'

echo
echo "3. API de salud"
curl --fail --silent --show-error "https://$DOMAIN/api/health"
echo

echo
echo "4. Certificado presentado por Nginx"
openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
