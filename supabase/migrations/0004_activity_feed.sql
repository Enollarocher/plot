-- Plot — Phase 3 : fil d'activité en temps réel & cloche de notification
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0003. Idempotent :
-- peut être rejoué sans casser une base déjà migrée.

-- 1. Fil d'activité ----------------------------------------------------------
-- Une ligne = un événement publié automatiquement (commencer un livre,
-- Plot Moment, fin de lecture). Le contenu varie selon `type`, stocké en
-- jsonb pour rester souple (titre du livre, note, texte du moment...).
create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  contenu jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_feed_type_valide'
  ) then
    alter table public.activity_feed
      add constraint activity_feed_type_valide
      check (type in ('moment', 'termine', 'commence'));
  end if;
end $$;

alter table public.activity_feed enable row level security;

drop policy if exists "Le fil est visible par les utilisatrices connectées" on public.activity_feed;
create policy "Le fil est visible par les utilisatrices connectées"
  on public.activity_feed for select
  to authenticated
  using (true);

drop policy if exists "Une utilisatrice publie uniquement en son nom" on public.activity_feed;
create policy "Une utilisatrice publie uniquement en son nom"
  on public.activity_feed for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists activity_feed_created_at_idx
  on public.activity_feed (created_at desc);

-- 2. Réactions (cœurs) -------------------------------------------------------
create table if not exists public.activity_reactions (
  activity_id uuid not null references public.activity_feed (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (activity_id, user_id)
);

alter table public.activity_reactions enable row level security;

drop policy if exists "Les réactions sont visibles par les utilisatrices connectées" on public.activity_reactions;
create policy "Les réactions sont visibles par les utilisatrices connectées"
  on public.activity_reactions for select
  to authenticated
  using (true);

drop policy if exists "Une utilisatrice réagit uniquement en son nom" on public.activity_reactions;
create policy "Une utilisatrice réagit uniquement en son nom"
  on public.activity_reactions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Une utilisatrice retire uniquement sa propre réaction" on public.activity_reactions;
create policy "Une utilisatrice retire uniquement sa propre réaction"
  on public.activity_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3. Commentaires -------------------------------------------------------------
create table if not exists public.activity_comments (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activity_feed (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  texte text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'activity_comments_texte_valide'
  ) then
    alter table public.activity_comments
      add constraint activity_comments_texte_valide
      check (char_length(texte) between 1 and 500);
  end if;
end $$;

alter table public.activity_comments enable row level security;

drop policy if exists "Les commentaires sont visibles par les utilisatrices connectées" on public.activity_comments;
create policy "Les commentaires sont visibles par les utilisatrices connectées"
  on public.activity_comments for select
  to authenticated
  using (true);

drop policy if exists "Une utilisatrice commente uniquement en son nom" on public.activity_comments;
create policy "Une utilisatrice commente uniquement en son nom"
  on public.activity_comments for insert
  to authenticated
  with check (auth.uid() = user_id);

create index if not exists activity_comments_activity_id_idx
  on public.activity_comments (activity_id, created_at);

-- 4. Badge « non vu » ---------------------------------------------------------
-- Horodatage de la dernière ouverture de la cloche par l'utilisatrice ;
-- déjà couvert par la policy "Une utilisatrice modifie uniquement son
-- propre profil" posée dans 0001_profiles.sql, aucune nouvelle policy
-- nécessaire ici.
alter table public.profiles
  add column if not exists dernier_vu_activite timestamptz;

-- 5. Realtime -------------------------------------------------------------
-- Permet à l'app de recevoir les nouvelles entrées du fil en direct
-- (postgres_changes). Sans ça, la cloche ne se mettrait à jour qu'au
-- prochain rechargement de page.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_feed'
  ) then
    alter publication supabase_realtime add table public.activity_feed;
  end if;
end $$;
