#!/bin/zsh
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")" || exit 1
node scripts/start-lan.mjs --event
printf '\nSEAL se detuvo. Presiona Enter para cerrar esta ventana.\n'
read -r seal_event_exit
