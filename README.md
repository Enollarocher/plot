# Plot — *The plot gets better.*

Réseau social de lecture entre copines : étagères, Book Clubs par genre, fil
d'activité et abonnements. Stack : **Next.js (App Router)** + **Supabase**
(Auth, Postgres, RLS).

Le design system (couleurs, typographies, composants) est porté à l'identique
du prototype de référence (`marge-prototype3.jsx`) et du cahier des charges
v2 — voir `src/app/globals.css`.

## État du projet — Phase 1 livrée

✅ **Authentification** (e-mail + mot de passe, connexion Google), avec
inscription, connexion, déconnexion, mot de passe oublié / réinitialisation.
✅ **Création automatique du profil** : dès qu'un compte est créé (peu
importe la méthode), un trigger PostgreSQL crée la ligne `profiles`
correspondante — aucune étape manuelle côté client.
✅ Page d'accueil protégée reprenant l'en-tête, la navigation et la carte de
profil (avatar, pseudo modifiable en ligne, bio) du prototype.

🚧 À venir : étagères + recherche de livres (Phase 2), fil d'activité temps
réel (Phase 3), Book Clubs et confidentialité (Phase 4).

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
2. Colle le contenu de [`supabase/migrations/0001_profiles.sql`](./supabase/migrations/0001_profiles.sql)
   et exécute-le.

Ce script crée :
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

Le script est idempotent : tu peux le rejouer sans risque.

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
    page.tsx                                                accueil protégée (profil)
  components/                                               PlotMark, Avatar, AppShell, GoogleAuthButton
  lib/supabase/                                             clients browser/server + middleware de session
  lib/pseudo.ts                                             règles de validation du pseudo
supabase/migrations/0001_profiles.sql                       schéma + trigger de création auto du profil
```
