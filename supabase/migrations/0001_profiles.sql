-- Plot — Phase 1 : comptes utilisateurs & création automatique de profil
--
-- À exécuter dans Supabase Dashboard → SQL Editor (ou via `supabase db push`
-- si tu es connectée avec la CLI). Ce script est idempotent : il peut être
-- rejoué sans casser une base déjà migrée.

-- 1. Table des profils --------------------------------------------------
-- Un profil = une ligne, créée automatiquement à l'inscription (cf. trigger
-- plus bas). L'id est le même que celui de auth.users : un compte = un profil.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null unique,
  bio text not null default '',
  avatar_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Profil public d''une utilisatrice Plot, créé automatiquement à l''inscription.';

-- Format de pseudo : lettres minuscules, chiffres, tiret/underscore/point,
-- 3 à 24 caractères. Garantit un identifiant "unique et vérifié".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_pseudo_format'
  ) then
    alter table public.profiles
      add constraint profiles_pseudo_format
      check (pseudo ~ '^[a-z0-9_.-]{3,24}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_bio_length'
  ) then
    alter table public.profiles
      add constraint profiles_bio_length check (char_length(bio) <= 280);
  end if;
end $$;

-- 2. Row Level Security ---------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Les profils sont visibles par les utilisatrices connectées" on public.profiles;
create policy "Les profils sont visibles par les utilisatrices connectées"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Une utilisatrice modifie uniquement son propre profil" on public.profiles;
create policy "Une utilisatrice modifie uniquement son propre profil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Pas de policy insert/delete côté client : la création se fait uniquement
-- via le trigger ci-dessous (security definer), la suppression suit celle
-- du compte auth.users (on delete cascade).

-- 3. updated_at automatique ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 4. Création automatique du profil à l'inscription -----------------------
-- Le pseudo choisi au formulaire d'inscription est transmis via
-- `options.data.pseudo` de `supabase.auth.signUp()` et atterrit dans
-- `raw_user_meta_data`. On le nettoie et on garantit son unicité ici, en
-- dernier rempart derrière la vérification déjà faite côté client.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_pseudo text;
  final_pseudo text;
  suffixe int := 0;
begin
  base_pseudo := lower(coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'pseudo'), ''),
    split_part(new.email, '@', 1)
  ));
  base_pseudo := regexp_replace(base_pseudo, '[^a-z0-9_.-]', '-', 'g');
  base_pseudo := regexp_replace(base_pseudo, '-{2,}', '-', 'g');
  base_pseudo := trim(both '-' from base_pseudo);

  if base_pseudo is null or length(base_pseudo) < 3 then
    base_pseudo := 'lectrice-' || substr(new.id::text, 1, 8);
  end if;

  base_pseudo := substr(base_pseudo, 1, 24);
  final_pseudo := base_pseudo;

  while exists (select 1 from public.profiles where pseudo = final_pseudo) loop
    suffixe := suffixe + 1;
    final_pseudo := substr(base_pseudo, 1, 24 - length(suffixe::text) - 1) || '-' || suffixe;
  end loop;

  insert into public.profiles (id, pseudo, bio)
  values (new.id, final_pseudo, '');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Vérification de disponibilité d'un pseudo (formulaire d'inscription) --
-- Fonction dédiée pour ne PAS exposer la table profiles (bios, etc.) aux
-- personnes non connectées : elle ne renvoie qu'un booléen.
create or replace function public.pseudo_disponible(p text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where pseudo = lower(trim(p))
  );
$$;

grant execute on function public.pseudo_disponible(text) to anon, authenticated;
