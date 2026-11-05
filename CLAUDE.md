# Bernadette Health — suivi santé d'une teckel naine

## Stack

- backend/ : PHP 8.3, Symfony 7.4 LTS, API Platform, Doctrine ORM (attributs PHP 8, jamais YAML), PostgreSQL 16, LexikJWTAuthenticationBundle
- frontend/ : React + TypeScript (version : voir package.json), Vite, MUI (pas de CSS global), TanStack Query, React Router
- Docker Compose pour le dev local, GitLab CI pour le déploiement

## Domaine

- Entités : Dog (name, birth_date, breed, coat, microchip_number nullable), WeightEntry, Vaccination, VetVisit
- Toutes les entités sont rattachées à un Dog
- Identifiants : UUID v7

## Conventions

- PHP : PSR-12, `declare(strict_types=1)`, snake_case, attributs Doctrine
- React : composants fonctionnels + hooks uniquement, camelCase
- Pas de jQuery, pas de class components, pas de CSS global
- Code, entités, routes, commits : anglais. Interface utilisateur : français
- Un commit par étape, tests PHPUnit pour chaque ressource API

## API / types

- Les propriétés PHP sont en snake_case, donc le JSON de l'API l'est aussi
- Les types TS reflètent le JSON tel quel, générés avec `npm run types:api`, jamais écrits à la main ni convertis manuellement

## Commandes (tout passe par Docker)

- Démarrer : `docker compose up -d` (obligatoire avant tout `exec`)
- Console : `docker compose exec backend bin/console ...`
- Composer : `docker compose exec backend composer ...`
- Tests : `docker compose exec backend bin/phpunit` (env `test`, base dédiée)
- Style PHP : `docker compose exec backend vendor/bin/php-cs-fixer fix --dry-run --diff`
- Front : `docker compose exec frontend npm run lint`
- Tests front : `docker compose exec frontend npm run test` (Vitest, Testing Library, MSW)
- Types front : `docker compose exec frontend npx tsc -b`
- Types API : `docker compose exec frontend npm run types:api`
- URLs : API `http://localhost:8002`· front `http://localhost:5174` · Adminer `http://localhost:8082` (serveur `db`)

## Authentification frontend

- Proxy : en dev, Vite proxifie `/api` vers `API_PROXY_TARGET` (défaut `http://backend:8000`). Le front appelle la même origine que la page : ni CORS ni `credentials`, et le cookie de refresh passe tel quel. Redémarrer le conteneur front après un changement de `vite.config.ts`
- Clients : `client` (`src/api/client.ts`) pour l'API, avec Bearer et refresh automatique ; `authClient` (`src/api/authClient.ts`), sans middleware, réservé à `/api/auth/*`
- Token : l'access token reste en mémoire dans `src/api/tokenStore.ts`, jamais dans localStorage, sessionStorage ni IndexedDB, jamais dans les logs. Recharger la page le perd : le refresh silencieux au démarrage le renouvelle
- Refresh unique : toujours passer par `refreshSession()` (`src/api/refresh.ts`), jamais d'appel direct. Le refresh token tourne à chaque usage et deux refresh simultanés donnent un 401 : une promesse partagée déduplique dans l'onglet, le verrou `navigator.locks` `auth-refresh` sérialise entre onglets. Login et logout prennent le même verrou
- Après un 401 hors `/api/auth/*` : un refresh et un seul rejeu. Seul un 401 du refresh vide la session. Erreur réseau ou 5xx : la requête échoue, la session reste. Au démarrage, toute erreur donne `anonymous`
- `navigator.locks` exige un contexte sécurisé (localhost ou HTTPS) : sans lui, la sérialisation entre onglets ne s'applique pas
- Session : `useAuth()` expose `user`, `status`, `login` et `logout`. Le logout et l'expiration vident le cache TanStack Query, et le logout est propagé aux autres onglets par `BroadcastChannel`
- Ajouter une route protégée : la déclarer sous le layout `ProtectedRoute` dans `src/App.tsx`, puis appeler l'API avec `client`. Destination conservée dans `state.from`, à relire uniquement via `safeRedirectTarget()` (pas d'open redirect)

  ```tsx
  <Route element={<ProtectedRoute />}>
    <Route index element={<HomePage />} />
    <Route path="/dogs/:id" element={<DogPage />} />
  </Route>
  ```

## Installation d'un nouveau poste

1. Copier les fichiers d'exemple : `cp .env.example .env` et `cp backend/.env.local.example backend/.env.local`
2. Remplir `backend/.env.local` (les commandes de génération sont en commentaire) et, si besoin, `.env`
3. Démarrer : `docker compose up -d`
4. Installer les dépendances PHP (`vendor/` est un volume Docker) : `docker compose exec backend composer install`
5. Générer les clés JWT : `docker compose exec backend bin/console lexik:jwt:generate-keypair`, puis protéger la clé privée : `docker compose exec backend chmod 600 config/jwt/private.pem`
6. Préparer les bases :
   - dev : `docker compose exec backend bin/console doctrine:migrations:migrate`
   - test : `docker compose exec backend bin/console doctrine:database:create --env=test`, puis `doctrine:migrations:migrate --env=test`

## Secrets

- Aucun secret dans `docker-compose.yaml` ni dans un fichier versionné
- Ne pas définir `APP_SECRET` ni `JWT_*` dans le compose : une vraie variable d'environnement écrase `.env.local` et `.env.test`
- Ne pas redéfinir ces variables dans `backend/.env.dev` : ce fichier est chargé après `.env.local` et l'écrase
- Après un changement d'environnement dans le compose : `docker compose up -d` (un `restart` garde les anciennes variables)
- `DB_PASSWORD` n'est appliqué par Postgres qu'à la création du volume : le changer ensuite casse la connexion à une base existante
- `config/jwt/private.pem` est en `0600` et le conteneur backend tourne en root : une future directive `USER` dans le Dockerfile casserait la lecture de la clé

## Règles de travail

- Toujours proposer un plan avant de coder
- Ne jamais modifier une migration déjà commitée
- Ne jamais commiter `config/jwt/*.pem` ni de secrets. Seule exception : les clés de `config/jwt/test/`, qui ne protègent rien
