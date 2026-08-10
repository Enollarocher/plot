# Plot — *The plot gets better.*

Réseau social de lecture entre copines : étagères, Book Clubs par genre, fil
d'activité et abonnements. Stack : **Next.js (App Router)** + **Supabase**
(Auth, Postgres, RLS).

Le design system (couleurs, typographies, composants) est porté à l'identique
du prototype de référence (`marge-prototype3.jsx`) et du cahier des charges
v2 — voir `src/app/globals.css`.

## État du projet — Phases 1 & 2 livrées

✅ **Authentification** (e-mail + mot de passe, connexion Google), avec
inscription, connexion, déconnexion, mot de passe oublié / réinitialisation.
✅ **Création automatique du profil** : dès qu'un compte est créé (peu
importe la méthode), un trigger PostgreSQL crée la ligne `profiles`
correspondante — aucune étape manuelle côté client.
✅ **Étagères en trois statuts** (Envie de lire / En cours / Lu), recherche
de livre par titre/auteur/ISBN via l'API Google Books avec ajout manuel en
repli (titre, auteur, pages, résumé), catalogue de livres partagé et
dédupliqué entre utilisatrices.
✅ **Plot Moments & fin de lecture automatique** : réactions libres postées
pendant qu'un livre est « en cours », notation par étoiles à la fin sans
aucune saisie de texte, le dernier Plot Moment devient la note affichée une
fois le livre terminé.
✅ **Photo de couverture pour les ajouts manuels** : upload vers Supabase
Storage (bucket `couvertures`) quand le livre n'est pas trouvé via Google
Books.

🚧 À venir : fil d'activité temps réel + cloche de notification (Phase 3),
Book Clubs, abonnements et confidentialité (Phase 4).

## 1. Installer et lancer en local

```bash
npm install
npm run dev
```

Les variables d'environnement sont déjà dans `.env.local` (non versionné) :

```
NEXT_PUBLIC_SUPABASE_URL=https://otopafjoksdmytgnqiis.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

`.env.example` documente le format attendu si tu dois recréer ce fichier
(nouvelle machine, déploiement...).

## 2. Appliquer le schéma de base de données ⚠️ requis

Cette session n'a pas d'accès réseau sortant vers Supabase (politique de
l'environnement d'exécution) : **la migration n'a pas encore été exécutée
sur ton projet**, il faut le faire manuellement une fois :

1. Ouvre le **SQL Editor** de ton projet Supabase
   (`https://supabase.com/dashboard/project/otopafjoksdmytgnqiis/sql/new`).
2. Colle et exécute, **dans l'ordre**, le contenu de :
   - [`supabase/migrations/0001_profiles.sql`](./supabase/migrations/0001_profiles.sql) *(déjà fait ✅)*
   - [`supabase/migrations/0002_books.sql`](./supabase/migrations/0002_books.sql) *(déjà fait ✅)*
   - [`supabase/migrations/0003_storage_couvertures.sql`](./supabase/migrations/0003_storage_couvertures.sql) *(nouveau)*

`0001_profiles.sql` crée :
- la table `profiles` (`id`, `pseudo` unique, `bio`, horodatages) avec RLS
  activée (lecture par toute utilisatrice connectée, modification limitée à
  soi-même) ;
- la fonction + trigger `handle_new_user` / `on_auth_user_created` qui crée
  automatiquement le profil à la création d'un compte (`auth.users`), en
  dérivant un pseudo unique à partir de celui choisi à l'inscription (ou de
  l'e-mail en repli) ;
- la fonction `pseudo_disponible(text)` utilisée par le formulaire
  d'inscription pour vérifier la disponibilité d'un pseudo en direct, sans
  exposer la table `profiles` aux personnes non connectées.

`0002_books.sql` crée :
- la table `books` (catalogue partagé : titre, auteur, couverture, pages,
  résumé, isbn), dédupliquée par `google_volume_id` pour les résultats de
  recherche — un ajout manuel crée toujours une nouvelle ligne ;
- la table `user_books` (étagère personnelle : `statut` parmi `envie` /
  `en_cours` / `lu`, `note`, `dernier_moment`), avec RLS limitant chaque
  utilisatrice à sa propre étagère.

`0003_storage_couvertures.sql` crée :
- le bucket Storage `couvertures` (public en lecture, 5 Mo max, JPEG / PNG /
  WEBP / GIF uniquement) ;
