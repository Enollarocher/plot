"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlotMark } from "@/components/PlotMark";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const MESSAGES_ERREUR_URL: Record<string, string> = {
  "lien-invalide": "Ce lien a expiré ou n'est plus valide, réessaie.",
  "connexion-echouee": "La connexion a échoué, réessaie.",
  "profil-manquant":
    "Ton profil est en cours de création, reconnecte-toi dans un instant.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const next = searchParams.get("next") || "/";
  const erreurUrl = searchParams.get("erreur");

  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState(
    erreurUrl ? MESSAGES_ERREUR_URL[erreurUrl] ?? "" : ""
  );
  const [enCours, setEnCours] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");
    setEnCours(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: motDePasse,
    });

    setEnCours(false);

    if (error) {
      if (error.message.toLowerCase().includes("invalid login")) {
        setErreur("E-mail ou mot de passe incorrect.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setErreur("Confirme d'abord ton e-mail via le lien reçu à l'inscription.");
      } else {
        setErreur("Connexion impossible : " + error.message);
      }
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="plot-auth-page">
      <div className="plot-auth-marque">
        <PlotMark />
      </div>

      <div className="plot-auth-box">
        <p className="plot-auth-titre">Bon retour</p>
        <p className="plot-auth-sous">Ta pile de livres t&apos;attend.</p>

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

          <div className="plot-champ">
            <label className="plot-label" htmlFor="mot-de-passe">
              Mot de passe
            </label>
            <input
              id="mot-de-passe"
              type="password"
              className="plot-input"
              value={motDePasse}
              autoComplete="current-password"
              required
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          {erreur && <p className="plot-panneau-erreur">{erreur}</p>}

          <button type="submit" className="plot-btn plot-btn-pleine" disabled={enCours}>
            {enCours ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="plot-bascule" style={{ marginTop: 14 }}>
          <Link className="plot-lien" href="/forgot-password">
            Mot de passe oublié ?
          </Link>
        </p>

        <div className="plot-separateur">ou</div>
        <GoogleAuthButton label="Continuer avec Google" />

        <p className="plot-bascule">
          Pas encore de compte ? <Link className="plot-lien" href="/signup">S&apos;inscrire</Link>
        </p>
      </div>
    </main>
  );
}
