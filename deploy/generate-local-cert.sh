#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CERT_DIR="$ROOT_DIR/deploy/certs"
LAN_HOST=${1:-localhost}

if ! command -v mkcert >/dev/null 2>&1; then
    echo "No se encontro mkcert. En macOS instalalo con: brew install mkcert" >&2
    exit 1
fi

mkdir -p "$CERT_DIR"

echo "Instalando la autoridad certificadora local de mkcert..."
mkcert -install

echo "Generando el certificado local de SEAL..."
if [ "$LAN_HOST" = "localhost" ]; then
    mkcert \
        -cert-file "$CERT_DIR/seal-local.pem" \
        -key-file "$CERT_DIR/seal-local-key.pem" \
        localhost 127.0.0.1 ::1
else
    mkcert \
        -cert-file "$CERT_DIR/seal-local.pem" \
        -key-file "$CERT_DIR/seal-local-key.pem" \
        localhost 127.0.0.1 ::1 "$LAN_HOST"
fi

echo "Certificado creado para localhost y $LAN_HOST."
echo "La clave privada local quedo en deploy/certs y no debe subirse a Git."
