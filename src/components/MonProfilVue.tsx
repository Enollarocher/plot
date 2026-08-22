"use client";

import { useState } from "react";
import { ProfilEditable, type Profil } from "@/components/ProfilEditable";
import { ObjectifsLecture } from "@/components/ObjectifsLecture";
import { AbonnementsSection } from "@/components/AbonnementsSection";

export function MonProfilVue({
  profilInitial,
  stats,
  nbAbonnementsInitial,
  nbAbonnesInitial,
}: {
  profilInitial: Profil;
  stats: { envie: number; en_cours: number; lu: number; abandonne: number };
  nbAbonnementsInitial: number;
  nbAbonnesInitial: number;
}) {
  const [profil, setProfil] = useState(profilInitial);
  const [nbAbonnements, setNbAbonnements] = useState(nbAbonnementsInitial);
  const [nbAbonnes, setNbAbonnes] = useState(nbAbonnesInitial);

  return (
    <>
      <ProfilEditable
        profil={profil}
        onProfilChange={setProfil}
        nbLu={stats.lu}
        nbEnCours={stats.en_cours}
        nbEnvie={stats.envie}
        nbAbandonnes={stats.abandonne}
        nbAbonnements={nbAbonnements}
        nbAbonnes={nbAbonnes}
      />
      <ObjectifsLecture profilId={profil.id} />
      <AbonnementsSection
        profilId={profil.id}
        onCompteChange={(a, s) => {
          setNbAbonnements(a);
          setNbAbonnes(s);
        }}
      />
    </>
  );
}
