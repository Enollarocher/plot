-- Plot — Phase 2 : étagères & recherche de livres
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0001_profiles.sql.
-- Idempotent : peut être rejoué sans casser une base déjà migrée.

-- 1. Catalogue des livres --------------------------------------------------
-- Cache partagé entre toutes les utilisatrices : un livre trouvé via Google
-- Books n'est inséré/mis à jour qu'une fois (déduplication par
-- google_volume_id) ; un ajout manuel crée toujours une nouvelle ligne.
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  google_volume_id text unique,
  titre text not null,
  auteur text not null default 'Auteur inconnu',
  couverture_url text,
  pages integer,
  resume text,
  isbn text,
  created_at timestamptz not null default now()
);

comment on table public.books is
  'Catalogue de livres partagé : cache Google Books (dédupliqué par google_volume_id) + ajouts manuels.';

alter table public.books enable row level security;

drop policy if exists "Le catalogue est visible par les utilisatrices connectées" on public.books;
create policy "Le catalogue est visible par les utilisatrices connectées"
  on public.books for select
  to authenticated
  using (true);

drop policy if exists "Les utilisatrices connectées peuvent ajouter un livre" on public.books;
create policy "Les utilisatrices connectées peuvent ajouter un livre"
  on public.books for insert
  to authenticated
  with check (true);

drop policy if exists "Les utilisatrices connectées peuvent rafraîchir un livre du cache" on public.books;
create policy "Les utilisatrices connectées peuvent rafraîchir un livre du cache"
  on public.books for update
  to authenticated
  using (true)
  with check (true);

-- 2. Étagères ---------------------------------------------------------------
-- Une ligne = un livre sur l'étagère d'une utilisatrice, avec son statut.
create table if not exists public.user_books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  book_id uuid not null references public.books (id) on delete cascade,
  statut text not null default 'envie',
  note smallint,
  dernier_moment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, book_id)
);

comment on table public.user_books is
  'Étagère personnelle : statut de lecture d''une utilisatrice pour un livre du catalogue.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_books_statut_valide'
  ) then
    alter table public.user_books
      add constraint user_books_statut_valide
      check (statut in ('envie', 'en_cours', 'lu'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_books_note_valide'
  ) then
    alter table public.user_books
      add constraint user_books_note_valide
      check (note is null or note between 1 and 5);
  end if;
end $$;

alter table public.user_books enable row level security;

drop policy if exists "Une utilisatrice gère uniquement sa propre étagère" on public.user_books;
create policy "Une utilisatrice gère uniquement sa propre étagère"
  on public.user_books for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_books_set_updated_at on public.user_books;
create trigger user_books_set_updated_at
  before update on public.user_books
  for each row execute function public.set_updated_at();

create index if not exists user_books_user_id_statut_idx
  on public.user_books (user_id, statut);
