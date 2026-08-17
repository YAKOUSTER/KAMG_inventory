#!/usr/bin/env bash
# Installe la clé SSH de déploiement KAMG depuis le secret Cursor KAMG_SSH_PRIVATE_KEY.
set -euo pipefail

KEY_PATH="${HOME}/.ssh/id_ed25519_kamg"
KNOWN_HOSTS="${HOME}/.ssh/known_hosts"
KAMG_HOST="${KAMG_DEPLOY_HOST:-2.28.17.156}"

mkdir -p "${HOME}/.ssh"
chmod 700 "${HOME}/.ssh"

if [[ -z "${KAMG_SSH_PRIVATE_KEY:-}" ]]; then
  echo "Secret KAMG_SSH_PRIVATE_KEY absent — déploiement SSH indisponible pour cet agent."
  exit 0
fi

umask 077
printf '%s\n' "$KAMG_SSH_PRIVATE_KEY" > "$KEY_PATH"
chmod 600 "$KEY_PATH"

if command -v ssh-keyscan >/dev/null 2>&1; then
  ssh-keyscan -H "$KAMG_HOST" >> "$KNOWN_HOSTS" 2>/dev/null || true
  chmod 600 "$KNOWN_HOSTS" 2>/dev/null || true
fi

echo "Clé SSH KAMG prête (${KEY_PATH})."
