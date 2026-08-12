-- Plot — Phase 4 (1/2) : modèle de données — Book Clubs, abonnements,
-- confidentialité.
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0004. Idempotent :
-- peut être rejoué sans casser une base déjà migrée.
--
-- Règles confirmées :
--   1. Abonnements : ajout instantané à sens unique (façon Strava/Instagram),
--      pas de demande à accepter — comportement du prototype.
--   2. Clubs publics : on rejoint en un clic. Clubs privés : invitation par
--      un membre déjà accepté, puis acceptation par l'invitée.

-- 1. Abonnements (instantanés, à sens unique) ---------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  suivi_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, suivi_id)
);

comment on table public.follows is
  'Abonnement entre utilisatrices : follower_id suit suivi_id, effectif immédiatement (pas de demande/acceptation).';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'follows_pas_soi_meme') then
    alter table public.follows add constraint follows_pas_soi_meme check (follower_id <> suivi_id);
  end if;
end $$;

alter table public.follows enable row level security;

-- Le réseau (qui suit qui) est visible par toute utilisatrice connectée —
-- comme sur Strava/Instagram, y compris pour retrouver "Qui me suit".
drop policy if exists "Le réseau d'abonnements est visible par les connectées" on public.follows;
create policy "Le réseau d'abonnements est visible par les connectées"
  on public.follows for select
  to authenticated
  using (true);

drop policy if exists "Suivre quelqu'un en son nom" on public.follows;
create policy "Suivre quelqu'un en son nom"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

-- Se désabonner, ou retirer une abonnée de sa propre liste de suiveuses.
drop policy if exists "Se désabonner ou retirer une abonnée" on public.follows;
create policy "Se désabonner ou retirer une abonnée"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = suivi_id);

create index if not exists follows_suivi_id_idx on public.follows (suivi_id);
create index if not exists follows_follower_id_idx on public.follows (follower_id);

-- 2. Book Clubs ---------------------------------------------------------------
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  livre_actuel text,
  code text not null unique,
  cree_par uuid not null references public.profiles (id) on delete cascade,
  prive boolean not null default false,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'clubs_nom_non_vide') then
    alter table public.clubs add constraint clubs_nom_non_vide check (char_length(trim(nom)) > 0);
  end if;
end $$;

