#!/usr/bin/env bash
# Installe la clé publique sur le VPS — à lancer depuis TON Mac, pas dans Cloud Agent.
# Usage : bash deploy/install-pubkey-on-vps.sh ~/Desktop/kamg-deploy.pub
set -euo pipefail

PUBKEY_FILE="${1:-}"
HOST="${KAMG_DEPLOY_HOST:-2.28.17.156}"
USER="${KAMG_DEPLOY_USER:-root}"

if [[ -z "$PUBKEY_FILE" || ! -f "$PUBKEY_FILE" ]]; then
  echo "Usage: bash deploy/install-pubkey-on-vps.sh /chemin/vers/kamg-deploy.pub"
  exit 1
fi

echo "Envoi de ${PUBKEY_FILE} vers ${USER}@${HOST}..."
scp "$PUBKEY_FILE" "${USER}@${HOST}:/tmp/kamg-deploy.pub"

ssh "${USER}@${HOST}" bash -s <<'REMOTE'
set -euo pipefail
mkdir -p /root/.ssh
chmod 700 /root/.ssh
touch /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
grep -qF "$(cat /tmp/kamg-deploy.pub)" /root/.ssh/authorized_keys 2>/dev/null || \
  cat /tmp/kamg-deploy.pub >> /root/.ssh/authorized_keys
rm -f /tmp/kamg-deploy.pub
echo "Clé publique installée sur le VPS."
REMOTE

echo "Terminé. Vous pouvez relancer le déploiement Cloud Agent."
