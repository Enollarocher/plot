"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";

type Stats = { envie: number; en_cours: number; lu: number; abandonne: number } | null;

export function ProfilLectureSeule({
  moiId,
  profil,
  estSuiviInitial,
  stats,
  nbAbonnements,
  nbAbonnes,
}: {
  moiId: string;
  profil: { id: string; pseudo: string; bio: string };
  estSuiviInitial: boolean;
  stats: Stats;
  nbAbonnements: number;
  nbAbonnes: number;
}) {
  const supabase = createClient();
  const router = useRouter();

  const [estSuivi, setEstSuivi] = useState(estSuiviInitial);
  const [enCours, setEnCours] = useState(false);

  async function toggleSuivre() {
    if (enCours) return;
    setEnCours(true);

    if (estSuivi) {
      await supabase.from("follows").delete().eq("follower_id", moiId).eq("suivi_id", profil.id);
      setEstSuivi(false);
    } else {
      await supabase.from("follows").insert({ follower_id: moiId, suivi_id: profil.id });
      setEstSuivi(true);
    }

    setEnCours(false);
    router.refresh();
  }

  return (
    <>
      <div className="plot-profil">
        <Avatar pseudo={profil.pseudo} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="plot-profil-nom">{profil.pseudo}</p>
          <p className="plot-profil-bio">{profil.bio}</p>
        </div>
        <button className="plot-btn-mini" onClick={toggleSuivre} disabled={enCours}>
          {enCours ? "..." : estSuivi ? "Se désabonner" : "Suivre"}
        </button>
      </div>

      {stats ? (
        <div className="plot-stats">
          <div>
            <span className="plot-stat-n">{stats.lu}</span>
            <span className="plot-stat-l">Lus</span>
          </div>
          <div>
            <span className="plot-stat-n">{stats.en_cours}</span>
            <span className="plot-stat-l">En cours</span>
          </div>
          <div>
            <span className="plot-stat-n">{stats.envie}</span>
            <span className="plot-stat-l">Envie de lire</span>
          </div>
          <div>
            <span className="plot-stat-n">{stats.abandonne}</span>
            <span className="plot-stat-l">Abandonnés</span>
          </div>
          <div>
            <span className="plot-stat-n">{nbAbonnements}</span>
            <span className="plot-stat-l">Abonnements</span>
          </div>
          <div>
            <span className="plot-stat-n">{nbAbonnes}</span>
            <span className="plot-stat-l">Abonnés</span>
          </div>
        </div>
      ) : (
        <p className="plot-chargement">
          Suis {profil.pseudo} pour voir son étagère.
        </p>
      )}
    </>
  );
}