-- 3. Membres de club -----------------------------------------------------------
-- Club public : on rejoint directement (statut accepte dès l'insertion).
-- Club privé : un membre déjà accepté invite par pseudo (statut invite),
-- puis l'invitée doit accepter elle-même.
create table if not exists public.club_members (
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'membre',
  statut text not null default 'invite',
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'club_members_role_valide') then
    alter table public.club_members add constraint club_members_role_valide check (role in ('createur', 'membre'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'club_members_statut_valide') then
    alter table public.club_members add constraint club_members_statut_valide check (statut in ('invite', 'accepte'));
  end if;
end $$;

-- Fonction utilitaire (security definer) : évite la récursion RLS quand une
-- policy sur club_members (ou clubs, club_messages) a besoin de vérifier
-- l'appartenance à un club.
create or replace function public.est_membre_accepte(p_club_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id and user_id = p_user_id and statut = 'accepte'
  );
$$;

-- Ajoute automatiquement la créatrice d'un club comme membre accepté
-- (impossible de passer par une policy d'insertion normale : elles exigent
-- déjà d'être membre du club, ce qui n'existe pas encore à la création).
create or replace function public.handle_new_club()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.club_members (club_id, user_id, role, statut)
  values (new.id, new.cree_par, 'createur', 'accepte');
  return new;
end;
$$;

drop trigger if exists on_club_created on public.clubs;
create trigger on_club_created
  after insert on public.clubs
  for each row execute function public.handle_new_club();

alter table public.clubs enable row level security;

-- Un club public est visible par toutes ; un club privé seulement par ses
-- membres accepté·es.
drop policy if exists "Voir les clubs publics et ceux dont je suis membre" on public.clubs;
create policy "Voir les clubs publics et ceux dont je suis membre"
  on public.clubs for select
  to authenticated
  using (prive = false or public.est_membre_accepte(id, auth.uid()));

drop policy if exists "Créer un club en son nom" on public.clubs;
create policy "Créer un club en son nom"
  on public.clubs for insert
  to authenticated
  with check (auth.uid() = cree_par);

drop policy if exists "La créatrice modifie son club" on public.clubs;
create policy "La créatrice modifie son club"
  on public.clubs for update
  to authenticated
  using (auth.uid() = cree_par)
  with check (auth.uid() = cree_par);

drop policy if exists "La créatrice supprime son club" on public.clubs;
create policy "La créatrice supprime son club"
  on public.clubs for delete
  to authenticated
  using (auth.uid() = cree_par);

alter table public.club_members enable row level security;

-- Voit sa propre ligne (ex. invitation reçue) + le reste du roster si elle
-- est déjà membre acceptée du club.
drop policy if exists "Voir sa ligne ou le roster d'un club dont on est membre" on public.club_members;
create policy "Voir sa ligne ou le roster d'un club dont on est membre"
  on public.club_members for select
  to authenticated
  using (auth.uid() = user_id or public.est_membre_accepte(club_id, auth.uid()));

-- Insertion : soit on rejoint soi-même un club PUBLIC (statut accepte
-- immédiat), soit un membre déjà accepté invite quelqu'un (statut invite,
-- pour un club public ou privé).
drop policy if exists "Rejoindre un club public, ou être invitée par un membre" on public.club_members;
create policy "Rejoindre un club public, ou être invitée par un membre"
  on public.club_members for insert
  to authenticated
  with check (
    (
      auth.uid() = user_id
      and statut = 'accepte'
      and exists (select 1 from public.clubs c where c.id = club_id and c.prive = false)
    )
    or (
      statut = 'invite'
      and public.est_membre_accepte(club_id, auth.uid())
    )
  );

-- Seule l'invitée peut accepter sa propre invitation (et uniquement passer
-- de invité à accepté — `role` reste inchangé, pas d'auto-promotion possible).
drop policy if exists "Accepter sa propre invitation" on public.club_members;
create policy "Accepter sa propre invitation"
  on public.club_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and statut = 'accepte' and role = 'membre');

-- Quitter le club soi-même, ou être retirée par la créatrice.
drop policy if exists "Quitter un club ou être retirée par la créatrice" on public.club_members;
create policy "Quitter un club ou être retirée par la créatrice"
  on public.club_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or exists (select 1 from public.clubs c where c.id = club_id and c.cree_par = auth.uid())
  );

-- 4. Messages de club -----------------------------------------------------------
create table if not exists public.club_messages (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  texte text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'club_messages_texte_valide') then
    alter table public.club_messages add constraint club_messages_texte_valide check (char_length(texte) between 1 and 1000);
  end if;
end $$;

alter table public.club_messages enable row level security;

drop policy if exists "Les membres acceptés lisent les messages du club" on public.club_messages;
create policy "Les membres acceptés lisent les messages du club"
  on public.club_messages for select
  to authenticated
  using (public.est_membre_accepte(club_id, auth.uid()));

drop policy if exists "Les membres acceptés écrivent en leur nom" on public.club_messages;
create policy "Les membres acceptés écrivent en leur nom"
  on public.club_messages for insert
  to authenticated
  with check (auth.uid() = user_id and public.est_membre_accepte(club_id, auth.uid()));

create index if not exists club_messages_club_id_idx on public.club_messages (club_id, created_at);

-- 5. Fil d'activité : les messages de club y apparaissent aussi -----------------
alter table public.activity_feed drop constraint if exists activity_feed_type_valide;
alter table public.activity_feed
  add constraint activity_feed_type_valide
  check (type in ('moment', 'termine', 'commence', 'message'));

-- 6. Realtime pour la messagerie de club -----------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'club_messages'
  ) then
    alter publication supabase_realtime add table public.club_messages;
  end if;
end $$;
