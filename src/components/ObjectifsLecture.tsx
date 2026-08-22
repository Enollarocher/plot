"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  compterDansPeriode,
  versObjectif,
  type LigneObjectifBrute,
  type ObjectifLecture,
} from "@/lib/goals";

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const ANNEE_COURANTE = new Date().getFullYear();

export function ObjectifsLecture({ profilId }: { profilId: string }) {
  const supabase = createClient();

  const [objectifs, setObjectifs] = useState<ObjectifLecture[]>([]);
  const [datesLues, setDatesLues] = useState<(string | null)[]>([]);
  const [chargement, setChargement] = useState(true);

  const [panneau, setPanneau] = useState(false);
  const [cible, setCible] = useState("");
  const [debut, setDebut] = useState(`${ANNEE_COURANTE}-01-01`);
  const [fin, setFin] = useState(`${ANNEE_COURANTE}-12-31`);
  const [erreur, setErreur] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    async function charger() {
      const [{ data: objs }, { data: livres }] = await Promise.all([
        supabase
          .from("objectifs_lecture")
          .select("id, cible, periode_debut, periode_fin, created_at")
          .eq("user_id", profilId)
          .order("periode_debut", { ascending: false })
          .returns<LigneObjectifBrute[]>(),
        supabase.from("user_books").select("termine_le").eq("user_id", profilId).eq("statut", "lu"),
      ]);
      if (annule) return;
      setObjectifs((objs || []).map(versObjectif));
      setDatesLues((livres || []).map((l) => l.termine_le));
      setChargement(false);
    }
    charger();
    return () => {
      annule = true;
    };
  }, [profilId, supabase]);

  async function creer() {
    const n = parseInt(cible, 10);
    if (!n || n <= 0 || !debut || !fin || creationEnCours) return;
    setCreationEnCours(true);
    setErreur("");

    const { data, error } = await supabase
      .from("objectifs_lecture")
      .insert({ user_id: profilId, cible: n, periode_debut: debut, periode_fin: fin })
      .select("id, cible, periode_debut, periode_fin, created_at")
      .single<LigneObjectifBrute>();

    setCreationEnCours(false);

    if (error || !data) {
      setErreur(
        error?.message.includes("periode")
          ? "La date de fin doit être après la date de début."
          : "Impossible de créer cet objectif."
      );
      return;
    }

    setObjectifs((o) => [versObjectif(data), ...o]);
    setPanneau(false);
    setCible("");
  }

  async function supprimer(id: string) {
    setObjectifs((o) => o.filter((x) => x.id !== id));
    await supabase.from("objectifs_lecture").delete().eq("id", id);
  }

  return (
    <div className="plot-objectifs">
      <p className="plot-membres-titre">Objectifs de lecture</p>

      {chargement && <p className="plot-chargement">Chargement...</p>}

      {!chargement &&
        objectifs.map((o) => {
          const fait = compterDansPeriode(datesLues, o);
          const pct = Math.min(100, Math.round((fait / o.cible) * 100));
          return (
            <div key={o.id} className="plot-objectif">
              <div className="plot-objectif-tete">
                <span className="plot-objectif-chiffres">
                  {fait} / {o.cible} livres
                </span>
                <span className="plot-par">
                  {formatDate(o.periodeDebut)} – {formatDate(o.periodeFin)}
                </span>
                <button
                  className="plot-chip-retirer"
                  onClick={() => supprimer(o.id)}
                  aria-label="Supprimer cet objectif"
                >
                  &times;
                </button>
              </div>
              <div className="plot-objectif-barre">
                <div className="plot-objectif-progres" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}

      {!chargement && objectifs.length === 0 && (
        <p className="plot-par">Aucun objectif pour l&apos;instant.</p>
      )}

      <button className="plot-lien-manuel" onClick={() => setPanneau(!panneau)}>
        {panneau ? "Annuler" : "+ Se fixer un objectif"}
      </button>

      {panneau && (
        <div className="plot-manuel">
          <input
            className="plot-input plot-input-pleine"
            placeholder="Nombre de livres"
            value={cible}
            onChange={(e) => setCible(e.target.value.replace(/\D/g, ""))}
          />
          <div className="plot-objectif-dates">
            <input
              type="date"
              className="plot-input"
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
            />
            <input
              type="date"
              className="plot-input"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>
          {erreur && <p className="plot-panneau-erreur">{erreur}</p>}
          <button
            className="plot-btn plot-btn-pleine"
            onClick={creer}
            disabled={!cible || creationEnCours}
          >
            {creationEnCours ? "Création..." : "Créer l'objectif"}
          </button>
        </div>
      )}
    </div>
  );
}
