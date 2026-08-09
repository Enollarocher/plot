"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlotMark } from "@/components/PlotMark";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const { error } = await supabase.auth.updateUser({ password: motDePasse });
    setEnCours(false);

    if (error) {
      setErreur("Impossible de mettre à jour le mot de passe : " + error.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="plot-auth-page">
      <div className="plot-auth-marque">
        <PlotMark />
      </div>

      <div className="plot-auth-box">
        <p className="plot-auth-titre">Choisir un nouveau mot de passe</p>

        <form onSubmit={handleSubmit}>
          <div className="plot-champ">
            <label className="plot-label" htmlFor="mot-de-passe">
              Nouveau mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              className="plot-input"
              placeholder="8 caractères minimum"
              value={motDePasse}
              autoComplete="new-password"
              required
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          <div className="plot-champ">
            <label className="plot-label" htmlFor="confirmation">
              Confirmer
            </label>
            <input
              id="confirmation"
              type="password"
              className="plot-input"
              value={confirmation}
              autoComplete="new-password"
              required
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>

          {erreur && <p className="plot-panneau-erreur">{erreur}</p>}

          <button type="submit" className="plot-btn plot-btn-pleine" disabled={enCours}>
            {enCours ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      </div>
    </main>
  );
}
