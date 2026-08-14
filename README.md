# Plot — *The plot gets better.*

Réseau social de lecture entre copines : étagères, Book Clubs par genre, fil
d'activité et abonnements. Stack : **Next.js (App Router)** + **Supabase**
(Auth, Postgres, RLS).

Le design system (couleurs, typographies, composants) est porté à l'identique
du prototype de référence (`marge-prototype3.jsx`) et du cahier des charges
v2 — voir `src/app/globals.css`.

## État du projet — Phases 1 à 4 livrées

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
✅ **Fil d'activité en temps réel via une cloche de notification** (en haut
à droite, pas un onglet dédié) : badge avec compteur de mouvement non vu,
réactions (cœur) et commentaires sur chaque entrée, nouvelles entrées
poussées en direct (Supabase Realtime) chez toutes les utilisatrices
connectées.

✅ **Book Clubs, abonnements et confidentialité** : créer un club (public ou
privé), le rejoindre en un clic s'il est public ou sur invitation
s'il est privé, messagerie de salon en temps réel, invitation par pseudo
avec suggestions issues des abonnements ; abonnements instantanés à sens
unique avec onglet « Qui me suit » ; les messages des clubs publics
apparaissent dans le fil d'activité (clic dessus → ouvre le salon), ceux
des clubs privés restent confinés au club.

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
   - [`supabase/migrations/0003_storage_couvertures.sql`](./supabase/migrations/0003_storage_couvertures.sql) *(déjà fait ✅)*
   - [`supabase/migrations/0004_activity_feed.sql`](./supabase/migrations/0004_activity_feed.sql) *(déjà fait ✅)*
   - [`supabase/migrations/0005_clubs_follows.sql`](./supabase/migrations/0005_clubs_follows.sql) *(déjà fait ✅)*

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

`0004_activity_feed.sql` crée :
- la table `activity_feed` (type `moment` / `termine` / `commence`, contenu
  jsonb), alimentée automatiquement par les actions sur les étagères ;
- `activity_reactions` (cœurs) et `activity_comments`, avec RLS lecture
  ouverte aux utilisatrices connectées, écriture limitée à son propre nom ;
- la colonne `profiles.dernier_vu_activite`, utilisée pour calculer le
  badge « non vu » de la cloche ;
- l'ajout de `activity_feed` à la publication `supabase_realtime`, pour que
  les nouvelles entrées arrivent en direct dans l'app.

`0005_clubs_follows.sql` crée :
- `follows` (abonnements) : ajout instantané à sens unique, façon
  Strava/Instagram, comme le prototype — pas de demande à accepter. Le
  réseau (qui suit qui) est visible par toute utilisatrice connectée, pour
  permettre l'onglet « Qui me suit » ;
- `clubs`, `club_members` (`statut` `invite` / `accepte`) et
  `club_messages` : un club privé n'est visible que par ses membres
  acceptés, un club public par toutes ; on **rejoint un club public en un
  clic**, un **club privé nécessite une invitation** par un membre déjà
  accepté puis acceptation par l'invitée ; la créatrice d'un club y est
  ajoutée automatiquement comme membre acceptée (trigger
  `on_club_created`) ;
- la fonction `est_membre_accepte()` (security definer), qui évite la
  récursion RLS quand une policy doit vérifier l'appartenance à un club ;
- élargit la contrainte de type de `activity_feed` pour accepter `message`
  (messages de club publiés dans le fil) ;
- ajoute `club_messages` à la publication `supabase_realtime`.

Les cinq scripts sont idempotents : tu peux les rejouer sans risque.

⚠️ Si Realtime est explicitement désactivé sur ton projet (Database →
Replication), active-le pour `activity_feed` et `club_messages` — la cloche
et la messagerie fonctionneront quand même sans, simplement sans mise à
jour en direct.

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
    AppShell.tsx                                            état global (profil, étagères, salons), en-tête, nav
    EtageresListe.tsx, AjouterLivrePanel.tsx                 sous-onglets, recherche/ajout manuel
    BookCard.tsx, EncoursCard.tsx, BookCover.tsx              cartes de livre (envie/lu, en cours)
    NotificationBell.tsx, ActivEntry.tsx                      cloche + panneau déroulant du fil d'activité
    SalonsListe.tsx, SalonAccordion.tsx                       liste des clubs, création, accordéon (messages/membres)
    AbonnementsSection.tsx                                    suivre par pseudo, mes abonnements, qui me suit
    icons/Etoile.tsx, icons/CodeBarres.tsx,                   pictogrammes dessinés à la main (SVG)
    icons/Cloche.tsx, icons/Coeur.tsx
    PlotMark.tsx, Avatar.tsx, GoogleAuthButton.tsx
  lib/supabase/                                               clients browser/server + middleware de session
  lib/pseudo.ts, lib/shelf.ts, lib/googleBooks.ts              règles pseudo, types étagère, recherche Google Books
  lib/storage.ts                                                upload + validation des photos de couverture
  lib/activity.ts, lib/temps.ts                                 types du fil d'activité, formatage relatif des dates
  lib/clubs.ts                                                  types Book Clubs, génération du code de classification
