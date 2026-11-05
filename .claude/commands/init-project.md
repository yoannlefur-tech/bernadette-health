# Contexte

Monorepo "bernadette-health" (git déjà initialisé, CLAUDE.md à la racine,
à lire d'abord). Stack : backend/ Symfony 7.4 LTS + API Platform + Doctrine + PostgreSQL 16, frontend/ React + TypeScript + Vite + MUI, tout en Docker
Compose. Je suis sous WSL2, les commandes passent par `docker compose exec`.

## Clarté

Crée et installe le projet complet, jusqu'à un état où `docker compose up -d`
démarre tout et où je peux ouvrir l'API et le front :

1. docker-compose.yml : services db (postgres:16, port hôte 5434,
   healthcheck `pg_isready -U app -d bernadette`), adminer (8082),
   backend (8002 -> 8000), frontend (5174 -> 5173), réseau app_network,
   volume postgres_data.
2. backend/ : Dockerfile.dev (php:8.3-cli, extensions pdo_pgsql, intl,
   opcache, composer, `php -S 0.0.0.0:8000 -t public`), skeleton Symfony 7.4,
   packs api, orm, uid, lexik/jwt-authentication-bundle, maker-bundle,
   test-pack, php-cs-fixer (règles @PSR12 + declare_strict_types).
3. frontend/ : Dockerfile (node:22-alpine, `npm run dev -- --host 0.0.0.0`),
   Vite react-ts, MUI, emotion, TanStack Query, React Router,
   openapi-typescript avec le script `types:api`.
4. Configuration : DATABASE_URL vers le service db, CORS pour localhost,
   clés JWT générées (hors git), .gitignore et .dockerignore corrects,
   .env.example sans secrets.
5. Un premier écran React avec un composant MUI qui appelle l'API
   (GET /api) pour prouver la liaison front/back.

## Contraintes

- Conventions de CLAUDE.md : PSR-12, strict_types, snake_case PHP, attributs Doctrine (jamais YAML), composants fonctionnels + hooks, pas de CSS global.
- Un commit par étape (docker, backend, frontend, liaison).
- Ne pas écraser CLAUDE.md. Si un fichier existe déjà, le lire et l'adapter.
- Tout s'exécute via Docker, rien d'installé en local hors git.
- Propose le plan avant d'écrire du code, puis attends mon accord.

## Critères de fin (à vérifier toi-même en lançant les commandes)

- `docker compose up -d` : les 4 services sont healthy/running
- `http://localhost:8002/api` affiche la doc API Platform
- `bin/console doctrine:migrations:status` répond sans erreur
- `http://localhost:5174` affiche la page et reçoit une réponse de l'API
- `bin/phpunit` et `npm run lint` passent
