# SwapSmart

Application web d’échange d’objets entre utilisateurs avec un système de **points** (sans argent).

## Liens

| | URL |
|---|---|
| **Dépôt GitHub** | https://github.com/pakoundiconstantinoweb-commits/SwapSmart |
| **Site en ligne (GitHub Pages)** | https://pakoundiconstantinoweb-commits.github.io/SwapSmart/ |

## Technologies

- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (authentification, base de données, stockage images)

## Fonctionnalités

- Inscription / connexion
- Publier, modifier et supprimer des objets
- Marché avec recherche et filtres
- Demandes d’échange (accepter / refuser)
- Messagerie entre utilisateurs
- Historique des échanges

## Lancer en local

```sh
git clone https://github.com/pakoundiconstantinoweb-commits/SwapSmart.git
cd SwapSmart
npm install
cp .env.example .env
# Renseigne VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans .env
npm run dev
```

Ouvre http://localhost:8080

## Déploiement GitHub Pages

Le déploiement est automatique à chaque push sur `main` (workflow `.github/workflows/deploy.yml`).

### 1. Activer GitHub Pages

1. Repo → **Settings** → **Pages**
2. **Build and deployment** → Source : **GitHub Actions**

### 2. Secrets obligatoires (Settings → Secrets and variables → Actions)

| Secret | Description |
|--------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clé anon / publishable Supabase |

### 3. Base de données Supabase

Dans le **SQL Editor** Supabase, exécute les fichiers dans `supabase/migrations/` (dans l’ordre des dates), notamment :

- `20260521100000_fix_accept_swap_request.sql` — corrige l’acceptation des échanges

## Structure du projet

```
src/pages/       # Écrans (Marché, Messages, Profil…)
src/components/  # UI réutilisable
src/hooks/       # Auth, profil
supabase/        # Migrations SQL
public/          # Favicon, assets statiques
```

## Auteur

Projet SwapSmart — dépôt : [pakoundiconstantinoweb-commits/SwapSmart](https://github.com/pakoundiconstantinoweb-commits/SwapSmart)
