-- Plot — Rôles de club (administratrice / membre / observatrice), façon
-- groupes WhatsApp.
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0005. Idempotent :
-- peut être rejoué sans casser une base déjà migrée.
--
-- - administratrice : gère les membres (invite, retire, change les rôles),
--   modifie les infos du club, publie des messages.
-- - membre : publie des messages, ne gère pas les membres.
-- - observatrice : lecture seule, ne peut pas publier.
--
-- La créatrice d'un club devient administratrice (remplace l'ancien rôle
-- "createur", qui n'existait que pour la distinguer sans lui donner de
-- pouvoir réel).

-- 0. Migration des données existantes avant de resserrer la contrainte ----------
update public.club_members set role = 'administrateur' where role = 'createur';

-- 1. Nouvelle contrainte de rôle ------------------------------------------------
alter table public.club_members drop constraint if exists club_members_role_valide;
alter table public.club_members
  add constraint club_members_role_valide
  check (role in ('administrateur', 'membre', 'observateur'));

-- 2. La créatrice d'un club devient administratrice ------------------------------
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id, role, statut)
  values (new.id, new.cree_par, 'administrateur', 'accepte');
  return new;
end;
$$;

-- 3. Fonctions utilitaires (security definer) -----------------------------------
create or replace function public.est_administratrice(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and statut = 'accepte' and role = 'administrateur'
  );
$$;

create or replace function public.peut_publier(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and statut = 'accepte'
      and role in ('administrateur', 'membre')
  );
$$;

-- 4. clubs : une administratrice modifie aussi le club, pas seulement la créatrice
drop policy if exists "La créatrice modifie son club" on public.clubs;
create policy "La créatrice ou une administratrice modifie le club"
  on public.clubs for update
  to authenticated
  using (auth.uid() = cree_par or public.est_administratrice(id, auth.uid()))
  with check (auth.uid() = cree_par or public.est_administratrice(id, auth.uid()));

-- La suppression reste réservée à la créatrice (action irréversible).

-- 5. club_members : self-join toujours en tant que "membre" (jamais admin) ------
drop policy if exists "Rejoindre un club public, ou être invitée par un membre" on public.club_members;
create policy "Rejoindre un club public, ou être invitée par une administratrice"
  on public.club_members for insert
  to authenticated
  with check (
    (
      auth.uid() = user_id
      and statut = 'accepte'
      and role = 'membre'
      and exists (select 1 from public.clubs c where c.id = club_id and c.prive = false)
    )
    or (
      statut = 'invite'
      and role = 'membre'
      and public.est_administratrice(club_id, auth.uid())
    )
  );

-- 6. club_members : une administratrice change le rôle d'un membre déjà accepté -
-- (distincte de la policy d'auto-acceptation : celle-ci ne touche jamais au
-- statut, seulement au rôle, et ne s'applique qu'à des lignes déjà acceptées
-- — impossible pour une administratrice de forcer l'acceptation d'une
-- invitation à la place de l'invitée.)
drop policy if exists "Une administratrice change le rôle d'un membre" on public.club_members;
create policy "Une administratrice change le rôle d'un membre"
  on public.club_members for update
  to authenticated
  using (statut = 'accepte' and public.est_administratrice(club_id, auth.uid()))
  with check (statut = 'accepte' and public.est_administratrice(club_id, auth.uid()));

-- 7. club_members : une administratrice retire aussi un membre --------------------
drop policy if exists "Quitter un club ou être retirée par la créatrice" on public.club_members;
create policy "Quitter un club, ou être retirée par la créatrice/une administratrice"
  on public.club_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.est_administratrice(club_id, auth.uid())
    or exists (select 1 from public.clubs c where c.id = club_id and c.cree_par = auth.uid())
  );

-- 8. club_messages : une observatrice lit mais ne publie pas ----------------------
drop policy if exists "Les membres acceptés écrivent en leur nom" on public.club_messages;
create policy "Les membres et administratrices écrivent en leur nom"
  on public.club_messages for insert
  to authenticated
  with check (auth.uid() = user_id and public.peut_publier(club_id, auth.uid()));
