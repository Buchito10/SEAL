#!/bin/zsh
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$(dirname "$0")" || exit 1
node scripts/check-event.mjs
printf '\nPresiona Enter para cerrar esta ventana.\n'
read -r seal_event_exit