supabase/migrations/
  0001_profiles.sql                                           comptes & création auto du profil (Phase 1)
  0002_books.sql                                               catalogue de livres & étagères (Phase 2)
  0003_storage_couvertures.sql                                bucket + policies pour les photos de couverture
  0004_activity_feed.sql                                      fil d'activité, réactions, commentaires, Realtime (Phase 3)
  0005_clubs_follows.sql                                      Book Clubs, abonnements, confidentialité (Phase 4)
```

## Notes de conception — Phase 4

Règles confirmées après clarification :

- **Abonnements instantanés, à sens unique** : `follows` n'a pas de
  `statut` — un `insert` vaut abonnement immédiat, comme le prototype
  (façon Strava/Instagram). Le réseau est visible par toute utilisatrice
  connectée (RLS `using (true)` en lecture), pour permettre l'onglet
  « Qui me suit ».
- **Clubs publics = un clic, clubs privés = invitation** : la policy
  d'insertion sur `club_members` autorise soit une utilisatrice à
  s'ajouter elle-même directement si `clubs.prive = false` (statut
  `accepte` immédiat), soit un membre déjà accepté à inviter quelqu'un
  (statut `invite`, pour un club public ou privé) — seule l'invitée peut
  ensuite passer sa ligne à `accepte`. Un club privé n'apparaît donc que
  pour ses membres accepté·es (policy de lecture sur `clubs`), et ne peut
  être rejoint que via ce chemin d'invitation.
- **`est_membre_accepte()` en security definer** : une policy RLS sur
  `club_members` qui doit vérifier l'appartenance à un club ne peut pas
  interroger `club_members` elle-même sans provoquer une récursion — la
  fonction contourne ça (même mécanisme que `handle_new_user` en Phase 1).
- **Messages de club privé exclus du fil global** : `activity_feed` est
  visible par *toute* utilisatrice connectée (choix fait en Phase 3, pour
  un fil simple non filtré par abonnements). Publier automatiquement
  chaque message de club dans ce fil aurait donc fuité le nom et le
  contenu d'un club privé à des personnes qui n'en sont pas membres — ce
  que la confidentialité de la Phase 4 interdit explicitement. Résultat :
  seuls les messages des clubs **publics** sont mirroités dans le fil
  (`activity_feed.type = 'message'`) ; ceux des clubs privés restent
  visibles uniquement via `club_messages`, à ses membres. Cliquer sur une
  entrée de message dans le fil ouvre directement le salon correspondant.
- **Suggestions d'invitation** : dans un club ouvert, les personnes que tu
  suis et qui n'en sont pas déjà membres apparaissent comme raccourcis
  d'invitation (« + pseudo »), comme dans le prototype.
- **Compteurs Abonnements / Abonnés** : désormais branchés sur les vraies
  données dans la barre de stats du profil (`AbonnementsSection` remonte
  les comptes à `AppShell` une fois chargés).

## Notes de conception — Phase 3

- **Cloche plutôt qu'onglet** : le prototype (`marge-prototype3.jsx`) avait
  « Activité » comme onglet de navigation classique, mais le cahier des
  charges v2 demande explicitement une cloche de notification en haut à
  droite avec menu déroulant (« pas un onglet dédié »). J'ai suivi le
  cahier, qui prime ici sur le code du prototype — l'onglet « Activité » a
  été retiré de la navigation.
- **Fil global, pas encore filtré par abonnements** : toute utilisatrice
  connectée voit l'activité de tout le monde (comme le fil par défaut du
  prototype). La restriction par abonnements/confidentialité arrive avec
  les Book Clubs en Phase 4.
- **Temps réel** : une seule souscription Realtime (`postgres_changes` sur
  `activity_feed`) suffit à propager les nouvelles entrées à toutes les
  utilisatrices connectées ; le badge s'incrémente si le panneau est fermé,
  la liste se met à jour en direct s'il est ouvert. Réactions et
  commentaires ne sont pas (encore) synchronisés en direct entre plusieurs
  panneaux ouverts simultanément — rechargés à chaque ouverture.
- **Type `message`** : prévu par le cahier des charges pour les futurs
  messages de Book Club, mais pas encore utilisé (les salons n'existent pas
  avant la Phase 4) — la contrainte `activity_feed_type_valide` n'accepte
  pour l'instant que `moment` / `termine` / `commence`.

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
