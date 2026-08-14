"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SalonAccordion } from "@/components/SalonAccordion";
import {
  genererCode,
  versClub,
  versMembre,
  type Club,
  type LigneClubBrute,
  type LigneMembreBrute,
  type MembreClub,
} from "@/lib/clubs";

export function SalonsListe({
  profilId,
  pseudo,
  salonOuvert,
  onToggleSalon,
}: {
  profilId: string;
  pseudo: string;
  salonOuvert: string | null;
  onToggleSalon: (clubId: string) => void;
}) {
  const supabase = createClient();

  const [clubs, setClubs] = useState<Club[]>([]);
  const [mesMembres, setMesMembres] = useState<Record<string, MembreClub>>({});
  const [suggestions, setSuggestions] = useState<{ id: string; pseudo: string }[]>([]);
  const [chargement, setChargement] = useState(true);

  const [panneauCreation, setPanneauCreation] = useState(false);
  const [nomClub, setNomClub] = useState("");
  const [livreClub, setLivreClub] = useState("");
  const [clubPrive, setClubPrive] = useState(false);
  const [erreur, setErreur] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    async function charger() {
      const [{ data: clubsBruts }, { data: membresBruts }, { data: suivisBruts }] = await Promise.all([
        supabase
          .from("clubs")
          .select("id, nom, livre_actuel, code, cree_par, prive, created_at")
          .order("created_at", { ascending: false })
          .returns<LigneClubBrute[]>(),
        supabase
          .from("club_members")
          .select("club_id, user_id, role, statut, profil:profiles(pseudo)")
          .eq("user_id", profilId)
          .returns<LigneMembreBrute[]>(),
        supabase
          .from("follows")
          .select("suivi_id, profil:profiles!follows_suivi_id_fkey(pseudo)")
          .eq("follower_id", profilId)
          .returns<{ suivi_id: string; profil: { pseudo: string } | null }[]>(),
      ]);

      if (annule) return;

      setClubs((clubsBruts || []).map(versClub));

      const map: Record<string, MembreClub> = {};
      for (const m of (membresBruts || []).map(versMembre)) {
        map[m.clubId] = m;
      }
      setMesMembres(map);

      setSuggestions(
        (suivisBruts || [])
          .filter((s) => s.profil)
          .map((s) => ({ id: s.suivi_id, pseudo: s.profil!.pseudo }))
      );

      setChargement(false);
    }
    charger();
    return () => {
      annule = true;
    };
  }, [profilId, supabase]);

  function surMembreMisAJour(membre: MembreClub) {
    setMesMembres((m) => ({ ...m, [membre.clubId]: membre }));
  }

  async function creerClub() {
    const nom = nomClub.trim();
    if (!nom || creationEnCours) return;
    setCreationEnCours(true);
    setErreur("");

    let code = genererCode(nom);
    let club: Club | null = null;

    for (let tentative = 0; tentative < 5 && !club; tentative++) {
      const { data, error } = await supabase
        .from("clubs")
        .insert({
          nom,
          livre_actuel: livreClub.trim() || null,
          code,
          cree_par: profilId,
          prive: clubPrive,
        })
        .select("id, nom, livre_actuel, code, cree_par, prive, created_at")
        .single<LigneClubBrute>();

      if (data) {
        club = versClub(data);
      } else if (error?.code === "23505") {
        code = genererCode(nom + Math.random());
      } else {
        break;
      }
    }

    setCreationEnCours(false);

    if (!club) {
      setErreur("Impossible de créer le club, réessaie.");
      return;
    }

    setClubs((l) => [club!, ...l]);
    setMesMembres((m) => ({
      ...m,
      [club!.id]: { clubId: club!.id, userId: profilId, pseudo, role: "createur", statut: "accepte" },
    }));
    setPanneauCreation(false);
    setNomClub("");
    setLivreClub("");
    setClubPrive(false);
    onToggleSalon(club.id);
  }

  return (
    <section>
      <button className="plot-btn plot-btn-creer" onClick={() => setPanneauCreation(!panneauCreation)}>
        + Créer un Book Club
      </button>

      {panneauCreation && (
        <div className="plot-panneau">
          <p className="plot-panneau-titre">Nouveau Book Club</p>
          <p className="plot-panneau-sous">
            Tu en es automatiquement membre, tu invites les autres ensuite par pseudo.
          </p>
          <div className="plot-manuel">
            <input
              className="plot-input plot-input-pleine"
              placeholder="Nom ou genre du club *"
              value={nomClub}
              onChange={(e) => setNomClub(e.target.value)}
            />
            <input
              className="plot-input plot-input-pleine"
              placeholder="Livre du moment (optionnel)"
              value={livreClub}
              onChange={(e) => setLivreClub(e.target.value)}
            />
            <label className="plot-checkbox-ligne">
              <input
                type="checkbox"
                checked={clubPrive}
                onChange={(e) => setClubPrive(e.target.checked)}
              />
              Club privé (sur invitation uniquement)
            </label>
            {erreur && <p className="plot-panneau-erreur">{erreur}</p>}
            <button
              className="plot-btn plot-btn-pleine"
              onClick={creerClub}
              disabled={!nomClub.trim() || creationEnCours}
            >
              {creationEnCours ? "Création..." : "Créer le club"}
            </button>
          </div>
        </div>
      )}

      {chargement && <p className="plot-chargement">Chargement des salons...</p>}
      {!chargement && clubs.length === 0 && (
        <p className="plot-chargement">Aucun salon pour l&apos;instant — crée le premier.</p>
      )}

      {clubs.map((club) => (
        <SalonAccordion
          key={club.id}
          club={club}
          profilId={profilId}
          pseudo={pseudo}
          monMembre={mesMembres[club.id]}
          ouvert={salonOuvert === club.id}
          onToggle={() => onToggleSalon(club.id)}
          onMembreMisAJour={surMembreMisAJour}
          suggestions={suggestions}
        />
      ))}
    </section>
  );
}
