-- Plot — Storage : photos de couverture pour les ajouts manuels
--
-- À exécuter dans Supabase Dashboard → SQL Editor, après 0002_books.sql.
-- Idempotent : peut être rejoué sans casser une base déjà migrée.

-- 1. Bucket -----------------------------------------------------------------
-- Public en lecture (les couvertures s'affichent directement via leur URL),
-- écriture restreinte par policy ci-dessous. 5 Mo max, images courantes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'couvertures',
  'couvertures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS sur storage.objects --------------------------------------------------
-- Chaque utilisatrice ne peut écrire/supprimer que dans son propre dossier
-- (préfixe `<user_id>/...` du chemin) ; la lecture est publique puisque le
-- bucket lui-même est public (les couvertures doivent s'afficher pour tout
-- le monde, y compris sur l'étagère d'une amie plus tard).
alter table storage.objects enable row level security;

drop policy if exists "Couvertures : lecture publique" on storage.objects;
create policy "Couvertures : lecture publique"
  on storage.objects for select
  to public
  using (bucket_id = 'couvertures');

drop policy if exists "Couvertures : upload dans son propre dossier" on storage.objects;
create policy "Couvertures : upload dans son propre dossier"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'couvertures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Couvertures : mise à jour dans son propre dossier" on storage.objects;
create policy "Couvertures : mise à jour dans son propre dossier"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'couvertures'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'couvertures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Couvertures : suppression dans son propre dossier" on storage.objects;
create policy "Couvertures : suppression dans son propre dossier"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'couvertures'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
