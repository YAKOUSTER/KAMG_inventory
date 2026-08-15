# Patrimoine textile

Application de gestion d’un **patrimoine textile** : échantillons, pièces de costume, pièces de collection, tissus et accessoires.

Les données sont stockées dans un **fichier JSON** (`data/db.json`), sans base de données. C’est le même principe que AppMEUR et Brocstock : zéro coût d’hébergement SQL, export/import pour les sauvegardes. Si un jour un vrai serveur de base devient possible, seul le module `server/store.js` aura besoin d’évoluer.

Héritage du vestiaire Korriganed Ar Meilhoù Glas (mesures par type de pièce, pièces liées, emprunts). Pensé pour un usage **mobile** (emprunts et retours sur téléphone).

## Démarrer

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

Au premier lancement, `data/seed.json` (jeu d’exemple) est copié vers `data/db.json`. Ce fichier local n’est pas versionné : c’est votre base.

Comptes de départ (à changer ensuite dans **Comptes et accès**) :

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
- Fiche personne (photo, mensurations pour une tenue complète, historique d’emprunts **par année**)
- Export / import JSON (page Paramètres) — les comptes déjà créés sont conservés si le dump n’en contient pas

## Production

```bash
npm run build
npm start
```

Le serveur Express sert l’interface et l’API JSON (port `4173`, ou `PORT`).

## Tests

```bash
npm test
```

## Données

| Fichier | Rôle |
| --- | --- |
| `data/seed.json` | Jeu d’exemple versionné |
| `data/db.json` | Base locale (créée automatiquement) |
| `data/uploads/` | Photos ajoutées depuis l’interface |

Un dump JSON contient `items`, `people`, `loans`, `referentiels` et éventuellement `users`. Les photos sont des fichiers à côté (`data/uploads/`) ; le JSON ne stocke que le chemin, la légende et le crédit. Pour une sauvegarde complète : exporter le JSON **et** copier le dossier `data/uploads`.
