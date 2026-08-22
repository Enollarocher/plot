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
✅ **Rôles de club façon WhatsApp** : administratrices (gèrent les membres et
les rôles, modifient le club), membres (publient des messages) et
observatrices (lecture seule).
✅ **Recherche par auteur avec pagination** : bibliographie complète d'une
autrice ou d'un auteur (`inauthor:`), avec « Voir plus » plutôt qu'un
mélange de quelques résultats.
✅ **Scan de code-barres** pour l'ISBN dans l'ajout manuel (API
`BarcodeDetector`), avec repli automatique et invisible sur la saisie
manuelle quand le navigateur ne le prend pas en charge (Safari/iOS
notamment).
✅ **Page profil d'un livre** (`/livre/[id]`) : couverture, auteur, résumé,
et qui parmi tes abonnements l'a lu / est en train de le lire / l'a
abandonné, avec sa note si disponible. Accessible en cliquant un titre
n'importe où (étagères, fil d'activité).
✅ **Page profil d'une utilisatrice** (`/profil/[pseudo]`) : avatar, bio,
statistiques (Lus / En cours / Envie de lire / Abandonnés / Abonnements /
Abonnés), listes consultables de « Mes abonnements » et « Qui me suit »,
objectifs de lecture. Pour le profil de quelqu'un d'autre : bouton
Suivre/Se désabonner, étagère et stats visibles seulement si tu la suis.
✅ **Statut « Abandonné » (DNF)** : quatrième statut d'étagère, accessible
depuis « En cours » à côté de « Terminer la lecture ».
✅ **Objectifs de lecture** : se fixer un nombre de livres sur une période
(ex. un défi annuel), barre de progression basée sur les livres marqués
Lus dans cette période.
✅ **Durée de lecture** : « depuis N jours » affiché sur chaque livre « En
cours ».

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
   - [`supabase/migrations/0006_club_roles.sql`](./supabase/migrations/0006_club_roles.sql) *(déjà fait ✅)*
   - [`supabase/migrations/0007_livre_profil_objectifs.sql`](./supabase/migrations/0007_livre_profil_objectifs.sql) *(nouveau)*

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

