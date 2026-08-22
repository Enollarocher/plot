"use client";

import { useState } from "react";
import { BookCard } from "@/components/BookCard";
import { EncoursCard } from "@/components/EncoursCard";
import { AjouterLivrePanel } from "@/components/AjouterLivrePanel";
import type { DonneesAjoutManuel, LivreEtagere } from "@/lib/shelf";
import type { ResultatRecherche } from "@/lib/googleBooks";

type SousTab = "envie" | "en_cours" | "lu" | "abandonne";

export function EtageresListe({
  envie,
  enCours,
  lu,
  abandonnes,
  onCommencer,
  onMoment,
  onTerminer,
  onAbandonner,
  onAjouterResultat,
  onAjouterManuel,
}: {
  envie: LivreEtagere[];
  enCours: LivreEtagere[];
  lu: LivreEtagere[];
  abandonnes: LivreEtagere[];
  onCommencer: (id: string) => void;
  onMoment: (id: string, texte: string) => void;
  onTerminer: (id: string, note: number) => void;
  onAbandonner: (id: string) => void;
  onAjouterResultat: (item: ResultatRecherche) => Promise<void>;
  onAjouterManuel: (donnees: DonneesAjoutManuel) => Promise<void>;
}) {
  const [sousTab, setSousTab] = useState<SousTab>("lu");
  const [panneauAjout, setPanneauAjout] = useState(false);

  async function ajouterResultat(item: ResultatRecherche) {
    await onAjouterResultat(item);
  }

  async function ajouterManuel(donnees: DonneesAjoutManuel) {
    await onAjouterManuel(donnees);
    setPanneauAjout(false);
  }

  return (
    <div>
      <div className="plot-soustabs">
        <button
          className={sousTab === "envie" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setSousTab("envie")}
        >
          Envie de lire
        </button>
        <button
          className={sousTab === "en_cours" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setSousTab("en_cours")}
        >
          En cours
        </button>
        <button
          className={sousTab === "lu" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setSousTab("lu")}
        >
          Lu
        </button>
        <button
          className={sousTab === "abandonne" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setSousTab("abandonne")}
        >
          Abandonné
        </button>
        <button
          className="plot-soustab plot-soustab-ajout"
          onClick={() => setPanneauAjout(!panneauAjout)}
        >
          + Ajouter un livre
        </button>
      </div>

      {panneauAjout && (
        <AjouterLivrePanel
          onAjouterResultat={ajouterResultat}
          onAjouterManuel={ajouterManuel}
        />
      )}

      <div className="plot-list">
        {sousTab === "envie" &&
          envie.map((item) => (
            <BookCard key={item.id} item={item} onCommencer={onCommencer} />
          ))}
        {sousTab === "en_cours" &&
          enCours.map((item) => (
            <EncoursCard
              key={item.id}
              item={item}
              onMoment={onMoment}
              onTerminer={onTerminer}
              onAbandonner={onAbandonner}
            />
          ))}
        {sousTab === "lu" &&
          lu.map((item) => <BookCard key={item.id} item={item} />)}
        {sousTab === "abandonne" &&
          abandonnes.map((item) => <BookCard key={item.id} item={item} />)}

        {sousTab === "envie" && envie.length === 0 && (
          <p className="plot-chargement">
            Rien pour l&apos;instant — cherche un livre ci-dessus.
          </p>
        )}
        {sousTab === "en_cours" && enCours.length === 0 && (
          <p className="plot-chargement">
            Rien en cours. Passe un livre depuis &laquo; Envie de lire &raquo;.
          </p>
        )}
        {sousTab === "lu" && lu.length === 0 && (
          <p className="plot-chargement">Rien de terminé pour l&apos;instant.</p>
        )}
        {sousTab === "abandonne" && abandonnes.length === 0 && (
          <p className="plot-chargement">Rien d&apos;abandonné pour l&apos;instant.</p>
        )}
      </div>
    </div>
  );
}
