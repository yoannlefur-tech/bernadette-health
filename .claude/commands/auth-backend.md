# Authentification backend

## Contexte

Projet bernadette-health (voir CLAUDE.md), branche `feature/auth` depuis
`develop`. Domaine en place (Dog, WeightEntry, Vaccination, VetVisit,
TimestampableTrait), 52 tests verts, secrets hors dépôt, clés JWT de dev
(`backend/.env.local`) et de test (`config/jwt/test/`).
`lexik/jwt-authentication-bundle` est installé, mais aucun test n'a encore
signé de token.

## Clarté

Authentification backend uniquement, un commit par étape :

1. User : email (unique), password (hashé), roles, UUID v7,
   TimestampableTrait. Migration. Pas d'inscription publique, pas d'endpoint
   de création. Commande `app:create-user` (email, mot de passe via prompt
   masqué, option `--admin`).
2. Login : `POST /api/auth/login` (json_login, champ email) renvoie un access
   token JWT de 15 min. `login_throttling` activé. Coût de hashage réduit en
   env test (`when@test`) pour garder les tests rapides.
3. Refresh : vérifier d'abord que `gesdinet/jwt-refresh-token-bundle` est
   compatible Symfony 7.4, PHP 8.3 et l'API Platform installée. Si oui,
   refresh token de 30 jours dans un cookie HttpOnly, SameSite=Lax, path
   `/api/auth`, Secure hors dev. Endpoints `POST /api/auth/refresh` et
   `POST /api/auth/logout` (invalide le refresh token, supprime le cookie).
   Si non, propose l'alternative avant de coder.
4. `GET /api/me` : renvoie l'utilisateur courant (id, email, roles), jamais
   le hash. Groupes read/write explicites, comme les autres ressources.
5. Ownership : `Dog` ↔ `User` en ManyToMany (`owners`).
   - Migration : les Dog existants n'ont pas de propriétaire, ne rien casser.
   - Fixtures : créer un utilisateur de dev (mot de passe lu depuis une
     variable d'environnement de dev, pas en dur) rattaché à Bernadette.
   - À la création d'un Dog, l'utilisateur courant devient owner.
   - Extensions Doctrine API Platform (collection et item) : un Dog n'est
     visible que si l'utilisateur en est owner. Les ressources liées
     (WeightEntry, Vaccination, VetVisit) sont filtrées via `dog.owners`.
   - Un item d'un autre utilisateur renvoie 404, pas 403.
   - POST d'une ressource liée avec le dog d'un autre utilisateur : refusé
     (l'IRI doit être introuvable, donc 400). Ajouter le test pour le
     confirmer.
   - Ajout et retrait d'un owner : hors périmètre pour l'instant.
6. Traçabilité : `BlameableTrait` (created_by, updated_by, ManyToOne nullable
   vers User, onDelete SET NULL) sur Dog, WeightEntry, Vaccination et
   VetVisit.
   - Rempli par un listener Doctrine depuis le token courant (null en
     console et fixtures).
   - Exposé en lecture seule (IRI).
   - Colonnes nullables, une migration unique.
7. Sécurité HTTP : firewalls login et api stateless (jwt), `access_control`
   (`/api/auth` et `/api/docs` en PUBLIC_ACCESS, le reste
   IS_AUTHENTICATED_FULLY). CORS avec `allow_credentials` pour
   `http://localhost:5174` uniquement (pas de wildcard).
8. Schéma TS : régénérer avec `npm run types:api`, puis commiter.

## Contraintes

- Conventions de CLAUDE.md. Tout via `docker compose exec`.
- Les tests existants doivent être adaptés pour s'authentifier (helper de
  test qui crée un User et signe un vrai token), sans les affaiblir.
- Tests PHPUnit à écrire :
  - login OK et KO (mauvais mot de passe, utilisateur inconnu)
  - token expiré ou invalide = 401, sans token = 401
  - `/api/me`, refresh et logout
  - isolation entre deux utilisateurs (collection, item, POST, PATCH,
    DELETE)
  - created_by et updated_by remplis
  - 409 de suppression d'un Dog avec historique toujours valide
  - suppression d'un Dog sans historique mais avec owners acceptée
- Ne jamais afficher de secret ni de token dans la sortie ou les commits.
- Proposer le plan avant d'écrire du code et attendre mon accord.

## Critères de fin

- `bin/phpunit` vert, php-cs-fixer sans diff.
- Un curl sur le login renvoie un token, `/api/me` répond avec le token et
  401 sans.
- Un second utilisateur ne voit rien de Bernadette.
- `/api/docs.jsonopenapi` décrit les routes d'auth et le schéma de sécurité.
