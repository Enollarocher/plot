"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normaliserPseudo, pseudoValide, PSEUDO_AIDE } from "@/lib/pseudo";
import { PlotMark } from "@/components/PlotMark";
import { Avatar } from "@/components/Avatar";

export type Profil = {
  id: string;
  pseudo: string;
  bio: string;
};

type Onglet = "activite" | "etageres" | "salons";

export function AppShell({ profil: profilInitial }: { profil: Profil }) {
  const router = useRouter();
  const supabase = createClient();

  const [onglet, setOnglet] = useState<Onglet>("etageres");
  const [profil, setProfil] = useState(profilInitial);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  async function seDeconnecter() {
    setDeconnexionEnCours(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div>
      <header className="plot-header">
        <div className="plot-header-inner">
          <PlotMark />
          <nav className="plot-nav">
            <button
              className={onglet === "activite" ? "plot-nav-btn active" : "plot-nav-btn"}
              onClick={() => setOnglet("activite")}
            >
              Activité
            </button>
            <button
              className={onglet === "etageres" ? "plot-nav-btn active" : "plot-nav-btn"}
              onClick={() => setOnglet("etageres")}
            >
              Étagères
            </button>
            <button
              className={onglet === "salons" ? "plot-nav-btn active" : "plot-nav-btn"}
              onClick={() => setOnglet("salons")}
            >
              Salons
            </button>
          </nav>
          <div className="plot-header-compte">
            <button
              className="plot-lien-deconnexion"
              onClick={seDeconnecter}
              disabled={deconnexionEnCours}
            >
              {deconnexionEnCours ? "Déconnexion..." : "Se déconnecter"}
            </button>
          </div>
        </div>
      </header>

      <div className="plot-shell">
        {onglet === "etageres" && (
          <ProfilSection profil={profil} onProfilChange={setProfil} />
        )}
        {onglet === "activite" && (
          <p className="plot-chargement">
            Le fil d&apos;activité arrive à la Phase 3 — la cloche de
            notification et les Plot Moments sont pour bientôt.
          </p>
        )}
        {onglet === "salons" && (
          <p className="plot-chargement">
            Les Book Clubs arrivent à la Phase 4.
          </p>
        )}
      </div>
    </div>
  );
}

function ProfilSection({
  profil,
  onProfilChange,
}: {
  profil: Profil;
  onProfilChange: (p: Profil) => void;
}) {
  const supabase = createClient();

  const [editionNom, setEditionNom] = useState(false);
  const [brouillonNom, setBrouillonNom] = useState(profil.pseudo);
  const [erreurNom, setErreurNom] = useState("");

  const [editionBio, setEditionBio] = useState(false);
  const [brouillonBio, setBrouillonBio] = useState(profil.bio);
  const [erreurBio, setErreurBio] = useState("");

  const enregistrementEnCours = useRef(false);

  async function enregistrerNom() {
    const p = normaliserPseudo(brouillonNom);
    setEditionNom(false);

    if (p === profil.pseudo) return;

    if (!pseudoValide(p)) {
      setErreurNom("Pseudo invalide : " + PSEUDO_AIDE);
      setBrouillonNom(profil.pseudo);
      return;
    }
    if (enregistrementEnCours.current) return;
    enregistrementEnCours.current = true;

    const { error } = await supabase
      .from("profiles")
      .update({ pseudo: p })
      .eq("id", profil.id);

    enregistrementEnCours.current = false;

    if (error) {
      setErreurNom(
        error.code === "23505"
          ? "Ce pseudo est déjà pris."
          : "Impossible d'enregistrer ce pseudo."
      );
      setBrouillonNom(profil.pseudo);
      return;
    }

    setErreurNom("");
    onProfilChange({ ...profil, pseudo: p });
  }

  async function enregistrerBio() {
    const bio = brouillonBio.trim().slice(0, 280);
    setEditionBio(false);

    if (bio === profil.bio) return;

    const { error } = await supabase
      .from("profiles")
      .update({ bio })
      .eq("id", profil.id);

    if (error) {
      setErreurBio("Impossible d'enregistrer la bio.");
      setBrouillonBio(profil.bio);
      return;
    }

    setErreurBio("");
    onProfilChange({ ...profil, bio });
  }

  return (
    <section>
      <div className="plot-profil">
        <Avatar pseudo={profil.pseudo} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editionNom ? (
            <input
              className="plot-profil-nom-input"
              value={brouillonNom}
              autoFocus
              onChange={(e) => setBrouillonNom(e.target.value)}
              onBlur={enregistrerNom}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          ) : (
            <button
              className="plot-profil-nom"
              onClick={() => {
                setBrouillonNom(profil.pseudo);
                setEditionNom(true);
              }}
              title="Modifier ton pseudo"
            >
              {profil.pseudo}
            </button>
          )}
          {erreurNom && <p className="plot-profil-champ-erreur">{erreurNom}</p>}

          {editionBio ? (
            <textarea
              className="plot-profil-bio-input"
              value={brouillonBio}
              autoFocus
              rows={2}
              maxLength={280}
              onChange={(e) => setBrouillonBio(e.target.value)}
              onBlur={enregistrerBio}
            />
          ) : (
            <button
              className="plot-profil-bio"
              onClick={() => {
                setBrouillonBio(profil.bio);
                setEditionBio(true);
              }}
              title="Modifier ta bio"
            >
              {profil.bio || "Ajouter une bio..."}
            </button>
          )}
          {erreurBio && <p className="plot-profil-champ-erreur">{erreurBio}</p>}
        </div>
      </div>

      <div className="plot-stats">
        <div>
          <span className="plot-stat-n">0</span>
          <span className="plot-stat-l">Lus</span>
        </div>
        <div>
          <span className="plot-stat-n">0</span>
          <span className="plot-stat-l">En cours</span>
        </div>
        <div>
          <span className="plot-stat-n">0</span>
          <span className="plot-stat-l">Envie de lire</span>
        </div>
        <div>
          <span className="plot-stat-n">0</span>
          <span className="plot-stat-l">Abonnements</span>
        </div>
        <div>
          <span className="plot-stat-n">0</span>
          <span className="plot-stat-l">Abonnés</span>
        </div>
      </div>

      <p className="plot-chargement" style={{ padding: "0 0 20px" }}>
        Les étagères (Envie de lire / En cours / Lu) et la recherche de
        livres arrivent à la Phase 2.
      </p>
    </section>
  );
}
