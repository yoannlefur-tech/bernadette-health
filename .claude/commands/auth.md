# Contexte

Projet bernadette-health (voir CLAUDE.md). Docker opérationnel, API Platform
et lexik/jwt-authentication-bundle installés, clés JWT générées. Pas encore
d'authentification.

## Clarté

Mets en place l'authentification de bout en bout :

### Backend

1. Entité User (email unique, password hashé, roles, created_at), UUID v7,
   migration Doctrine. Pas d'inscription publique.
2. Commande `app:create-user` (email, mot de passe via prompt masqué, option
   --admin).
3. Login JSON : POST /api/auth/login -> access token JWT 15 min.
4. Refresh : gesdinet/jwt-refresh-token-bundle, refresh token 30 jours dans
   un cookie HttpOnly, SameSite=Lax, Secure hors dev. Endpoints
   /api/auth/refresh et /api/auth/logout (invalide le refresh token).
5. Endpoint GET /api/me (ressource API Platform ou contrôleur) renvoyant
   l'utilisateur courant.
6. Dog <-> User en ManyToMany (owners). Une extension Doctrine API Platform
   filtre les collections pour ne renvoyer que les Dog de l'utilisateur,
   et un voter protège les opérations item. Les ressources liées à un Dog
   héritent de cette restriction.
7. CORS avec credentials (allow_credentials) pour l'origine du front.

### Frontend

1. AuthContext (hooks) : access token en mémoire, jamais dans localStorage,
   refresh silencieux au chargement de la page.
2. Client HTTP centralisé : ajoute le Bearer, sur 401 tente un refresh
   puis rejoue la requête une fois, sinon redirige vers /login.
3. Page de login MUI (react-hook-form + validation), route protégée
    (composant ProtectedRoute), bouton de déconnexion.

## Contraintes

- Conventions de CLAUDE.md. Tout via docker compose exec.
- Tests PHPUnit : login OK/KO, accès sans token = 401, accès à un Dog d'un
  autre utilisateur = 403/404, refresh et logout.
- Lance `npm run types:api` après les changements d'API.
- Un commit par étape (User, login, refresh, ownership, front).
- Propose le plan avant d'écrire du code et attends mon accord.

## Traçabilité

- Trait BlameableTrait : created_by et updated_by, ManyToOne nullable vers
  User, onDelete SET NULL. Appliqué à Dog, WeightEntry, Vaccination, VetVisit.
- Un listener Doctrine (prePersist/preUpdate) les remplit depuis le token
  de sécurité courant. Pas d'utilisateur (fixtures, console) = null.
- Exposés en lecture seule dans l'API (IRI de l'utilisateur).
- Une seule migration pour ajouter les 8 colonnes/FK, tests : créer une
  ressource connecté remplit created_by, la modifier remplit updated_by.

## Critères de fin

- Les tests passent, un curl login renvoie un token, /api/me répond avec le
  token et 401 sans, le login React fonctionne et survit à un rechargement
  de page.
