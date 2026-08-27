# Gestion du patrimoine textiles et fournitures du cercle Korriganed Ar Meilhoù Glas

Application de gestion du **patrimoine textile et des fournitures** du cercle celtique Korriganed Ar Meilhoù Glas : échantillons, pièces de costume, pièces de collection, tissus et accessoires.

Les données sont stockées dans un **fichier JSON** (`data/db.json`), sans base de données. C’est le même principe que AppMEUR et Brocstock : zéro coût d’hébergement SQL, export/import pour les sauvegardes. Si un jour un vrai serveur de base devient possible, seul le module `server/store.js` aura besoin d’évoluer.

Héritage du vestiaire Korriganed Ar Meilhoù Glas (mesures par type de pièce, pièces liées, emprunts). Pensé pour un usage **mobile** (emprunts et retours sur téléphone). Le logo officiel du cercle est dans `public/logo-kamg.png` (fond transparent), avec `public/favicon.png` et `public/apple-touch-icon.png`.

Pour remplacer le logo : déposer le fichier PNG/JPG (fond blanc acceptable) dans `public/logo-source.png`, puis :

```bash
npm run logo:build
```

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

Au premier lancement, `data/seed.json` (jeu d’exemple) est copié vers `data/db.json`. Ce fichier local n’est pas versionné : c’est votre base.

Comptes de départ (à changer ensuite via le menu du compte → **Comptes et accès**) :

| Identifiant | Mot de passe | Profil |
| --- | --- | --- |
| `admin` | `admin` | Tout, y compris ajouter des pièces et gérer les comptes |
| `gestion` | `gestion` | Emprunts + modification des fiches (sans création de pièces) |
| `lecteur` | `lecteur` | Consultation des pièces, personnes et emprunts |

Vous pouvez ensuite **personnaliser les cases à cocher** d’un compte, comme dans AppMEUR.

## Fonctions

- Connexion par rôles, avec accès personnalisables par personne
- Fiches par catégorie (échantillon, costume, collection, tissu, accessoire)
- Champs adaptés : mesures de costume, laize/métrage, conservation, etc.
- Recherche et filtres, vue tableau (ordinateur) ou cartes (téléphone)
- Pièces liées, **photos locales** (plusieurs vues, légende, photo principale — fichiers dans `data/uploads`, comme AppMEUR)
- Panier d’emprunt, **fiche d’emprunt en page** : retour de certaines pièces ou de tout, **chaque retour est daté**
- Fiche personne (nom, prénom, plusieurs rôles, photo, mensurations pour une tenue complète, historique d’emprunts **par année**)
- Export / import JSON (page Paramètres) — les comptes déjà créés sont conservés si le dump n’en contient pas

## Production

En local :

```bash
npm run build
npm start
```

Le serveur Express sert l’interface et l’API JSON (port `4173`, ou `PORT`).

### Sur kamg.fr, sans casser AppMEUR

**Mille et une Reines** reste à la racine de `https://sterennfonseca.fr/` (API sur `/api`, Node au port 8000). KAMG a son propre domaine, son propre nginx, son propre Node (port **4173**) et son propre `data/`.

URLs une fois en ligne :

| URL | Contenu |
| --- | --- |
| `https://kamg.fr` | Espace membres |
| `https://kamg.fr/gestion` | Back-office (costume, agenda, personnes, infos) |
| `https://sterennfonseca.fr` | AppMEUR (inchangé) |

L’IP du VPS Hetzner (la même que pour AppMEUR) est aujourd’hui **`2.28.17.156`**. Pour la retrouver :

