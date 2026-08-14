"use client";

import { useEffect, useRef, useState } from "react";
import { BookCover } from "@/components/BookCover";
import { CodeBarres } from "@/components/icons/CodeBarres";
import { BarcodeScanner, scanCodeBarresSupporte } from "@/components/BarcodeScanner";
import {
  rechercherGoogleBooks,
  rechercherParAuteur,
  type ResultatRecherche,
} from "@/lib/googleBooks";
import { erreurFichierCouverture } from "@/lib/storage";
import type { DonneesAjoutManuel } from "@/lib/shelf";

type Mode = "rapide" | "auteur";
const TAILLE_PAGE_AUTEUR = 20;

export function AjouterLivrePanel({
  onAjouterResultat,
  onAjouterManuel,
}: {
  onAjouterResultat: (item: ResultatRecherche) => Promise<void> | void;
  onAjouterManuel: (donnees: DonneesAjoutManuel) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<Mode>("rapide");

  const [requete, setRequete] = useState("");
  const [recherche, setRecherche] = useState(false);
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [erreurRecherche, setErreurRecherche] = useState("");
  const [ajoutEnCoursCle, setAjoutEnCoursCle] = useState<string | null>(null);

  const [auteurRequete, setAuteurRequete] = useState("");
  const [resultatsAuteur, setResultatsAuteur] = useState<ResultatRecherche[]>([]);
  const [totalAuteur, setTotalAuteur] = useState(0);
  const [chargementAuteur, setChargementAuteur] = useState(false);
  const [chargementPlus, setChargementPlus] = useState(false);
  const [erreurAuteur, setErreurAuteur] = useState("");

  const [manuel, setManuel] = useState(false);
  const [mTitre, setMTitre] = useState("");
  const [mAuteur, setMAuteur] = useState("");
  const [mPages, setMPages] = useState("");
  const [mResume, setMResume] = useState("");
  const [mIsbn, setMIsbn] = useState("");
  const [mCouverture, setMCouverture] = useState<File | null>(null);
  const [mApercuUrl, setMApercuUrl] = useState<string | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState("");
  const [ajoutManuelEnCours, setAjoutManuelEnCours] = useState(false);
  const [scannerOuvert, setScannerOuvert] = useState(false);
  const [scanDisponible, setScanDisponible] = useState(false);

  const inputFichierRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Détection client-only (BarcodeDetector n'existe pas côté serveur) :
    // doit rester dans un effet pour ne pas désaccorder le HTML rendu par
    // le serveur de celui du premier rendu client (hydratation).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScanDisponible(scanCodeBarresSupporte());
  }, []);

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

  async function rechercherAuteur() {
    const a = auteurRequete.trim();
    if (!a) return;
    setChargementAuteur(true);
    setErreurAuteur("");
    setResultatsAuteur([]);
    try {
      const { resultats: docs, total } = await rechercherParAuteur(a, 0, TAILLE_PAGE_AUTEUR);
      if (docs.length === 0) {
        setErreurAuteur("Aucun résultat pour cette autrice ou cet auteur.");
      }
      setResultatsAuteur(docs);
      setTotalAuteur(total);
    } catch {
      setErreurAuteur("La recherche a échoué, vérifie ta connexion et réessaie.");
    } finally {
      setChargementAuteur(false);
    }
  }

  async function voirPlusAuteur() {
    const a = auteurRequete.trim();
    if (!a || chargementPlus) return;
    setChargementPlus(true);
    try {
      const { resultats: docs, total } = await rechercherParAuteur(
        a,
        resultatsAuteur.length,
        TAILLE_PAGE_AUTEUR
      );
      setResultatsAuteur((r) => [...r, ...docs]);
      setTotalAuteur(total);
    } catch {
      setErreurAuteur("Impossible de charger la suite, réessaie.");
    } finally {
      setChargementPlus(false);
    }
  }

  async function ajouter(item: ResultatRecherche, depuisAuteur: boolean) {
    setAjoutEnCoursCle(item.cle);
    await onAjouterResultat(item);
    setAjoutEnCoursCle(null);
    if (depuisAuteur) {
      setResultatsAuteur((r) => r.filter((x) => x.cle !== item.cle));
    } else {
      setResultats((r) => r.filter((x) => x.cle !== item.cle));
    }
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

  function surCodeDetecte(isbn: string) {
    setMIsbn(isbn);
    setScannerOuvert(false);
  }

  async function ajouterManuel() {
    if (!mTitre.trim() || ajoutManuelEnCours) return;
    setAjoutManuelEnCours(true);
    await onAjouterManuel({
      titre: mTitre.trim(),
      auteur: mAuteur.trim() || "Auteur inconnu",
      pages: mPages ? parseInt(mPages, 10) : null,
      resume: mResume.trim(),
      isbn: mIsbn.trim() || null,
      couverture: mCouverture,
    });
    setAjoutManuelEnCours(false);
    setManuel(false);
    setMTitre("");
    setMAuteur("");
    setMPages("");
    setMResume("");
    setMIsbn("");
    setScannerOuvert(false);
    retirerPhoto();
  }

  function resultatLigne(item: ResultatRecherche, depuisAuteur: boolean) {
    return (
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
          onClick={() => ajouter(item, depuisAuteur)}
        >
          {ajoutEnCoursCle === item.cle ? "..." : "Ajouter"}
        </button>
      </div>
    );
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

      <div className="plot-mode-toggle">
        <button
          className={mode === "rapide" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setMode("rapide")}
        >
          Recherche rapide
        </button>
        <button
          className={mode === "auteur" ? "plot-soustab active" : "plot-soustab"}
          onClick={() => setMode("auteur")}
        >
          Parcourir un auteur
        </button>
      </div>

      {mode === "rapide" && (
        <>
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
              {resultats.map((item) => resultatLigne(item, false))}
            </div>
          )}
        </>
      )}

      {mode === "auteur" && (
        <>
          <div className="plot-msg-form">
            <input
              className="plot-input"
              placeholder="ex. Guillaume Musso"
              value={auteurRequete}
              onChange={(e) => setAuteurRequete(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && rechercherAuteur()}
            />
            <button className="plot-btn" onClick={rechercherAuteur} disabled={chargementAuteur}>
              {chargementAuteur ? "Recherche..." : "Chercher"}
            </button>
          </div>

          {erreurAuteur && <p className="plot-panneau-erreur">{erreurAuteur}</p>}

          {resultatsAuteur.length > 0 && (
            <div className="plot-resultats">
              {resultatsAuteur.map((item) => resultatLigne(item, true))}
            </div>
          )}

          {resultatsAuteur.length > 0 && resultatsAuteur.length < totalAuteur && (
            <div className="plot-pagination">
              <span className="plot-par">
                {resultatsAuteur.length} sur {totalAuteur}
              </span>
              <button className="plot-btn-mini" onClick={voirPlusAuteur} disabled={chargementPlus}>
                {chargementPlus ? "Chargement..." : "Voir plus"}
              </button>
            </div>
          )}
        </>
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
            className="plot-input plot-input-pleine"
            placeholder="ISBN (optionnel)"
            value={mIsbn}
            onChange={(e) => setMIsbn(e.target.value.replace(/[^0-9Xx-]/g, ""))}
          />
          {scanDisponible && !scannerOuvert && (
            <button
              type="button"
              className="plot-btn-secondaire"
              onClick={() => setScannerOuvert(true)}
            >
              Scanner le code-barres
            </button>
          )}
          {scannerOuvert && (
            <BarcodeScanner onDetecte={surCodeDetecte} onFermer={() => setScannerOuvert(false)} />
          )}

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
