"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Cloche } from "@/components/icons/Cloche";
import { ActivEntry } from "@/components/ActivEntry";
import {
  construireEntree,
  type EntreeActivite,
  type LigneActiviteBrute,
  type LigneCommentaireBrute,
  type LigneReactionBrute,
} from "@/lib/activity";

export function NotificationBell({
  profilId,
  pseudo,
}: {
  profilId: string;
  pseudo: string;
}) {
  const supabase = createClient();

  const [ouvert, setOuvert] = useState(false);
  const [charge, setCharge] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [entrees, setEntrees] = useState<EntreeActivite[]>([]);
  const [badge, setBadge] = useState(0);

  const ouvertRef = useRef(ouvert);
  const dernierVuRef = useRef<string | null>(null);
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ouvertRef.current = ouvert;
  }, [ouvert]);

  // Compteur initial de mouvement non vu depuis la dernière ouverture.
  useEffect(() => {
    let annule = false;
    async function init() {
      const { data: prof } = await supabase
        .from("profiles")
        .select("dernier_vu_activite")
        .eq("id", profilId)
        .single();

      const dernierVu = prof?.dernier_vu_activite ?? null;
      dernierVuRef.current = dernierVu;

      let requete = supabase
        .from("activity_feed")
        .select("id", { count: "exact", head: true })
        .neq("user_id", profilId);
      if (dernierVu) requete = requete.gt("created_at", dernierVu);

      const { count } = await requete;
      if (!annule) setBadge(count ?? 0);
    }
    init();
    return () => {
      annule = true;
    };
  }, [profilId, supabase]);

  async function ajouterEntreeParId(id: string) {
    const { data: ligne } = await supabase
      .from("activity_feed")
      .select("id, type, contenu, created_at, user_id, profil:profiles(pseudo)")
      .eq("id", id)
      .single<LigneActiviteBrute>();

    if (!ligne) return;

    setEntrees((l) => {
      if (l.some((e) => e.id === ligne.id)) return l;
      return [construireEntree(ligne, [], [], profilId), ...l];
    });
  }

  // Fil en temps réel : une nouvelle entrée arrive pour tout le monde.
  useEffect(() => {
    const channel = supabase
      .channel("activity-feed-cloche")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_feed" },
        (payload) => {
          const ligne = payload.new as { id: string; user_id: string };
          if (ligne.user_id !== profilId && !ouvertRef.current) {
            setBadge((n) => n + 1);
          }
          if (ouvertRef.current) {
            ajouterEntreeParId(ligne.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profilId]);

  // Ferme le panneau au clic en dehors.
  useEffect(() => {
    if (!ouvert) return;
    function onClickDehors(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", onClickDehors);
    return () => document.removeEventListener("mousedown", onClickDehors);
  }, [ouvert]);

  async function chargerFeed() {
    setChargement(true);
    const { data: lignes } = await supabase
      .from("activity_feed")
      .select("id, type, contenu, created_at, user_id, profil:profiles(pseudo)")
      .order("created_at", { ascending: false })
      .limit(30)
      .returns<LigneActiviteBrute[]>();

    const ids = (lignes || []).map((l) => l.id);

    const [{ data: reactions }, { data: commentaires }] = await Promise.all([
      ids.length
        ? supabase
            .from("activity_reactions")
            .select("activity_id, user_id")
            .in("activity_id", ids)
            .returns<LigneReactionBrute[]>()
        : Promise.resolve({ data: [] as LigneReactionBrute[] }),
      ids.length
        ? supabase
            .from("activity_comments")
            .select("id, activity_id, user_id, texte, created_at, profil:profiles(pseudo)")
            .in("activity_id", ids)
            .order("created_at", { ascending: true })
            .returns<LigneCommentaireBrute[]>()
        : Promise.resolve({ data: [] as LigneCommentaireBrute[] }),
    ]);

    setEntrees(
      (lignes || []).map((ligne) =>
        construireEntree(ligne, reactions || [], commentaires || [], profilId)
      )
    );
    setCharge(true);
    setChargement(false);
  }

  async function ouvrirCloche() {
    const prochainEtat = !ouvert;
    setOuvert(prochainEtat);
    if (!prochainEtat) return;

    if (!charge) chargerFeed();

    setBadge(0);
    const maintenant = new Date().toISOString();
    dernierVuRef.current = maintenant;
    await supabase
      .from("profiles")
      .update({ dernier_vu_activite: maintenant })
      .eq("id", profilId);
  }

  async function reagir(id: string) {
    const entree = entrees.find((e) => e.id === id);
    if (!entree) return;

    const jAvaisReagi = entree.jaiReagi;
    setEntrees((l) =>
      l.map((e) =>
        e.id === id
          ? { ...e, jaiReagi: !jAvaisReagi, nbReactions: e.nbReactions + (jAvaisReagi ? -1 : 1) }
          : e
      )
    );

    if (jAvaisReagi) {
      await supabase
        .from("activity_reactions")
        .delete()
        .eq("activity_id", id)
        .eq("user_id", profilId);
    } else {
      await supabase.from("activity_reactions").insert({ activity_id: id, user_id: profilId });
    }
  }

  async function commenter(id: string, texte: string) {
    const { data, error } = await supabase
      .from("activity_comments")
      .insert({ activity_id: id, user_id: profilId, texte })
      .select("id, created_at")
      .single();

    if (error || !data) return;

    setEntrees((l) =>
      l.map((e) =>
        e.id === id
          ? {
              ...e,
              commentaires: [
                ...e.commentaires,
                { id: data.id, userId: profilId, pseudo, texte, createdAt: data.created_at },
              ],
            }
          : e
      )
    );
  }

  return (
    <div className="plot-cloche-wrap" ref={conteneurRef}>
      <button
        className="plot-cloche-btn"
        onClick={ouvrirCloche}
        aria-label="Fil d'activité"
        title="Fil d'activité"
      >
        <Cloche />
        {badge > 0 && <span className="plot-cloche-badge">{badge > 9 ? "9+" : badge}</span>}
      </button>

      {ouvert && (
        <div className="plot-cloche-dropdown">
          <p className="plot-cloche-dropdown-titre">Activité</p>
          <div className="plot-cloche-liste">
            {chargement && <p className="plot-chargement">Chargement...</p>}
            {!chargement && entrees.length === 0 && (
              <p className="plot-chargement">Rien pour l&apos;instant.</p>
            )}
            {!chargement &&
              entrees.map((e) => (
                <ActivEntry key={e.id} entree={e} onReagir={reagir} onCommenter={commenter} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