1. **Chez Hetzner** : [Cloud Console](https://console.hetzner.cloud/) → projet → serveur → **IPv4**.
2. **Sans se connecter au serveur** : `dig +short sterennfonseca.fr A` (même machine).
3. **Sur le VPS** : `hostname -I` ou `curl -4 ifconfig.me`.

#### DNS de kamg.fr (registrar du nouveau nom)

Ajouter, en **A** (et **AAAA** si tu as une IPv6) :

- `@` (ou `kamg.fr`) → `2.28.17.156`
- `www` → `2.28.17.156`

Attendre la propagation (parfois quelques minutes, parfois quelques heures). Le registrar affiche souvent « en cours de construction » tant que le site n’est pas encore servi en HTTPS.

#### Retirer KAMG de sterennfonseca.fr

Ne touche **pas** au site AppMEUR. Seulement le sous-domaine KAMG s’il existe :

1. Chez le registrar de **sterennfonseca.fr**, supprimer l’enregistrement **A** (et **AAAA**) du hôte `kamg` (`kamg.sterennfonseca.fr`).
2. Sur le VPS, désactiver l’ancien vhost s’il est encore là :

```bash
sudo rm -f /etc/nginx/sites-enabled/kamg.sterennfonseca.fr
sudo nginx -t && sudo systemctl reload nginx
```

Le modèle `deploy/nginx-kamg.conf` contient une redirection temporaire `kamg.sterennfonseca.fr` → `kamg.fr`. Tu peux la laisser le temps que d’éventuels favoris basculent, puis la retirer.

#### Nginx et certificat pour kamg.fr

Nouveau fichier, **sans éditer** le `server { }` d’AppMEUR :

```bash
sudo cp deploy/nginx-kamg.conf /etc/nginx/sites-available/kamg.fr
sudo ln -sfn /etc/nginx/sites-available/kamg.fr /etc/nginx/sites-enabled/kamg.fr
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d kamg.fr -d www.kamg.fr
```

Puis recopier le service systemd (URL publique `https://kamg.fr`) :

```bash
sudo cp deploy/kamg.service /etc/systemd/system/kamg.service
sudo systemctl daemon-reload
sudo systemctl restart kamg
```

**À éviter :** copier le `dist/` dans le dossier web d’AppMEUR, ou pointer nginx de `sterennfonseca.fr` vers le port 4173.

Changer tout de suite les mots de passe `admin` / `gestion` / `lecteur` via **Comptes et accès**.

Mises à jour suivantes : `git pull && npm ci && npm run build && sudo systemctl restart kamg`. Le fichier `data/db.json` et `data/uploads/` restent sur le serveur (ils ne sont pas dans git). Le script `deploy/deploy-production.sh` en fait une copie dans `data/backups/` avant de changer le code.

### Déploiement automatique (Cloud Agent)

La clé SSH **privée** ne doit jamais être versionnée. Elle vit dans un **secret Cursor** :

1. Ouvrir [Cursor → Cloud Agents → Secrets](https://cursor.com/dashboard?tab=cloud-agents).
2. Ajouter un secret nommé **`KAMG_SSH_PRIVATE_KEY`** avec le contenu complet de la clé privée (celle qui correspond à `deploy/cursor-agent.pub` sur le serveur).
3. Enregistrer l’environnement du dépôt (fichier `.cursor/environment.json`).

À chaque démarrage d’agent, `deploy/setup-ssh.sh` installe la clé dans `~/.ssh/id_ed25519_kamg`. Pour publier :

```bash
bash deploy/deploy-production.sh
```

Branche déployée : la branche git courante, ou `KAMG_DEPLOY_BRANCH` pour en forcer une. `data/db.json` et les photos ne sont jamais écrasés.

## Tests

```bash
npm test
```

Couverture actuelle (82 tests) :

| Domaine | Fichiers | Contenu |
| --- | --- | --- |
| Store JSON | `server/store.test.js` | CRUD, emprunts, uploads, auth, stock, audit |
| Workflows | `server/workflows.test.js` | Panier → emprunt → retour enrichi, validation |
| API HTTP | `server/app.test.js` | Health, auth, création pièce, en-têtes sécurité |
| Mots de passe | `server/password.test.js` | scrypt hash / verify |
| Domaine | `src/domain/*.test.js` | Filtres, dates, pièces, emprunts, images, etc. |

Non couvert pour l’instant : composants Vue, parcours navigateur E2E.

## Tester en local (checklist)

Après `git pull` sur la branche de travail :

```bash
npm ci
npm test          # 82 tests doivent passer
npm run dev       # http://localhost:5173 — API intégrée
```

Parcours manuel recommandé :

1. **Connexion** — `admin` / `admin`, puis changer les mots de passe (Comptes et accès).
2. **Inventaire** — vue cartes et tableau ; bouton **Emprunter** sur une pièce disponible.
3. **Panier** — cartes avec photo, commentaire, validation emprunt.
4. **Emprunt** — retour partiel avec formulaire (état, propreté, actions à faire).
5. **Accueil** — section « À faire » si des actions sont ouvertes.
6. **Paramètres** — export JSON ; import avec confirmation (tester sur une copie).
7. **Production locale** — `npm run build && npm start` puis http://localhost:4173

Les données locales vivent dans `data/db.json` et `data/uploads/` (non versionnés).

## Données

| Fichier | Rôle |
| --- | --- |
| `data/seed.json` | Jeu d’exemple versionné |
| `data/db.json` | Base locale (créée automatiquement) |
| `data/uploads/` | Photos ajoutées depuis l’interface |

Un dump JSON contient `items`, `people`, `loans`, `referentiels` et éventuellement `users`. Les photos sont des fichiers à côté (`data/uploads/`) ; le JSON ne stocke que le chemin, la légende et le crédit. Pour une sauvegarde complète : exporter le JSON **et** copier le dossier `data/uploads`.
