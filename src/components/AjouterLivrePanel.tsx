"use client";

import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { CodeBarres } from "@/components/icons/CodeBarres";
import { rechercherGoogleBooks, type ResultatRecherche } from "@/lib/googleBooks";
import { erreurFichierCouverture } from "@/lib/storage";
import type { DonneesAjoutManuel } from "@/lib/shelf";

export function AjouterLivrePanel({
  onAjouterResultat,
  onAjouterManuel,
}: {
  onAjouterResultat: (item: ResultatRecherche) => Promise<void> | void;
  onAjouterManuel: (donnees: DonneesAjoutManuel) => Promise<void> | void;
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
  const [mCouverture, setMCouverture] = useState<File | null>(null);
  const [mApercuUrl, setMApercuUrl] = useState<string | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState("");
  const [ajoutManuelEnCours, setAjoutManuelEnCours] = useState(false);

  const inputFichierRef = useRef<HTMLInputElement>(null);

  // Révoque l'URL d'aperçu précédente à chaque changement / démontage pour
  // ne pas fuiter de mémoire (URL.createObjectURL n'est jamais libérée
  // automatiquement par le navigateur).
  useEffect(() => {
    return () => {
      if (mApercuUrl) URL.revokeObjectURL(mApercuUrl);
    };
  }, [mApercuUrl]);

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

  function choisirPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0] || null;
    e.target.value = ""; // permet de resélectionner le même fichier ensuite
    if (!fichier) return;

    const erreur = erreurFichierCouverture(fichier);
    if (erreur) {
      setErreurPhoto(erreur);
      return;
    }

    setErreurPhoto("");
    setMCouverture(fichier);
    setMApercuUrl((ancien) => {
      if (ancien) URL.revokeObjectURL(ancien);
      return URL.createObjectURL(fichier);
    });
  }

  function retirerPhoto() {
    setMCouverture(null);
    setMApercuUrl((ancien) => {
      if (ancien) URL.revokeObjectURL(ancien);
      return null;
    });
    setErreurPhoto("");
  }

  async function ajouterManuel() {
    if (!mTitre.trim() || ajoutManuelEnCours) return;
    setAjoutManuelEnCours(true);
    await onAjouterManuel({
      titre: mTitre.trim(),
      auteur: mAuteur.trim() || "Auteur inconnu",
      pages: mPages ? parseInt(mPages, 10) : null,
      resume: mResume.trim(),
      couverture: mCouverture,
    });
    setAjoutManuelEnCours(false);
    setManuel(false);
    setMTitre("");
    setMAuteur("");
    setMPages("");
    setMResume("");
    retirerPhoto();
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

          <input
            ref={inputFichierRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={choisirPhoto}
          />
          {mApercuUrl ? (
            <div className="plot-photo-ligne">
              {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (URL.createObjectURL), jamais distant */}
              <img className="plot-cover" src={mApercuUrl} alt="Aperçu de la couverture" />
              <div className="plot-photo-actions">
                <button
                  type="button"
                  className="plot-lien"
                  onClick={() => inputFichierRef.current?.click()}
                >
                  Changer la photo
                </button>
                <button type="button" className="plot-lien" onClick={retirerPhoto}>
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="plot-btn-secondaire"
              onClick={() => inputFichierRef.current?.click()}
            >
              Choisir une photo de couverture
            </button>
          )}
          {erreurPhoto && <p className="plot-profil-champ-erreur">{erreurPhoto}</p>}

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