- les policies RLS sur `storage.objects` : chaque utilisatrice ne peut
  écrire/modifier/supprimer que dans son propre dossier (`<user_id>/...`),
  la lecture est publique (nécessaire pour afficher les couvertures).

Les trois scripts sont idempotents : tu peux les rejouer sans risque.

## 3. Configurer Supabase Auth (dashboard)

### URLs de redirection
**Authentication → URL Configuration** :
- **Site URL** : ton URL de déploiement (ex. `https://plot.vercel.app`), ou
  `http://localhost:3000` en local.
- **Redirect URLs** : ajoute `http://localhost:3000/**` (dev) et l'équivalent
  en prod, ex. `https://plot.vercel.app/**`.

### Connexion Google
**Authentication → Sign In / Providers → Google** :
1. Crée un identifiant OAuth 2.0 dans
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   (type *Web application*).
2. Dans **Authorized redirect URIs** côté Google, ajoute l'URL de callback
   affichée par Supabase sur cette page (`https://<projet>.supabase.co/auth/v1/callback`).
3. Reporte le *Client ID* et le *Client Secret* dans Supabase et active le
   provider.

Ces étapes nécessitent un accès au dashboard que je n'ai pas — à faire de ton
côté. Le bouton « Continuer avec Google » de l'app est déjà branché et
fonctionnera dès que le provider sera activé.

### Templates d'e-mail (confirmation d'inscription + réinitialisation)
Par défaut, les templates Supabase pointent vers l'endpoint de vérification
géré par Supabase lui-même. Pour que les liens ramènent proprement sur les
routes de l'app (`/auth/confirm`), va dans **Authentication → Email
Templates** et remplace, dans les templates *Confirm signup* et *Reset
password*, le lien `{{ .ConfirmationURL }}` par :

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&next=/
```

(pour *Reset password*, mets `next=/update-password`).

## 4. Déploiement

Sur Vercel (ou équivalent) : renseigne `NEXT_PUBLIC_SUPABASE_URL` et
`NEXT_PUBLIC_SUPABASE_ANON_KEY` dans les variables d'environnement du
projet, puis mets à jour Site URL / Redirect URLs côté Supabase avec le
domaine final.

## Structure

```
src/
  app/
    login/, signup/, forgot-password/, update-password/   pages publiques
    auth/callback/, auth/confirm/                          routes OAuth & liens e-mail
    page.tsx                                                accueil protégée (profil + étagères)
  components/
    AppShell.tsx                                            état global (profil, étagères), en-tête, nav
    EtageresListe.tsx, AjouterLivrePanel.tsx                 sous-onglets, recherche/ajout manuel
    BookCard.tsx, EncoursCard.tsx, BookCover.tsx              cartes de livre (envie/lu, en cours)
    icons/Etoile.tsx, icons/CodeBarres.tsx                    pictogrammes dessinés à la main (SVG)
    PlotMark.tsx, Avatar.tsx, GoogleAuthButton.tsx
  lib/supabase/                                               clients browser/server + middleware de session
  lib/pseudo.ts, lib/shelf.ts, lib/googleBooks.ts              règles pseudo, types étagère, recherche Google Books
  lib/storage.ts                                                upload + validation des photos de couverture
supabase/migrations/
  0001_profiles.sql                                           comptes & création auto du profil (Phase 1)
  0002_books.sql                                               catalogue de livres & étagères (Phase 2)
  0003_storage_couvertures.sql                                bucket + policies pour les photos de couverture
```

## Notes de conception — Phase 2

- **Recherche** : appel direct depuis le navigateur à l'API publique Google
  Books (`googleapis.com/books/v1/volumes`), sans clé — identique au
  prototype. Aucune route serveur nécessaire.
- **Déduplication du catalogue** : un livre trouvé via la recherche est
  upserté par `google_volume_id`, donc partagé entre toutes les
  utilisatrices qui l'ajoutent ; un ajout manuel n'est jamais dédupliqué
  (pas d'identifiant fiable).
- **« Ajouté par toi »** : le champ `par` du prototype (recommandation par
  une amie) n'est pas encore branché — il dépend des abonnements (Phase 4).
  Pour l'instant chaque livre ajouté est simplement le tien.
- **Plot Moments** : seul le *dernier* moment posté est conservé
  (`user_books.dernier_moment`), conformément à la règle du cahier des
  charges. L'historique complet de chaque moment posté (pour le fil
  d'activité) sera ajouté en Phase 3 avec la table `activity_feed`.
