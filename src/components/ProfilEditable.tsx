"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normaliserPseudo, pseudoValide, PSEUDO_AIDE } from "@/lib/pseudo";
import { Avatar } from "@/components/Avatar";

export type Profil = {
  id: string;
  pseudo: string;
  bio: string;
};

export function ProfilEditable({
  profil,
  onProfilChange,
  nbLu,
  nbEnCours,
  nbEnvie,
  nbAbandonnes,
  nbAbonnements,
  nbAbonnes,
  lienProfilComplet,
}: {
  profil: Profil;
  onProfilChange: (p: Profil) => void;
  nbLu: number;
  nbEnCours: number;
  nbEnvie: number;
  nbAbandonnes: number;
  nbAbonnements: number;
  nbAbonnes: number;
  /** Affiche un lien "Voir mon profil complet" pointant vers /profil/{pseudo} — omis quand on est déjà sur cette page. */
  lienProfilComplet?: boolean;
}) {
  const supabase = createClient();

  const [editionNom, setEditionNom] = useState(false);
  const [brouillonNom, setBrouillonNom] = useState(profil.pseudo);
  const [erreurNom, setErreurNom] = useState("");

  const [editionBio, setEditionBio] = useState(false);
  const [brouillonBio, setBrouillonBio] = useState(profil.bio);
  const [erreurBio, setErreurBio] = useState("");

  const enregistrementEnCours = useRef(false);

  async function enregistrerNom() {
    const p = normaliserPseudo(brouillonNom);
    setEditionNom(false);

    if (p === profil.pseudo) return;

    if (!pseudoValide(p)) {
      setErreurNom("Pseudo invalide : " + PSEUDO_AIDE);
      setBrouillonNom(profil.pseudo);
      return;
    }
    if (enregistrementEnCours.current) return;
    enregistrementEnCours.current = true;

    const { error } = await supabase
      .from("profiles")
      .update({ pseudo: p })
      .eq("id", profil.id);

    enregistrementEnCours.current = false;

    if (error) {
      setErreurNom(
        error.code === "23505"
          ? "Ce pseudo est déjà pris."
          : "Impossible d'enregistrer ce pseudo."
      );
      setBrouillonNom(profil.pseudo);
      return;
    }

    setErreurNom("");
    onProfilChange({ ...profil, pseudo: p });
  }

  async function enregistrerBio() {
    const bio = brouillonBio.trim().slice(0, 280);
    setEditionBio(false);

    if (bio === profil.bio) return;

    const { error } = await supabase
      .from("profiles")
      .update({ bio })
      .eq("id", profil.id);

    if (error) {
      setErreurBio("Impossible d'enregistrer la bio.");
      setBrouillonBio(profil.bio);
      return;
    }

    setErreurBio("");
    onProfilChange({ ...profil, bio });
  }

  return (
    <>
      <div className="plot-profil">
        <Avatar pseudo={profil.pseudo} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editionNom ? (
            <input
              className="plot-profil-nom-input"
              value={brouillonNom}
              autoFocus
              onChange={(e) => setBrouillonNom(e.target.value)}
              onBlur={enregistrerNom}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <button
              className="plot-profil-nom"
              onClick={() => {
                setBrouillonNom(profil.pseudo);
                setEditionNom(true);
              }}
              title="Modifier ton pseudo"
            >
              {profil.pseudo}
            </button>
          )}
          {erreurNom && <p className="plot-profil-champ-erreur">{erreurNom}</p>}

          {editionBio ? (
            <textarea
              className="plot-profil-bio-input"
              value={brouillonBio}
              autoFocus
              rows={2}
              maxLength={280}
              onChange={(e) => setBrouillonBio(e.target.value)}
              onBlur={enregistrerBio}
            />
          ) : (
            <button
              className="plot-profil-bio"
              onClick={() => {
                setBrouillonBio(profil.bio);
                setEditionBio(true);
              }}
              title="Modifier ta bio"
            >
              {profil.bio || "Ajouter une bio..."}
            </button>
          )}
          {erreurBio && <p className="plot-profil-champ-erreur">{erreurBio}</p>}
        </div>
      </div>

      <div className="plot-stats">
        <div>
          <span className="plot-stat-n">{nbLu}</span>
          <span className="plot-stat-l">Lus</span>
        </div>
        <div>
          <span className="plot-stat-n">{nbEnCours}</span>
          <span className="plot-stat-l">En cours</span>
        </div>
        <div>
          <span className="plot-stat-n">{nbEnvie}</span>
          <span className="plot-stat-l">Envie de lire</span>
        </div>
        <div>
          <span className="plot-stat-n">{nbAbandonnes}</span>
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

      {lienProfilComplet && (
        <Link href={`/profil/${profil.pseudo}`} className="plot-lien plot-lien-profil">
          Voir mon profil complet →
        </Link>
      )}
    </>
  );
}
