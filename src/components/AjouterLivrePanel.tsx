"use client";

import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { CodeBarres } from "@/components/icons/CodeBarres";
import { rechercherGoogleBooks, type ResultatRecherche } from "@/lib/googleBooks";

export function AjouterLivrePanel({
  onAjouterResultat,
  onAjouterManuel,
}: {
  onAjouterResultat: (item: ResultatRecherche) => Promise<void> | void;
  onAjouterManuel: (donnees: {
    titre: string;
    auteur: string;
    pages: number | null;
    resume: string;
  }) => Promise<void> | void;
}) {
  const [requete, setRequete] = useState("");
  const [recherche, setRecherche] = useState(false);
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [erreurRecherche, setErreurRecherche] = useState("");
  const [ajoutEnCoursCle, setAjoutEnCoursCle] = useState<string | null>(null);

  const [manuel, setManuel] = useState(false);
  const [mTitre, setMTitre] = useState("");
  const [mAuteur, setMAuteur] = useState("");
  const [mPages, setMPages] = useState("");
  const [mResume, setMResume] = useState("");
  const [ajoutManuelEnCours, setAjoutManuelEnCours] = useState(false);

  async function rechercherLivres() {
    const q = requete.trim();
    if (!q) return;
    setRecherche(true);
    setErreurRecherche("");
    setResultats([]);
    try {
      const docs = await rechercherGoogleBooks(q);
      if (docs.length === 0) {
        setErreurRecherche("Aucun résultat. Tu peux l'ajouter à la main juste en dessous.");
      }
      setResultats(docs);
    } catch {
      setErreurRecherche("La recherche a échoué, vérifie ta connexion et réessaie.");
    } finally {
      setRecherche(false);
    }
  }

  async function ajouter(item: ResultatRecherche) {
    setAjoutEnCoursCle(item.cle);
    await onAjouterResultat(item);
    setAjoutEnCoursCle(null);
    setResultats((r) => r.filter((x) => x.cle !== item.cle));
  }

  async function ajouterManuel() {
    if (!mTitre.trim() || ajoutManuelEnCours) return;
    setAjoutManuelEnCours(true);
    await onAjouterManuel({
      titre: mTitre.trim(),
      auteur: mAuteur.trim() || "Auteur inconnu",
      pages: mPages ? parseInt(mPages, 10) : null,
      resume: mResume.trim(),
    });
    setAjoutManuelEnCours(false);
    setManuel(false);
    setMTitre("");
    setMAuteur("");
    setMPages("");
    setMResume("");
  }

  return (
    <div className="plot-panneau">
      <div className="plot-panneau-tete">
        <span className="plot-codebarres">
          <CodeBarres />
        </span>
        <div>
          <p className="plot-panneau-titre">Trouver un livre</p>
          <p className="plot-panneau-sous">Titre, auteur ou ISBN — Plot cherche pour toi.</p>
        </div>
      </div>

      <div className="plot-msg-form">
        <input
          className="plot-input"
          placeholder="ex. Sherella, Rebecca Yarros..."
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && rechercherLivres()}
        />
        <button className="plot-btn" onClick={rechercherLivres} disabled={recherche}>
          {recherche ? "Recherche..." : "Chercher"}
        </button>
      </div>

      {erreurRecherche && <p className="plot-panneau-erreur">{erreurRecherche}</p>}

      {resultats.length > 0 && (
        <div className="plot-resultats">
          {resultats.map((item) => (
            <div className="plot-resultat" key={item.cle}>
              <BookCover couverture={item.couverture} graine={item.cle} />
              <div className="plot-card-texte">
                <p className="plot-titre">{item.titre}</p>
                <p className="plot-auteur">
                  {item.auteur}
                  {item.pages ? ` · ${item.pages} p.` : ""}
                </p>
              </div>
              <button
                className="plot-btn-mini plot-btn-mini-fixe"
                disabled={ajoutEnCoursCle === item.cle}
                onClick={() => ajouter(item)}
              >
                {ajoutEnCoursCle === item.cle ? "..." : "Ajouter"}
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="plot-lien-manuel" onClick={() => setManuel(!manuel)}>
        {manuel ? "Annuler l'ajout manuel" : "Je ne trouve pas mon livre, l'ajouter à la main"}
      </button>

      {manuel && (
        <div className="plot-manuel">
          <input
            className="plot-input plot-input-pleine"
            placeholder="Titre *"
            value={mTitre}
            onChange={(e) => setMTitre(e.target.value)}
          />
          <input
            className="plot-input plot-input-pleine"
            placeholder="Auteur"
            value={mAuteur}
            onChange={(e) => setMAuteur(e.target.value)}
          />
          <input
            className="plot-input plot-input-pleine"
            placeholder="Nombre de pages"
            value={mPages}
            onChange={(e) => setMPages(e.target.value.replace(/\D/g, ""))}
          />
          <textarea
            className="plot-input plot-input-pleine"
            placeholder="Résumé (optionnel)"
            rows={3}
            value={mResume}
            onChange={(e) => setMResume(e.target.value)}
          />
          <button
            className="plot-btn plot-btn-pleine"
            onClick={ajouterManuel}
            disabled={!mTitre.trim() || ajoutManuelEnCours}
          >
            {ajoutManuelEnCours ? "Ajout..." : "Ajouter à Envie de lire"}
          </button>
        </div>
      )}
    </div>
  );
}
