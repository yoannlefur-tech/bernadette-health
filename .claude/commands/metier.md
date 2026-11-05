# Contexte

Projet bernadette-health (voir CLAUDE.md). Install, Docker et git OK.
Pas d'authentification pour l'instant : elle viendra après et ajoutera
Dog <-> User ainsi que created_by / updated_by.
Branche : feature/metier créée depuis develop.

## Clarté

Crée le modèle métier exposé via API Platform, avec un commit par étape :

0. Outillage : doctrine-fixtures-bundle, symfony/http-client (requis par
   ApiTestCase), dama/doctrine-test-bundle, php-cs-fixer (@PSR12 +
   declare_strict_types). Vérifier que doctrine.yaml (when@test) contient
   dbname_suffix `_test%env(default::TEST_TOKEN)%` et créer la base de test.
   Corriger le CMD de Dockerfile.dev pour que php -S route tout vers
   public/index.php (sinon /api/docs.json renvoie 404).
   Commit `style:` séparé pour le reformatage php-cs-fixer, avant les entités.
1. TimestampableTrait (created_at, updated_at en datetime_immutable,
   PrePersist/PreUpdate, lecture seule dans l'API) + Dog : name, birth_date,
   breed, coat (texte libre), microchip_number (nullable, unique, longueur
   max seulement, UniqueEntity + index unique).
2. WeightEntry : dog, measured_at, weight_grams (int > 0).
3. Vaccination : dog, name, administered_at, next_due_at (nullable),
   veterinarian (nullable), notes (nullable).
4. VetVisit : dog, visited_at, reason, diagnosis (nullable),
   cost_cents (int >= 0, nullable), notes (nullable).
5. Fixtures de dev : Bernadette (teckel nain, "Poil ras, fauve"), avec
   quelques pesées, vaccins et visites fictifs.
6. Types : installer openapi-typescript, corriger `types:api` pour viser
   `http://backend:8000/api/docs.jsonopenapi` (réseau Docker), générer et
   commiter le schéma TS.

## Règles du modèle

- Une migration par entité, dans le commit de l'entité, jamais modifiée après.
- Dates métier en date_immutable, sérialisées en Y-m-d, jamais dans le futur
  (sauf next_due_at), jamais avant la naissance du chien.
- next_due_at postérieure à administered_at.
- Groupes de sérialisation read/write explicites sur chaque ressource
  (pas de doublon camelCase/snake_case, created_at/updated_at en lecture seule).
- dog modifiable au POST seulement, ignoré au PATCH.
- Suppression d'un Dog : ON DELETE RESTRICT, violation de FK mappée en 409
  (exception_to_status dans api_platform.yaml).
- Filtres : dog (ressources liées), DateFilter + OrderFilter sur measured_at,
  administered_at, next_due_at, visited_at ; birth_date sur Dog.
  Pas de sous-ressources : GET /api/weight_entries?dog=/api/dogs/{id}.
- Tri par défaut : date décroissante, puis id décroissant (pagination stable).

## Contraintes

- Conventions de CLAUDE.md. Tout via docker compose exec.
- Tests PHPUnit fonctionnels : CRUD Dog et WeightEntry, poids négatif,
  dog manquant, filtre par date, PATCH avec dog sans déplacement,
  DELETE Dog sans historique OK et avec historique 409.
- Tests de base pour Vaccination et VetVisit.
- Propose le plan avant d'écrire du code et attends mon accord.

## Critères de fin

- migrations et fixtures passent, /api/docs montre les 4 ressources
- curl sur /api/docs.jsonopenapi renvoie 200
- bin/phpunit vert, php-cs-fixer sans diff, schéma TS généré
