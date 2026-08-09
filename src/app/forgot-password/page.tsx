"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PlotMark } from "@/components/PlotMark";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/update-password`,
    });

    setEnCours(false);

    if (error) {
      setErreur("Impossible d'envoyer le lien : " + error.message);
      return;
    }

    setEnvoye(true);
  }

  return (
    <main className="plot-auth-page">
      <div className="plot-auth-marque">
        <PlotMark />
      </div>

      <div className="plot-auth-box">
        {envoye ? (
          <>
            <p className="plot-auth-titre">Lien envoyé</p>
            <p className="plot-auth-sous">
              Si un compte existe pour <strong>{email}</strong>, un lien de
              réinitialisation vient d&apos;être envoyé.
            </p>
          </>
        ) : (
          <>
            <p className="plot-auth-titre">Mot de passe oublié</p>
            <p className="plot-auth-sous">
              On t&apos;envoie un lien pour en choisir un nouveau.
            </p>
            <form onSubmit={handleSubmit}>
              <div className="plot-champ">
                <label className="plot-label" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  className="plot-input"
                  placeholder="toi@exemple.com"
                  value={email}
                  autoComplete="email"
                  required
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {erreur && <p className="plot-panneau-erreur">{erreur}</p>}

              <button type="submit" className="plot-btn plot-btn-pleine" disabled={enCours}>
                {enCours ? "Envoi..." : "Envoyer le lien"}
              </button>
            </form>
          </>
        )}

        <p className="plot-bascule">
          <Link className="plot-lien" href="/login">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
