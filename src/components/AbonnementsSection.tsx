"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { normaliserPseudo } from "@/lib/pseudo";

type Personne = { id: string; pseudo: string };

export function AbonnementsSection({
  profilId,
  onCompteChange,
}: {
  profilId: string;
  onCompteChange?: (nbAbonnements: number, nbAbonnes: number) => void;
}) {
  const supabase = createClient();

  const [abonnements, setAbonnements] = useState<Personne[]>([]);
  const [abonnes, setAbonnes] = useState<Personne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [pseudoSuivre, setPseudoSuivre] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let annule = false;
    async function charger() {
      const [{ data: mesAbonnements }, { data: mesAbonnes }] = await Promise.all([
        supabase
          .from("follows")
          .select("suivi_id, profil:profiles!follows_suivi_id_fkey(pseudo)")
          .eq("follower_id", profilId)
          .returns<{ suivi_id: string; profil: { pseudo: string } | null }[]>(),
        supabase
          .from("follows")
          .select("follower_id, profil:profiles!follows_follower_id_fkey(pseudo)")
          .eq("suivi_id", profilId)
          .returns<{ follower_id: string; profil: { pseudo: string } | null }[]>(),
      ]);

      if (annule) return;

      setAbonnements(
        (mesAbonnements || [])
          .filter((r) => r.profil)
          .map((r) => ({ id: r.suivi_id, pseudo: r.profil!.pseudo }))
      );
      setAbonnes(
        (mesAbonnes || [])
          .filter((r) => r.profil)
          .map((r) => ({ id: r.follower_id, pseudo: r.profil!.pseudo }))
      );
      setChargement(false);
    }
    charger();
    return () => {
      annule = true;
    };
  }, [profilId, supabase]);

  useEffect(() => {
    onCompteChange?.(abonnements.length, abonnes.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abonnements.length, abonnes.length]);

  async function suivre() {
    const p = normaliserPseudo(pseudoSuivre);
    if (!p || enCours) return;
    setEnCours(true);
    setErreur("");

    const { data: cible } = await supabase
      .from("profiles")
      .select("id, pseudo")
      .eq("pseudo", p)
      .maybeSingle();

    if (!cible) {
      setErreur("Aucun pseudo ne correspond.");
      setEnCours(false);
      return;
    }
    if (cible.id === profilId) {
      setErreur("Tu ne peux pas te suivre toi-même.");
      setEnCours(false);
      return;
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: profilId, suivi_id: cible.id });

    setEnCours(false);

    if (error) {
      setErreur(error.code === "23505" ? "Tu suis déjà cette personne." : "Impossible de suivre cette personne.");
      return;
    }

    setAbonnements((l) => [...l, { id: cible.id, pseudo: cible.pseudo }]);
    setPseudoSuivre("");
  }

  async function retirer(id: string) {
    setAbonnements((l) => l.filter((a) => a.id !== id));
    await supabase.from("follows").delete().eq("follower_id", profilId).eq("suivi_id", id);
  }

  return (
    <div className="plot-amis">
      <p className="plot-membres-titre">Mes abonnements</p>
      <div className="plot-membres-liste">
        {abonnements.map((a) => (
          <span key={a.id} className="plot-chip">
            <Link href={`/profil/${a.pseudo}`} className="plot-chip-lien">
              <Avatar pseudo={a.pseudo} size={20} /> {a.pseudo}
            </Link>
            <button
              className="plot-chip-retirer"
              onClick={() => retirer(a.id)}
              aria-label={`Ne plus suivre ${a.pseudo}`}
            >
              &times;
            </button>
          </span>
        ))}
        {!chargement && abonnements.length === 0 && (
          <span className="plot-par">Tu ne suis personne pour l&apos;instant.</span>
        )}
      </div>
      <div className="plot-msg-form">
        <input
          className="plot-input"
          placeholder="Suivre un pseudo..."
          value={pseudoSuivre}
          onChange={(e) => setPseudoSuivre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && suivre()}
        />
        <button className="plot-btn-mini" onClick={suivre} disabled={enCours}>
          Suivre
        </button>
      </div>
      {erreur && <p className="plot-panneau-erreur">{erreur}</p>}

      <p className="plot-membres-titre plot-membres-titre-espace">Qui me suit</p>
      <div className="plot-membres-liste">
        {abonnes.map((a) => (
          <Link key={a.id} href={`/profil/${a.pseudo}`} className="plot-chip">
            <Avatar pseudo={a.pseudo} size={20} /> {a.pseudo}
          </Link>
        ))}
        {!chargement && abonnes.length === 0 && (
          <span className="plot-par">Personne pour l&apos;instant.</span>
        )}
      </div>
    </div>
  );
}