`0006_club_roles.sql` crée :
- trois rôles pour `club_members.role` : `administrateur` / `membre` /
  `observateur` (remplace l'ancien `createur`, migré automatiquement) ;
- les fonctions `est_administratrice()` et `peut_publier()` (security
  definer) ;
- les administratrices peuvent modifier le club, inviter, changer le rôle
  d'un membre déjà accepté et retirer quelqu'un ; les observatrices ne
  peuvent pas publier de message (`club_messages` policy d'insertion mise
  à jour).

`0007_livre_profil_objectifs.sql` crée :
- le statut `abandonne` sur `user_books.statut` ;
- `user_books.commence_le` / `termine_le`, posés par l'app au changement de
  statut (pas de report sur `updated_at`, qui bouge aussi pour un Plot
  Moment) — avec un remplissage best-effort pour les lignes déjà
  existantes ;
- **`user_books` devient lisible par tes abonnements**, pas seulement par
  toi (`select` seulement — `insert`/`update`/`delete` restent strictement
  privés). Nécessaire pour « qui de tes abonnements a lu ce livre » sur la
  page profil d'un livre : sans ce changement, `user_books` était
  strictement privée depuis la Phase 2 (choix par défaut avant que les
  abonnements existent) ;
- la table `objectifs_lecture` (cible, période), privée à chaque
  utilisatrice.

Les sept scripts sont idempotents : tu peux les rejouer sans risque.

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
    livre/[id]/                                             page profil d'un livre
    profil/, profil/[pseudo]/                               redirection vers son profil, page profil d'une utilisatrice
  components/
    AppShell.tsx                                            état global (profil, étagères, salons), en-tête, nav
    EtageresListe.tsx, AjouterLivrePanel.tsx                 sous-onglets, recherche/ajout manuel
    BookCard.tsx, EncoursCard.tsx, BookCover.tsx              cartes de livre (envie/lu/abandonné, en cours)
    NotificationBell.tsx, ActivEntry.tsx                      cloche + panneau déroulant du fil d'activité
    SalonsListe.tsx, SalonAccordion.tsx                       liste des clubs, création, accordéon (messages/membres/rôles)
    AbonnementsSection.tsx                                    suivre par pseudo, mes abonnements, qui me suit
    BarcodeScanner.tsx                                        scan ISBN (BarcodeDetector), avec repli manuel
    ProfilEditable.tsx                                        avatar/pseudo/bio/stats éditables (partagé Étagères + page profil)
    MonProfilVue.tsx, ProfilLectureSeule.tsx                  page profil : soi-même (éditable) vs quelqu'un d'autre (lecture seule + Suivre)
    ObjectifsLecture.tsx                                      créer un objectif, barre de progression
    EnTeteSimple.tsx                                          en-tête léger (livre, profil) avec lien retour
    icons/Etoile.tsx, icons/CodeBarres.tsx,                   pictogrammes dessinés à la main (SVG)
    icons/Cloche.tsx, icons/Coeur.tsx
    PlotMark.tsx, Avatar.tsx, GoogleAuthButton.tsx
  lib/supabase/                                               clients browser/server + middleware de session
  lib/pseudo.ts, lib/shelf.ts, lib/googleBooks.ts              règles pseudo, types étagère, recherche Google Books
  lib/storage.ts                                                upload + validation des photos de couverture
  lib/activity.ts, lib/temps.ts                                 types du fil d'activité, formatage relatif/durée
  lib/clubs.ts                                                  types Book Clubs, génération du code de classification
  lib/goals.ts                                                  types objectifs de lecture, calcul de progression
supabase/migrations/
  0001_profiles.sql                                           comptes & création auto du profil (Phase 1)
  0002_books.sql                                               catalogue de livres & étagères (Phase 2)
  0003_storage_couvertures.sql                                bucket + policies pour les photos de couverture
  0004_activity_feed.sql                                      fil d'activité, réactions, commentaires, Realtime (Phase 3)
  0005_clubs_follows.sql                                      Book Clubs, abonnements, confidentialité (Phase 4)
  0006_club_roles.sql                                         rôles administratrice / membre / observateur
  0007_livre_profil_objectifs.sql                             DNF, durée de lecture, étagère visible par les abonnements, objectifs
```

## Notes de conception — page livre, page profil, DNF, objectifs, durée

- **`user_books` ouverte aux abonnements (lecture seule)** : c'était le
  changement de modèle de données manquant pour « qui a lu ce livre » —
  voir le détail dans la description de `0007` ci-dessus. Écriture toujours
  strictement privée.
- **Stats d'une autre utilisatrice masquées si tu ne la suis pas** : sans
  ça, `user_books` renvoie un tableau vide pour une inconnue (RLS), ce qui
  afficherait des statistiques à 0 identiques à quelqu'un qui n'a
  vraiment rien lu — trompeur. La page profil distingue les deux avec un
  message « Suis {pseudo} pour voir son étagère » plutôt que de mentir
  avec des zéros.
- **Résumé absent pour les livres déjà ajoutés par recherche** : avant ce
  tour, `ajouterResultat` ne récupérait pas `volumeInfo.description` de
  Google Books (seul l'ajout manuel remplissait `resume`). Corrigé pour
  les nouveaux ajouts ; les livres déjà en base sans résumé affichent
  « Pas de résumé disponible pour ce livre. » — pas de ré-import
  rétroactif possible depuis une migration SQL.
- **`commence_le` / `termine_le` plutôt que `updated_at`** : `updated_at`
  bouge aussi quand on poste un Plot Moment sur un livre « en cours », ce
  qui aurait faussé « depuis combien de temps ». Deux horodatages dédiés,
  posés explicitement par l'app au changement de statut.
- **Abandonner ne publie rien dans le fil** : contrairement à commencer/
  terminer un livre, abandonner reste discret (pas d'entrée
  `activity_feed`) — non demandé, et probablement plus délicat à exposer
  automatiquement aux abonnements.
- **Objectifs de lecture strictement privés** : pas de policy de partage
  avec les abonnements pour l'instant (non demandé) ; seule la
  propriétaire voit et gère ses objectifs.
- **Bonus non demandé mais cohérent** : bouton Suivre/Se désabonner
  directement sur la page profil de quelqu'un d'autre (réutilise la même
  logique que le champ « Suivre un pseudo » déjà existant), et les titres
  de livres sont maintenant cliquables partout où ils apparaissent
  (étagères, fil d'activité) vers leur page profil.

- **Recherche par auteur** : `lib/googleBooks.ts` a un `rechercherParAuteur()`
  dédié, qui construit `q=inauthor:"<nom>"` (guillemets pour éviter que
  Google Books ne découpe le nom en mots-clés indépendants) et pagine via
  `startIndex`/`totalItems`. Distinct de la recherche rapide (`q=` libre,
  8 résultats) pour ne pas changer son comportement existant — un onglet
  « Parcourir un auteur » bascule entre les deux dans le panneau d'ajout.
- **Scan de code-barres** : `BarcodeDetector` n'a pas de types officiels
  dans `lib.dom.d.ts` et n'existe pas côté serveur ; `BarcodeScanner.tsx`
  le détecte via `'BarcodeDetector' in window` dans un `useEffect` (jamais
  au premier rendu, pour ne pas désaccorder l'hydratation) et n'affiche le
  bouton « Scanner » que si c'est vrai — sur Safari/iOS (non supporté), le
  bouton n'apparaît simplement pas et le champ ISBN reste saisissable à la
  main, sans aucun état d'erreur ni blocage.
- **Rôles de club** : trois rôles (`administrateur`/`membre`/`observateur`)
  au lieu du `createur` binaire de la Phase 4 initiale. Seules les
  administratrices invitent, changent les rôles et retirent des membres ;
  les observatrices ont un accès lecture seule (`club_messages` refuse
  leurs insertions au niveau RLS, pas seulement dans l'UI). Rejoindre
  soi-même un club public donne toujours le rôle `membre` — jamais
  `administrateur` — appliqué au niveau de la policy, pas seulement côté
  client.

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
