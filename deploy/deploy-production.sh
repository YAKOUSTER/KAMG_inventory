#!/usr/bin/env bash
# Déploie le code sur kamg.fr sans toucher AppMEUR.
# Ne remplace jamais data/db.json ni data/uploads/ (saisies prod).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEY_PATH="${HOME}/.ssh/id_ed25519_kamg"
SSH_TARGET="${KAMG_DEPLOY_USER:-root}@${KAMG_DEPLOY_HOST:-2.28.17.156}"
if [[ -n "${KAMG_DEPLOY_BRANCH:-}" ]]; then
  BRANCH="$KAMG_DEPLOY_BRANCH"
else
  BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
fi

echo "Branche à publier : $BRANCH"
echo "Les fiches, personnes, emprunts et photos restent dans /var/www/kamg/data/ (hors git)."

bash "$ROOT/deploy/setup-ssh.sh"

if [[ ! -f "$KEY_PATH" ]] || [[ ! -s "$KEY_PATH" ]]; then
  echo "Déploiement impossible : ajoutez le secret KAMG_SSH_PRIVATE_KEY dans Cursor (Cloud Agents → Secrets)."
  exit 1
fi

if ! ssh -i "$KEY_PATH" -o IdentitiesOnly=yes -o BatchMode=yes -o PreferredAuthentications=publickey \
    -o PasswordAuthentication=no -o ConnectTimeout=15 -o StrictHostKeyChecking=accept-new \
    "$SSH_TARGET" true; then
  echo
  echo "Le VPS refuse la clé de l’agent (authorized_keys)."
  echo "Une seule fois, depuis votre Mac déjà connecté en root :"
  echo "  ssh root@${KAMG_DEPLOY_HOST:-2.28.17.156} 'mkdir -p /root/.ssh && chmod 700 /root/.ssh'"
  echo "  cat deploy/cursor-agent.pub | ssh root@${KAMG_DEPLOY_HOST:-2.28.17.156} 'cat >> /root/.ssh/authorized_keys && chmod 600 /root/.ssh/authorized_keys'"
  echo "Puis relancer : bash deploy/deploy-production.sh"
  exit 1
fi

ssh -i "$KEY_PATH" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "$SSH_TARGET" bash -s "$BRANCH" <<'REMOTE'
set -euo pipefail
BRANCH="$1"
APP=/var/www/kamg
cd "$APP"

if [[ ! -f data/db.json ]]; then
  echo "STOP : data/db.json absent. On n’écrase pas la prod avec le seed."
  exit 1
fi

STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP="$APP/data/backups/$STAMP"
mkdir -p "$BACKUP"
cp -a data/db.json "$BACKUP/db.json"
if [[ -d data/uploads ]]; then
  cp -a data/uploads "$BACKUP/uploads"
fi
chown -R www-data:www-data "$APP/data/backups" 2>/dev/null || true
echo "Sauvegarde : $BACKUP"

python3 - "$BACKUP/db.json" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    db = json.load(f)
counts = {k: len(db.get(k) or []) for k in ("items", "people", "loans", "users", "events", "pages")}
open("/tmp/kamg-pre-deploy-counts.json", "w").write(json.dumps(counts))
print("Avant déploiement :", counts)
PY

git fetch origin "$BRANCH"
# Code seulement : db.json et uploads sont dans .gitignore, git ne les remplace pas.
git checkout -B "$BRANCH" "origin/$BRANCH"
npm ci
if [[ -f public/logo-source.png ]]; then
  npm run logo:build
fi
npm run build
systemctl restart kamg
sleep 2
systemctl is-active kamg

python3 - <<'PY'
import json, shutil, os, subprocess
pre = json.load(open("/tmp/kamg-pre-deploy-counts.json"))
with open("/var/www/kamg/data/db.json") as f:
    db = json.load(f)
post = {k: len(db.get(k) or []) for k in ("items", "people", "loans", "users", "events", "pages")}
print("Après déploiement :", post)
lost = [k for k in ("items", "people", "loans") if post.get(k, 0) < pre.get(k, 0)]
if lost:
    stamp = sorted(os.listdir("/var/www/kamg/data/backups"))[-1]
    backup = f"/var/www/kamg/data/backups/{stamp}/db.json"
    print("STOP : compteurs en baisse", lost, "— restauration de", backup)
    shutil.copy2(backup, "/var/www/kamg/data/db.json")
    subprocess.check_call(["systemctl", "restart", "kamg"])
    raise SystemExit(1)
print("OK : fiches, personnes et emprunts conservés.")
PY
REMOTE

echo "Déploiement terminé sur https://kamg.fr"
echo "Saisies prod : conservées (copie de sécurité dans /var/www/kamg/data/backups/)."
