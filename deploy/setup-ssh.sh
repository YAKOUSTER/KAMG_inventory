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
# Cursor secrets are often injected on one line; do not replace spaces in
# "BEGIN OPENSSH PRIVATE KEY" (that used to break ssh-keygen).
python3 - "$KEY_PATH" <<'PY'
import os, re, sys

path = sys.argv[1]
raw = os.environ.get("KAMG_SSH_PRIVATE_KEY", "")
raw = raw.strip().strip('"').strip("'")
raw = raw.replace("\r\n", "\n").replace("\r", "\n")
if "\\n" in raw and "\n" not in raw:
    raw = raw.replace("\\n", "\n")

if "\n" not in raw:
    match = re.match(
        r"(-----BEGIN [^-]+-----)\s+(.*?)\s+(-----END [^-]+-----)\s*$",
        raw,
        re.S,
    )
    if match:
        header, body, footer = match.group(1), match.group(2), match.group(3)
        body = re.sub(r"\s+", "", body)
        wrapped = "\n".join(body[i : i + 70] for i in range(0, len(body), 70))
        raw = f"{header}\n{wrapped}\n{footer}"

if not raw.endswith("\n"):
    raw += "\n"

with open(path, "w", encoding="utf-8") as fh:
    fh.write(raw)
PY
chmod 600 "$KEY_PATH"

if ! ssh-keygen -y -f "$KEY_PATH" >/dev/null 2>&1; then
  echo "Secret KAMG_SSH_PRIVATE_KEY invalide (vérifiez le format OPENSSH privé, pas la clé publique)."
  rm -f "$KEY_PATH"
  exit 1
fi

if command -v ssh-keyscan >/dev/null 2>&1; then
  ssh-keyscan -H "$KAMG_HOST" >> "$KNOWN_HOSTS" 2>/dev/null || true
  chmod 600 "$KNOWN_HOSTS" 2>/dev/null || true
fi

echo "Clé SSH KAMG prête (${KEY_PATH})."
