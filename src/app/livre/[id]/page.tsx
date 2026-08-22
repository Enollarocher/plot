import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnTeteSimple } from "@/components/EnTeteSimple";
import { BookCover } from "@/components/BookCover";
import { Avatar } from "@/components/Avatar";
import { LIBELLE_STATUT, type Statut } from "@/lib/shelf";

type LigneLecteurBrute = {
  user_id: string;
  statut: Statut;
  note: number | null;
  profil: { pseudo: string } | null;
};

export default async function LivrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: livre }, { data: monProfil }] = await Promise.all([
    supabase
      .from("books")
      .select("id, titre, auteur, couverture_url, pages, resume")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("pseudo").eq("id", user.id).single(),
  ]);

  if (!livre) notFound();

  const { data: lignes } = await supabase
    .from("user_books")
    .select("user_id, statut, note, profil:profiles(pseudo)")
    .eq("book_id", id)
    .in("statut", ["lu", "en_cours", "abandonne"])
    .returns<LigneLecteurBrute[]>();

  const toutes = lignes || [];
  const moi = toutes.find((l) => l.user_id === user.id);
  const abonnements = toutes.filter((l) => l.user_id !== user.id && l.profil);

  return (
    <div>
      <EnTeteSimple />
      <div className="plot-shell">
        <div className="plot-livre-tete">
          <BookCover couverture={livre.couverture_url} graine={livre.id} taille="grande" />
          <div>
            <h1 className="plot-livre-titre">{livre.titre}</h1>
            <p className="plot-auteur">
              {livre.auteur}
              {livre.pages ? ` · ${livre.pages} p.` : ""}
            </p>
          </div>
        </div>

        <p className="plot-livre-resume">
          {livre.resume || "Pas de résumé disponible pour ce livre."}
        </p>

        <p className="plot-membres-titre">Chez tes abonnements</p>

        {moi && (
          <div className="plot-lecteur-ligne">
            <Avatar pseudo={monProfil?.pseudo || "?"} size={22} />
            <strong>Toi</strong>
            <span className="plot-lecteur-statut">
              {LIBELLE_STATUT[moi.statut]}
              {moi.statut === "lu" && moi.note ? ` · ${moi.note}/5` : ""}
            </span>
          </div>
        )}

        {abonnements.length === 0 ? (
          <p className="plot-chargement">
            Personne de tes abonnements n&apos;a encore ce livre sur son étagère.
          </p>
        ) : (
          abonnements.map((l) => (
            <Link key={l.user_id} href={`/profil/${l.profil!.pseudo}`} className="plot-lecteur-ligne">
              <Avatar pseudo={l.profil!.pseudo} size={22} />
              <strong>{l.profil!.pseudo}</strong>
              <span className="plot-lecteur-statut">
                {LIBELLE_STATUT[l.statut]}
                {l.statut === "lu" && l.note ? ` · ${l.note}/5` : ""}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
