#!/usr/bin/env bash
set -Eeuo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Ejecuta este script con sudo: sudo ./deploy/cloud/bootstrap-ubuntu.sh" >&2
  exit 1
fi

DEPLOY_USER="${SUDO_USER:-$USER}"

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  ca-certificates curl git docker.io docker-compose-v2 ufw

systemctl enable --now docker
usermod -aG docker "$DEPLOY_USER"

# Sólo SSH, HTTP y HTTPS quedan accesibles desde Internet.
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Una e2-micro tiene poca memoria. El swap evita que la compilación de Next.js
# sea terminada por el sistema durante docker compose build.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo
echo "Servidor preparado. Firewall activo:"
ufw status
echo
echo "Cierra la sesión SSH y vuelve a entrar para usar Docker sin sudo."
