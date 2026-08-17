#!/usr/bin/env bash
# Déploie la branche courante sur kamg.sterennfonseca.fr (sans toucher AppMEUR).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_PATH="${HOME}/.ssh/id_ed25519_kamg"
SSH_TARGET="${KAMG_DEPLOY_USER:-root}@${KAMG_DEPLOY_HOST:-2.28.17.156}"
BRANCH="${KAMG_DEPLOY_BRANCH:-cursor/patrimoine-textile-json-5db7}"

bash "$ROOT/deploy/setup-ssh.sh"

if [[ ! -f "$KEY_PATH" ]] || [[ ! -s "$KEY_PATH" ]]; then
  echo "Déploiement impossible : ajoutez le secret KAMG_SSH_PRIVATE_KEY dans Cursor (Cloud Agents → Secrets)."
  exit 1
fi

ssh -i "$KEY_PATH" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "$SSH_TARGET" bash -s "$BRANCH" <<'REMOTE'
set -euo pipefail
BRANCH="$1"
cd /var/www/kamg
git fetch origin "$BRANCH"
git pull origin "$BRANCH"
npm ci
if [[ -f public/logo-source.png ]]; then
  npm run logo:build
fi
npm run build
systemctl restart kamg
sleep 2
systemctl is-active kamg
python3 - <<'PY'
import json
with open("/var/www/kamg/data/db.json") as f:
    db = json.load(f)
print({k: len(db.get(k) or []) for k in ("items", "people", "loans", "users")})
PY
REMOTE

echo "Déploiement terminé sur https://kamg.sterennfonseca.fr"
