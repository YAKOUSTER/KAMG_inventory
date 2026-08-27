#!/bin/bash
# Installe KAMG à côté d’AppMEUR. Ne touche pas au vhost sterennfonseca.fr.
set -euo pipefail

DOMAIN="${DOMAIN:-kamg.fr}"
APP_DIR="${APP_DIR:-/var/www/kamg}"
PORT="${PORT:-4173}"
REPO="${REPO:-https://github.com/YAKOUSTER/KAMG_inventory.git}"
BRANCH="${BRANCH:-master}"
APP_USER="${APP_USER:-www-data}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "À lancer en root : sudo bash deploy/bootstrap.sh"
  exit 1
fi

if ss -ltn | grep -q ":${PORT} "; then
  if ! systemctl is-active --quiet kamg; then
    echo "Le port ${PORT} est déjà pris par autre chose que kamg. Arrêt."
    exit 1
  fi
fi

if [[ -f /etc/nginx/sites-enabled/sterennfonseca.fr ]] || ls /etc/nginx/sites-enabled/*sterennfonseca.fr 2>/dev/null | grep -v kamg >/dev/null; then
  echo "AppMEUR détecté — ses fichiers nginx ne seront pas modifiés."
fi

command -v nginx >/dev/null
command -v node >/dev/null || { echo "Node.js est requis (le même que pour AppMEUR)."; exit 1; }
command -v npm >/dev/null
command -v git >/dev/null

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" "$REPO" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
fi

cd "$APP_DIR"
npm ci
npm run build

install -d -o "$APP_USER" -g "$APP_USER" "$APP_DIR/data" "$APP_DIR/data/uploads"
if [[ -f "$APP_DIR/data/db.json" ]]; then
  chown "$APP_USER:$APP_USER" "$APP_DIR/data/db.json"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR/data"

cp "$APP_DIR/deploy/kamg.service" /etc/systemd/system/kamg.service
systemctl daemon-reload
systemctl enable kamg
systemctl restart kamg

cp "$APP_DIR/deploy/nginx-kamg.conf" /etc/nginx/sites-available/"$DOMAIN"
ln -sfn /etc/nginx/sites-available/"$DOMAIN" /etc/nginx/sites-enabled/"$DOMAIN"
nginx -t
systemctl reload nginx

if command -v certbot >/dev/null; then
  certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect \
    --keep-until-expiring --register-unsafely-without-email || \
    echo "Certbot n’a pas pu passer (DNS kamg.fr pas encore propagé ?). Relancer plus tard : certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

sleep 1
systemctl --no-pager --full status kamg | head -20
echo
echo "KAMG écoute sur 127.0.0.1:${PORT}. AppMEUR n’a pas été modifié."
echo "URL : https://${DOMAIN}"
