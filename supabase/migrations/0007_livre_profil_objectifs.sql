-- Plot — Page profil d'un livre, profil utilisatrice complet, statut
-- Abandonné (DNF), objectifs de lecture, durée de lecture.
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0006. Idempotent :
-- peut être rejoué sans casser une base déjà migrée.

-- 1. Statut "Abandonné" (DNF) --------------------------------------------------
alter table public.user_books drop constraint if exists user_books_statut_valide;
alter table public.user_books
  add constraint user_books_statut_valide
  check (statut in ('envie', 'en_cours', 'lu', 'abandonne'));

-- 2. Durée de lecture -----------------------------------------------------------
-- `updated_at` ne convient pas : il bouge aussi quand on poste un Plot
-- Moment sur un livre "en cours", ce qui fausserait "depuis combien de
-- temps". Deux horodatages dédiés, posés explicitement par l'app au
-- changement de statut.
alter table public.user_books add column if not exists commence_le timestamptz;
alter table public.user_books add column if not exists termine_le timestamptz;

-- Best-effort pour les lignes déjà existantes (pas d'historique exact
-- disponible, on retombe sur le dernier horodatage de mise à jour connu).
update public.user_books set commence_le = updated_at
  where statut = 'en_cours' and commence_le is null;
update public.user_books set termine_le = updated_at
  where statut in ('lu', 'abandonne') and termine_le is null;

-- 3. Étagères visibles par ses abonnements ---------------------------------------
-- Nécessaire pour "qui parmi mes abonnements a lu ce livre" sur la page
-- profil d'un livre : jusqu'ici user_books était strictement privée
-- (choix par défaut de la Phase 2, avant que les abonnements existent).
-- On sépare l'ancienne policy "for all" en 4 policies : la lecture s'ouvre
-- aux abonnements, écriture/suppression restent strictement privées.
drop policy if exists "Une utilisatrice gère uniquement sa propre étagère" on public.user_books;

drop policy if exists "Voir sa propre étagère ou celle de ses abonnements" on public.user_books;
create policy "Voir sa propre étagère ou celle de ses abonnements"
  on public.user_books for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.follows
      where follower_id = auth.uid() and suivi_id = user_books.user_id
    )
  );

drop policy if exists "Ajouter uniquement à sa propre étagère" on public.user_books;
create policy "Ajouter uniquement à sa propre étagère"
  on public.user_books for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Modifier uniquement sa propre étagère" on public.user_books;
create policy "Modifier uniquement sa propre étagère"
  on public.user_books for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Retirer uniquement de sa propre étagère" on public.user_books;
create policy "Retirer uniquement de sa propre étagère"
  on public.user_books for delete
  to authenticated
  using (auth.uid() = user_id);

-- 4. Objectifs de lecture ---------------------------------------------------------
create table if not exists public.objectifs_lecture (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  cible integer not null,
  periode_debut date not null,
  periode_fin date not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'objectifs_lecture_cible_valide') then
    alter table public.objectifs_lecture add constraint objectifs_lecture_cible_valide check (cible > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'objectifs_lecture_periode_valide') then
    alter table public.objectifs_lecture add constraint objectifs_lecture_periode_valide check (periode_fin >= periode_debut);
  end if;
end $$;

alter table public.objectifs_lecture enable row level security;

-- Personnel : un objectif de lecture n'est visible/modifiable que par sa
-- propriétaire (pas de partage demandé pour l'instant).
drop policy if exists "Gérer uniquement ses propres objectifs" on public.objectifs_lecture;
create policy "Gérer uniquement ses propres objectifs"
  on public.objectifs_lecture for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists objectifs_lecture_user_id_idx on public.objectifs_lecture (user_id);
