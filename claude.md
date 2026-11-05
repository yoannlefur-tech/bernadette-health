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
- Types API : `docker compose exec frontend npm run types:api`
- URLs : API `http://localhost:8002`· front `http://localhost:5174` · Adminer `http://localhost:8082` (serveur `db`)

## Règles de travail

- Toujours proposer un plan avant de coder
- Ne jamais modifier une migration déjà commitée
- Ne jamais commiter `config/jwt/*.pem` ni de secrets
