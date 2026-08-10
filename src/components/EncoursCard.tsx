"use client";

import { useState } from "react";
import { BookCover } from "@/components/BookCover";
import { Etoile } from "@/components/icons/Etoile";
import type { LivreEtagere } from "@/lib/shelf";

export function EncoursCard({
  item,
  onMoment,
  onTerminer,
}: {
  item: LivreEtagere;
  onMoment: (id: string, texte: string) => void;
  onTerminer: (id: string, note: number) => void;
}) {
  const { livre } = item;
  const [note, setNote] = useState(0);
  const [brouillon, setBrouillon] = useState("");
  const [enCours, setEnCours] = useState(false);

  function envoyerMoment() {
    const texte = brouillon.trim();
    if (!texte) return;
    onMoment(item.id, texte);
    setBrouillon("");
  }

  async function terminer() {
    if (note === 0 || enCours) return;
    setEnCours(true);
    await onTerminer(item.id, note);
  }

  return (
    <div className="plot-card">
      <div className="plot-card-corps">
        <BookCover couverture={livre.couverture} graine={livre.id} />
        <div className="plot-card-texte">
          <p className="plot-titre">{livre.titre}</p>
          <p className="plot-auteur">
            {livre.auteur}
            {livre.pages ? ` · ${livre.pages} p.` : ""}
          </p>

          <div className="plot-msg-form plot-moment-form">
            <input
              className="plot-input"
              placeholder="Un Plot Moment sur ce passage..."
              value={brouillon}
              onChange={(e) => setBrouillon(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && envoyerMoment()}
            />
            <button className="plot-btn" onClick={envoyerMoment}>
              Publier
            </button>
          </div>

          <div className="plot-encours-bas">
            <span className="plot-etoiles-choix">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="plot-etoile-btn"
                  onClick={() => setNote(n)}
                  aria-label={`${n} étoiles`}
                >
                  <Etoile pleine={n <= note} />
                </button>
              ))}
            </span>
            <button
              className="plot-btn-mini"
              disabled={note === 0 || enCours}
              onClick={terminer}
            >
              {enCours ? "..." : "Terminer la lecture"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
