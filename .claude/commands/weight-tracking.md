# Suivi du poids

## Contexte

Projet bernadette-health (voir CLAUDE.md), branche `feature/weight-tracking`
depuis `develop` (authentification frontend mergée). L'API expose
`WeightEntry` : `dog` (IRI), `measured_at` (date `Y-m-d`), `weight_grams`
(entier strictement positif), avec filtre `dog`, tri par date et collections
paginées JSON-LD (clé `member`). Les types TS sont générés par
`npm run types:api`. L'accueil liste déjà les chiens. Le chien peut être un
chiot ou un adulte : les règles d'alerte dépendent de l'âge, calculé depuis
`birth_date`.

## Clarté

Suivi du poids d'un chien, frontend uniquement sauf le point signalé en
étape 9. Un commit par étape, et commiter ce fichier de commande en premier
dans un commit `chore:` séparé :

1. Navigation : chaque chien de l'accueil devient un lien vers
   `/dogs/:dogId`, route protégée. Un chien inconnu ou appartenant à un autre
   utilisateur (l'API répond 404) affiche « Chien introuvable » avec un lien
   vers l'accueil. En-tête de page : nom, race, date de naissance.
2. Outils de domaine, en fonctions pures dans `src/features/weight/` :
   - conversion kg ↔ grammes par parsing de la saisie (virgule ou point,
     trois décimales maximum), sans erreur d'arrondi flottant,
   - date du jour au format `Y-m-d` en heure locale, jamais avec
     `toISOString()` (décalage UTC autour de minuit),
   - conversion `Y-m-d` vers `Date` locale sans passer par
     `new Date(string)`, qui interprète la chaîne en UTC,
   - écart avec la pesée précédente (grammes et pourcentage),
   - règles d'alerte (étape 7), avec leurs seuils dans un fichier unique de
     constantes.
3. Accès aux données avec TanStack Query :
   - une seule requête de liste complète, qui suit la pagination JSON-LD
     (`view.next`) jusqu'au bout, triée par date croissante puis par `id`
     (volume attendu : quelques centaines de lignes au plus),
   - création, modification (PATCH, sans renvoyer `dog`) et suppression,
     avec invalidation de la liste,
   - clés de requête incluant l'identifiant du chien.
4. Historique : tableau MUI alimenté par la liste complète, trié par date
   décroissante (puis `id` décroissant pour les pesées du même jour), avec
   pagination côté client. Colonnes : date, poids en kg, écart avec la pesée
   précédente, actions modifier et supprimer. État vide avec un bouton
   d'ajout. Suppression après confirmation dans une boîte de dialogue.
5. Formulaire en boîte de dialogue MUI (création et modification) : date
   (`type="date"`, `max` = aujourd'hui, `min` = date de naissance) et poids en
   kg, avec react-hook-form et des messages en français.
   - Validation : poids supérieur à 0 et au plus 100 kg, date ni future ni
     antérieure à la naissance.
   - Les erreurs 422 de l'API (`violations`, `propertyPath` en snake_case)
     sont rattachées aux champs. Si le message serveur est en anglais,
     afficher un message français générique plutôt que le texte serveur.
   - Avertissement non bloquant si le poids s'écarte de plus de 50 % de la
     pesée précédente (faute de frappe probable, par exemple 48,5 pour 4,85).
6. Courbe : `LineChart` de `@mui/x-charts`, axe X temporel, axe Y en kg, un
   point par pesée, infobulle avec la date et le poids. Largeur adaptative,
   lisible à 360 px. Le tableau sert de version textuelle, le graphique porte
   un `aria-label`. Message à la place du graphique s'il y a moins de deux
   pesées. Vérifier la compatibilité de `@mui/x-charts` avec la version de MUI
   installée avant de l'ajouter.
7. Alertes : bandeau MUI `Alert` (severity `warning`) au-dessus de la courbe,
   calculé sur la dernière pesée uniquement :
   - perte de 5 % ou plus par rapport à la pesée précédente, à tout âge,
   - gain de 10 % ou plus par rapport à la pesée la plus ancienne des 30 jours
     précédents, seulement si le chien a 12 mois ou plus à la date de la
     pesée (la prise de poids d'un chiot est normale),
   - aucune alerte avec une seule pesée,
   - texte neutre : constat chiffré (par exemple « -6,2 % depuis le 12/10 »)
     et mention qu'il s'agit d'une aide indicative qui ne remplace pas l'avis
     du vétérinaire.
8. Documentation : section « Suivi du poids » dans CLAUDE.md (structure du
   dossier, emplacement des seuils d'alerte, pièges de dates).
9. Point backend à signaler dans le plan, sans le coder avant mon accord :
   vérifier comment la contrainte « date jamais dans le futur » est calculée
   côté serveur. Si c'est en UTC, une pesée saisie entre minuit et 2 h à
   Paris, alors que la date locale est déjà celle du lendemain, serait
   rejetée en 422. Proposer la correction minimale, dans un commit backend
   séparé avec son test PHPUnit.

## Contraintes

- Conventions de CLAUDE.md : composants fonctionnels et hooks, camelCase,
  MUI sans CSS global, types issus du schéma généré, jamais écrits à la main.
  Textes de l'interface en français.
- Le JSON de l'API est en snake_case : aucune conversion, les types reflètent
  le schéma. Si le schéma a changé, relancer `npm run types:api`.
- Les poids sont manipulés en grammes (entiers) dans tout le code, et
  convertis en kg uniquement à l'affichage et à la saisie.
- Dates affichées en français avec `Intl.DateTimeFormat('fr-FR')`.
- Interface utilisable sur mobile (360 px de large), en priorité pour la
  saisie et le tableau.
- Nouvelles dépendances : installer avec
  `docker compose exec frontend npm install ...`, commiter
  `package-lock.json`, puis vérifier à la fin qu'un
  `docker compose build frontend` passe.
- Tests avec Vitest, React Testing Library et MSW :
  - conversion kg ↔ grammes : `4,85` donne 4850, `4.855` donne 4855, rejet
    de quatre décimales, de zéro, de valeurs négatives et de texte,
  - date du jour locale et conversion `Y-m-d` stables autour de minuit,
  - écarts et règles d'alerte : perte de 5 %, gain de 10 % pour un adulte,
    aucune alerte pour un chiot qui grossit, aucune alerte avec une seule
    pesée, pesées du même jour,
  - suivi de la pagination JSON-LD sur plusieurs pages, ordre final correct,
  - formulaire : payload du POST (`dog` en IRI, `weight_grams`,
    `measured_at`), PATCH sans `dog`, rattachement d'une erreur 422 à son
    champ, rejet d'une date future,
  - suppression : confirmation requise, liste rafraîchie,
  - chien d'un autre utilisateur (404) : « Chien introuvable ».
  - Le rendu SVG du graphique n'est pas testé : tester la fonction qui
    prépare ses données.
- `npm run lint`, `npm run test` et `tsc` sans erreur avant chaque commit.
- Jamais de token dans les logs, les snapshots de tests ou les commits.
- Proposer le plan avant d'écrire du code et attendre mon accord.

## Critères de fin

- Depuis l'accueil, un clic sur Bernadette ouvre sa page de suivi.
- L'ajout d'une pesée avec `4,85` envoie `weight_grams: 4850` (à voir dans
  l'onglet Network), et une pesée datée du jour est acceptée.
- La modification et la suppression fonctionnent, la suppression demande une
  confirmation.
- Avec plus de dix pesées, le tableau est paginé ; la courbe affiche toutes
  les pesées dans l'ordre chronologique, y compris au-delà de la première
  page de l'API.
- Une perte de 5 % ou plus affiche le bandeau d'alerte, et une prise de
  poids de chiot n'en affiche pas.
- Le dossier du suivi du poids d'un chien d'un autre utilisateur n'est pas
  accessible.
- Tests, lint et `tsc` verts, `docker compose build frontend` passe.
