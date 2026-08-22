"use client";

import { useState } from "react";
import Link from "next/link";
import { Coeur } from "@/components/icons/Coeur";
import { Etoile } from "@/components/icons/Etoile";
import { relatif } from "@/lib/temps";
import type {
  ContenuMessage,
  ContenuMoment,
  ContenuTermine,
  EntreeActivite,
} from "@/lib/activity";

function couleurBarre(type: EntreeActivite["type"]) {
  if (type === "termine") return "var(--plot-accent)";
  if (type === "moment") return "var(--plot-violet)";
  if (type === "message") return "var(--plot-blue)";
  return "var(--plot-accent-2)";
}

function TitreLivre({ titre, bookId }: { titre: string; bookId?: string }) {
  if (!bookId) return <em>{titre}</em>;
  return (
    <Link href={`/livre/${bookId}`} className="plot-lien-livre">
      <em>{titre}</em>
    </Link>
  );
}

export function ActivEntry({
  entree,
  onReagir,
  onCommenter,
  onOuvrirSalon,
}: {
  entree: EntreeActivite;
  onReagir: (id: string) => void;
  onCommenter: (id: string, texte: string) => Promise<void>;
  onOuvrirSalon?: (clubId: string) => void;
}) {
  const [ouvrirCommentaires, setOuvrirCommentaires] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function envoyerCommentaire() {
    const texte = brouillon.trim();
    if (!texte || envoiEnCours) return;
    setEnvoiEnCours(true);
    await onCommenter(entree.id, texte);
    setEnvoiEnCours(false);
    setBrouillon("");
  }

  let corps;
  if (entree.type === "termine") {
    const c = entree.contenu as ContenuTermine;
    corps = (
      <>
        <span className="plot-activ-ligne">
          <strong>{entree.pseudo}</strong> vient de terminer
        </span>
        <span className="plot-activ-livre">
          {c.bookId ? (
            <Link href={`/livre/${c.bookId}`} className="plot-lien-livre">
              {c.titre}
            </Link>
          ) : (
            c.titre
          )}
        </span>
        <span className="plot-etoiles">
          {[1, 2, 3, 4, 5].map((n) => (
            <Etoile key={n} pleine={n <= c.note} taille={12} />
          ))}
        </span>
        <span className="plot-activ-extrait">
          Livre terminé {c.heure ? `à ${c.heure}` : ""}.
        </span>
      </>
    );
  } else if (entree.type === "moment") {
    const c = entree.contenu as ContenuMoment;
    corps = (
      <>
        <span className="plot-activ-ligne">
          <strong>{entree.pseudo}</strong> partage un Plot Moment sur{" "}
          <TitreLivre titre={c.titre} bookId={c.bookId} />
        </span>
        <span className="plot-moment-citation">&laquo; {c.texte} &raquo;</span>
      </>
    );
  } else if (entree.type === "message") {
    const c = entree.contenu as ContenuMessage;
    corps = (
      <div className="plot-activ-clic" onClick={() => onOuvrirSalon?.(c.clubId)}>
        <span className="plot-activ-ligne">
          <strong>{entree.pseudo}</strong> a écrit dans <strong>{c.nom}</strong>
        </span>
        <span className="plot-activ-extrait">&laquo; {c.texte} &raquo;</span>
      </div>
    );
  } else {
    const c = entree.contenu as ContenuMoment;
    corps = (
      <span className="plot-activ-ligne">
        <strong>{entree.pseudo}</strong> commence <TitreLivre titre={c.titre} bookId={c.bookId} />
      </span>
    );
  }

  return (
    <div className="plot-activ">
      <span className="plot-activ-barre" style={{ background: couleurBarre(entree.type) }} />
      <div className="plot-activ-corps">
        {corps}
        <span className="plot-activ-bas">
          <span className="plot-activ-temps">{relatif(entree.createdAt)}</span>
          <span className="plot-activ-actions">
            <button
              className={entree.jaiReagi ? "plot-coeur actif" : "plot-coeur"}
              onClick={() => onReagir(entree.id)}
              title={entree.jaiReagi ? "Retirer ma réaction" : "Réagir"}
            >
              <Coeur actif={entree.jaiReagi} /> {entree.nbReactions > 0 && entree.nbReactions}
            </button>
            <button className="plot-commenter" onClick={() => setOuvrirCommentaires(!ouvrirCommentaires)}>
              Commenter {entree.commentaires.length > 0 && `(${entree.commentaires.length})`}
            </button>
          </span>
        </span>
        {ouvrirCommentaires && (
          <div className="plot-commentaires">
            {entree.commentaires.map((c) => (
              <p key={c.id} className="plot-commentaire">
                <span className="plot-msg-qui">{c.pseudo}</span> — {c.texte}
              </p>
            ))}
            <div className="plot-msg-form">
              <input
                className="plot-input"
                placeholder="Répondre..."
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && envoyerCommentaire()}
              />
              <button className="plot-btn" onClick={envoyerCommentaire} disabled={envoiEnCours}>
                Envoyer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
