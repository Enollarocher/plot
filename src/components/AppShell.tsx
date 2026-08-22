"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PlotMark } from "@/components/PlotMark";
import { EtageresListe } from "@/components/EtageresListe";
import { NotificationBell } from "@/components/NotificationBell";
import { SalonsListe } from "@/components/SalonsListe";
import { AbonnementsSection } from "@/components/AbonnementsSection";
import { ProfilEditable, type Profil } from "@/components/ProfilEditable";
import type { DonneesAjoutManuel, LivreEtagere } from "@/lib/shelf";
import type { ResultatRecherche } from "@/lib/googleBooks";
import { televerserCouverture } from "@/lib/storage";

export type { Profil };

type Onglet = "etageres" | "salons";

export function AppShell({
  profil: profilInitial,
  etagereInitiale,
}: {
  profil: Profil;
  etagereInitiale: LivreEtagere[];
}) {
  const router = useRouter();
  const supabase = createClient();

  const [onglet, setOnglet] = useState<Onglet>("etageres");
  const [profil, setProfil] = useState(profilInitial);
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false);

  const [envie, setEnvie] = useState(
    etagereInitiale.filter((l) => l.statut === "envie")
  );
  const [enCours, setEnCours] = useState(
    etagereInitiale.filter((l) => l.statut === "en_cours")
  );
  const [lu, setLu] = useState(etagereInitiale.filter((l) => l.statut === "lu"));
  const [abandonnes, setAbandonnes] = useState(
    etagereInitiale.filter((l) => l.statut === "abandonne")
  );
  const [erreurEtagere, setErreurEtagere] = useState("");

  const [salonOuvert, setSalonOuvert] = useState<string | null>(null);
  const [nbAbonnements, setNbAbonnements] = useState(0);
  const [nbAbonnes, setNbAbonnes] = useState(0);

  function ouvrirSalonDepuisActivite(clubId: string) {
    setOnglet("salons");
    setSalonOuvert(clubId);
  }

  function toggleSalon(clubId: string) {
    setSalonOuvert((c) => (c === clubId ? null : clubId));
  }

  async function seDeconnecter() {
    setDeconnexionEnCours(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function ajouterLivreAEnvie(livre: {
    id: string;
    titre: string;
    auteur: string;
    couverture_url: string | null;
    pages: number | null;
  }) {
    setErreurEtagere("");
    const { data, error } = await supabase
      .from("user_books")
      .insert({ user_id: profil.id, book_id: livre.id, statut: "envie" })
      .select("id, statut, note, dernier_moment, commence_le, termine_le")
      .single();

    if (error || !data) {
      setErreurEtagere(
        error?.code === "23505"
          ? "Ce livre est déjà sur ton étagère."
          : "Impossible d'ajouter ce livre, réessaie."
      );
      return false;
    }

    const nouveauLivre: LivreEtagere = {
      id: data.id,
      statut: "envie",
      note: data.note,
      dernierMoment: data.dernier_moment,
      commenceLe: data.commence_le,
      termineLe: data.termine_le,
      livre: {
        id: livre.id,
        titre: livre.titre,
        auteur: livre.auteur,
        couverture: livre.couverture_url,
        pages: livre.pages,
      },
    };
    setEnvie((l) => [nouveauLivre, ...l]);
    return true;
  }

  async function ajouterResultat(item: ResultatRecherche) {
    const { data: livre, error } = await supabase
      .from("books")
      .upsert(
        {
          google_volume_id: item.cle,
          titre: item.titre,
          auteur: item.auteur,
          couverture_url: item.couverture,
          pages: item.pages,
          isbn: item.isbn,
          resume: item.resume,
        },
        { onConflict: "google_volume_id" }
      )
      .select("id, titre, auteur, couverture_url, pages")
      .single();

    if (error || !livre) {
      setErreurEtagere("Impossible d'ajouter ce livre, réessaie.");
      return;
    }

    await ajouterLivreAEnvie(livre);
  }

  async function ajouterManuel(donnees: DonneesAjoutManuel) {
    let couvertureUrl: string | null = null;
    let erreurPhoto = "";

    if (donnees.couverture) {
      try {
        couvertureUrl = await televerserCouverture(
          supabase,
          profil.id,
          donnees.couverture
        );
      } catch {
        // On n'empêche pas l'ajout du livre pour un échec d'upload : ses
        // infos (titre, auteur...) restent plus précieuses que la photo.
        erreurPhoto = "Livre ajouté, mais la photo n'a pas pu être envoyée.";
      }
    }

    const { data: livre, error } = await supabase
      .from("books")
      .insert({
        titre: donnees.titre,
        auteur: donnees.auteur,
        pages: donnees.pages,
        resume: donnees.resume || null,
        isbn: donnees.isbn || null,
        couverture_url: couvertureUrl,
      })
      .select("id, titre, auteur, couverture_url, pages")
      .single();

    if (error || !livre) {
      setErreurEtagere("Impossible d'ajouter ce livre, réessaie.");
      return;
    }

    const ajoute = await ajouterLivreAEnvie(livre);
    if (ajoute && erreurPhoto) setErreurEtagere(erreurPhoto);
  }

  async function commencerLecture(id: string) {
    const item = envie.find((i) => i.id === id);
    if (!item) return;

    const maintenant = new Date().toISOString();
    setEnvie((l) => l.filter((i) => i.id !== id));
    setEnCours((l) => [{ ...item, statut: "en_cours", commenceLe: maintenant }, ...l]);

    const { error } = await supabase
      .from("user_books")
      .update({ statut: "en_cours", commence_le: maintenant })
      .eq("id", id);

    if (error) {
      // on remet l'étagère dans son état précédent en cas d'échec
      setEnCours((l) => l.filter((i) => i.id !== id));
      setEnvie((l) => [item, ...l]);
      setErreurEtagere("Impossible de commencer ce livre, réessaie.");
      return;
    }

    await supabase.from("activity_feed").insert({
      user_id: profil.id,
      type: "commence",
      contenu: { titre: item.livre.titre, bookId: item.livre.id },
    });
  }

  async function ajouterMoment(id: string, texte: string) {
    const item = enCours.find((i) => i.id === id);
    setEnCours((l) =>
      l.map((i) => (i.id === id ? { ...i, dernierMoment: texte } : i))
    );
    await supabase.from("user_books").update({ dernier_moment: texte }).eq("id", id);

    if (item) {
      await supabase.from("activity_feed").insert({
        user_id: profil.id,
        type: "moment",
        contenu: { titre: item.livre.titre, bookId: item.livre.id, texte },
      });
    }
  }

  async function terminerLecture(id: string, note: number) {
    const item = enCours.find((i) => i.id === id);
    if (!item) return;

    const maintenant = new Date().toISOString();
    setEnCours((l) => l.filter((i) => i.id !== id));
    setLu((l) => [{ ...item, statut: "lu", note, termineLe: maintenant }, ...l]);

    const { error } = await supabase
      .from("user_books")
      .update({ statut: "lu", note, termine_le: maintenant })
      .eq("id", id);

    if (error) {
      setLu((l) => l.filter((i) => i.id !== id));
      setEnCours((l) => [item, ...l]);
      setErreurEtagere("Impossible de terminer ce livre, réessaie.");
      return;
    }

    const heure = new Date().toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    await supabase.from("activity_feed").insert({
      user_id: profil.id,
      type: "termine",
      contenu: { titre: item.livre.titre, bookId: item.livre.id, note, heure },
    });
  }

  async function abandonnerLecture(id: string) {
    const item = enCours.find((i) => i.id === id);
    if (!item) return;

    const maintenant = new Date().toISOString();
    setEnCours((l) => l.filter((i) => i.id !== id));
    setAbandonnes((l) => [{ ...item, statut: "abandonne", termineLe: maintenant }, ...l]);

    const { error } = await supabase
      .from("user_books")
      .update({ statut: "abandonne", termine_le: maintenant })
      .eq("id", id);

    if (error) {
      setAbandonnes((l) => l.filter((i) => i.id !== id));
      setEnCours((l) => [item, ...l]);
      setErreurEtagere("Impossible d'abandonner ce livre, réessaie.");
    }
  }

  return (
    <div>
      <header className="plot-header">
        <div className="plot-header-inner">
          <NotificationBell
            profilId={profil.id}
            pseudo={profil.pseudo}
            onOuvrirSalon={ouvrirSalonDepuisActivite}
          />
          <PlotMark />
          <nav className="plot-nav">
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
          <section>
            <ProfilEditable
              profil={profil}
              onProfilChange={setProfil}
              nbLu={lu.length}
              nbEnCours={enCours.length}
              nbEnvie={envie.length}
              nbAbandonnes={abandonnes.length}
              nbAbonnements={nbAbonnements}
              nbAbonnes={nbAbonnes}
              lienProfilComplet
            />
            <AbonnementsSection
              profilId={profil.id}
              onCompteChange={(a, s) => {
                setNbAbonnements(a);
                setNbAbonnes(s);
              }}
            />
            {erreurEtagere && <p className="plot-panneau-erreur">{erreurEtagere}</p>}
            <EtageresListe
              envie={envie}
              enCours={enCours}
              lu={lu}
              abandonnes={abandonnes}
              onCommencer={commencerLecture}
              onMoment={ajouterMoment}
              onTerminer={terminerLecture}
              onAbandonner={abandonnerLecture}
              onAjouterResultat={ajouterResultat}
              onAjouterManuel={ajouterManuel}
            />
          </section>
        )}
        {onglet === "salons" && (
          <SalonsListe
            profilId={profil.id}
            pseudo={profil.pseudo}
            salonOuvert={salonOuvert}
            onToggleSalon={toggleSalon}
          />
        )}
      </div>
    </div>
  );
}
