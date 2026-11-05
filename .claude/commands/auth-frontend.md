# Authentification frontend

## Contexte

Projet bernadette-health (voir CLAUDE.md), branche `feature/auth-front`
depuis `develop` (backend d'auth mergé). L'API exige un Bearer sur tout
`/api`, sauf `/api/auth` et `/api/docs`. L'access token JWT dure 15 minutes
et est renvoyé dans le corps du login et du refresh. Le refresh token dure
30 jours, dans un cookie HttpOnly (path `/api/auth`), avec rotation à chaque
usage : deux refresh simultanés donnent un 401 sur le second. Le front (Vite,
React, TypeScript, MUI, TanStack Query, React Router) n'a aucun écran d'auth.

## Clarté

Authentification frontend uniquement, un commit par étape :

1. Proxy de dev : dans `vite.config.ts`, proxifier `/api` vers le backend
   (cible lue dans une variable d'environnement, défaut
   `http://backend:8000`). Le front appelle `/api` en relatif : même origine
   que la page, donc ni CORS ni `credentials` en dev, et le cookie de refresh
   passe tel quel. Redémarrer le conteneur front après la modification.
2. Client HTTP centralisé dans `src/api/` :
   - client typé avec `openapi-fetch` sur le schéma généré par `types:api`
     (vérifier qu'il gère le JSON-LD de l'API, sinon wrapper `fetch` typé),
   - access token gardé en mémoire dans un module dédié, jamais dans
     localStorage, sessionStorage ni IndexedDB,
   - middleware qui ajoute l'en-tête `Authorization: Bearer`,
   - sur un 401 hors `/api/auth/*` : un refresh, puis un seul rejeu de la
     requête ; si le refresh échoue, session vidée et redirection vers
     `/login`,
   - jamais de boucle : pas de refresh sur les routes `/api/auth/*`, un seul
     rejeu par requête.
3. Refresh dédupliqué :
   - une seule promesse de refresh partagée par tous les appelants (requêtes
     concurrentes, double exécution des effets de `StrictMode` en dev),
   - sérialisation entre onglets avec `navigator.locks` (verrou
     `auth-refresh`), l'onglet qui obtient le verrou en second utilise le
     cookie déjà mis à jour.
4. Session : `AuthProvider` et hook `useAuth`, exposant `user`, `status`
   (`loading`, `authenticated`, `anonymous`), `login(email, password)` et
   `logout()`.
   - Au chargement : refresh silencieux puis `GET /api/me`. Un 401 donne
     l'état anonyme. Pendant `loading`, afficher un indicateur MUI, sans
     redirection prématurée vers `/login`.
   - Logout : `POST /api/auth/logout` (un échec réseau ne bloque pas la
     déconnexion locale), token effacé, cache TanStack Query vidé avec
     `queryClient.clear()` pour ne rien exposer au prochain utilisateur.
   - Déconnexion propagée aux autres onglets avec `BroadcastChannel`.
5. Login : page `/login` en MUI avec react-hook-form. Champs email et mot de
   passe avec les attributs `autoComplete` (`username`, `current-password`),
   bouton désactivé pendant l'envoi.
   - Messages : 401 « Identifiants invalides » (identique pour tout 401),
     429 « Trop de tentatives, réessayez plus tard », autre erreur
     « Erreur serveur ».
   - Un utilisateur déjà connecté qui ouvre `/login` est redirigé vers `/`.
6. Routes : `ProtectedRoute` (layout avec `Outlet`) qui redirige vers
   `/login` en conservant la destination (`state.from`).
   - Après le login, retour vers cette destination uniquement si c'est un
     chemin interne commençant par un seul `/` (ni `//`, ni URL absolue :
     pas d'open redirect).
   - Page 404 gérée.
7. Écran d'accueil protégé : barre MUI avec l'email et un bouton de
   déconnexion, liste des chiens via `GET /api/dogs` avec TanStack Query,
   pour prouver l'appel authentifié de bout en bout. Lire la forme réelle de
   la collection JSON-LD dans le schéma généré, sans la supposer.
8. Documentation : section « Authentification frontend » dans CLAUDE.md
   (proxy, token en mémoire, refresh unique, ajout d'une route protégée).

## Contraintes

- Conventions de CLAUDE.md : composants fonctionnels et hooks, camelCase,
  MUI sans CSS global, types issus du schéma généré, jamais écrits à la main.
  Textes de l'interface en français.
- Le JSON de l'API est en snake_case : aucune conversion, les types reflètent
  le schéma.
- Nouvelles dépendances : installer avec
  `docker compose exec frontend npm install ...`, commiter
  `package-lock.json`, puis vérifier à la fin qu'un
  `docker compose build frontend` passe (cas d'un nouveau poste).
- Tests avec Vitest, React Testing Library et MSW (installer l'outillage s'il
  manque, avec un script `npm run test`) :
  - un seul appel `/api/auth/refresh` pour plusieurs 401 simultanés,
  - un seul rejeu après refresh, et pas de boucle si le refresh échoue,
  - démarrage sous `StrictMode` : un seul refresh,
  - `ProtectedRoute` : redirection, retour à la destination, rejet d'une
    destination externe,
  - login : succès, 401, 429,
  - logout : cache vidé, échec de l'appel API sans effet sur la
    déconnexion locale.
- `npm run lint`, `npm run test` et `tsc` sans erreur avant chaque commit.
- Jamais de token ni de mot de passe dans les logs, les snapshots de tests
  ou les commits.
- Proposer le plan avant d'écrire du code et attendre mon accord.

## Critères de fin

- Sans session, `http://localhost:5174` redirige vers `/login`.
- Login avec le compte de dev (`dev@example.com`, mot de passe dans
  `backend/.env.local`) : l'accueil affiche Bernadette.
- Recharger la page conserve la session grâce au refresh silencieux.
- Un access token expiré est renouvelé de façon transparente (couvert par
  les tests).
- Deux onglets ouverts : aucune déconnexion intempestive après un refresh
  dans l'un d'eux.
- Logout : retour à `/login`, rechargement toujours anonyme, cache vidé.
- Tests, lint et `tsc` verts.
