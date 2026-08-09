"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normaliserPseudo, pseudoValide, PSEUDO_AIDE } from "@/lib/pseudo";
import { PlotMark } from "@/components/PlotMark";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

type StatutPseudo = "inactif" | "verification" | "libre" | "pris" | "invalide";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [confirmation, setConfirmation] = useState("");
  // Résultat de la dernière vérification de disponibilité reçue, associé au
  // pseudo qu'il concerne — permet de détecter un résultat périmé au rendu
  // plutôt que de réinitialiser l'état de façon synchrone dans l'effet.
  const [resultatDispo, setResultatDispo] = useState<{
    pseudo: string;
    statut: "libre" | "pris";
  } | null>(null);
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [emailEnvoye, setEmailEnvoye] = useState(false);

  const delaiPseudo = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Statut de format dérivé directement du champ — pas besoin d'effet.
  const pseudoNormalise = normaliserPseudo(pseudo);
  const formatValide = useMemo(
    () => pseudoNormalise.length > 0 && pseudoValide(pseudoNormalise),
    [pseudoNormalise]
  );

  useEffect(() => {
    if (delaiPseudo.current) clearTimeout(delaiPseudo.current);
    if (!formatValide) return;

    delaiPseudo.current = setTimeout(async () => {
      const { data, error } = await supabase.rpc("pseudo_disponible", {
        p: pseudoNormalise,
      });
      if (!error) {
        setResultatDispo({ pseudo: pseudoNormalise, statut: data ? "libre" : "pris" });
      }
    }, 400);

    return () => {
      if (delaiPseudo.current) clearTimeout(delaiPseudo.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pseudoNormalise, formatValide]);

  const statutPseudo: StatutPseudo = !pseudoNormalise
    ? "inactif"
    : !formatValide
      ? "invalide"
      : resultatDispo && resultatDispo.pseudo === pseudoNormalise
        ? resultatDispo.statut
        : "verification";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur("");

    const p = normaliserPseudo(pseudo);
    if (!pseudoValide(p)) {
      setErreur("Choisis un pseudo valide : " + PSEUDO_AIDE);
      return;
    }
    if (statutPseudo === "pris") {
      setErreur("Ce pseudo est déjà pris.");
      return;
    }
    if (motDePasse.length < 8) {
      setErreur("Le mot de passe doit faire au moins 8 caractères.");
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setEnCours(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: motDePasse,
      options: {
        data: { pseudo: p },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/`,
      },
    });
    setEnCours(false);

    if (error) {
      if (error.message.toLowerCase().includes("already registered")) {
        setErreur("Un compte existe déjà avec cet e-mail.");
      } else if (error.message.toLowerCase().includes("password")) {
        setErreur("Mot de passe trop faible : ajoute quelques caractères.");
      } else {
        setErreur("Inscription impossible : " + error.message);
      }
      return;
    }

    if (data.session) {
      router.push("/");
      router.refresh();
      return;
    }

    setEmailEnvoye(true);
  }

  if (emailEnvoye) {
    return (
      <main className="plot-auth-page">
        <div className="plot-auth-marque">
          <PlotMark />
        </div>
        <div className="plot-auth-box">
          <p className="plot-auth-titre">Vérifie ta boîte mail</p>
          <p className="plot-auth-sous">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Clique dessus pour activer ton compte — ton étagère et ton profil
            t&apos;attendent déjà.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="plot-auth-page">
      <div className="plot-auth-marque">
        <PlotMark />
      </div>

      <div className="plot-auth-box">
        <p className="plot-auth-titre">Rejoindre Plot</p>
        <p className="plot-auth-sous">Ton étagère, tes copines, tes salons.</p>

        <form onSubmit={handleSubmit}>
          <div className="plot-champ">
            <label className="plot-label" htmlFor="pseudo">
              Pseudo
            </label>
            <input
              id="pseudo"
              className="plot-input"
              placeholder="ex. nono-lit"
              value={pseudo}
              autoComplete="username"
              onChange={(e) => setPseudo(e.target.value)}
            />
            <IndicateurPseudo statut={statutPseudo} />
          </div>

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
              placeholder="8 caractères minimum"
              value={motDePasse}
              autoComplete="new-password"
              required
              onChange={(e) => setMotDePasse(e.target.value)}
            />
          </div>

          <div className="plot-champ">
            <label className="plot-label" htmlFor="confirmation">
              Confirmer le mot de passe
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
            {enCours ? "Création du compte..." : "Créer mon compte"}
          </button>
        </form>

        <div className="plot-separateur">ou</div>
        <GoogleAuthButton label="Continuer avec Google" />

        <p className="plot-bascule">
          Déjà un compte ? <Link className="plot-lien" href="/login">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}

function IndicateurPseudo({ statut }: { statut: StatutPseudo }) {
  if (statut === "inactif") return null;
  if (statut === "verification") {
    return <p className="plot-panneau-info">Vérification...</p>;
  }
  if (statut === "invalide") {
    return <p className="plot-profil-champ-erreur">{PSEUDO_AIDE}</p>;
  }
  if (statut === "pris") {
    return <p className="plot-profil-champ-erreur">Ce pseudo est déjà pris.</p>;
  }
  return <p className="plot-panneau-info">Pseudo disponible.</p>;
}
