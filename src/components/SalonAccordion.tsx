"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/Avatar";
import { normaliserPseudo } from "@/lib/pseudo";
import {
  LIBELLE_ROLE,
  versMembre,
  versMessage,
  type Club,
  type LigneMembreBrute,
  type LigneMessageBrute,
  type MembreClub,
  type MessageClub,
  type RoleMembre,
} from "@/lib/clubs";

export function SalonAccordion({
  club,
  profilId,
  pseudo,
  monMembre,
  ouvert,
  onToggle,
  onMembreMisAJour,
  suggestions,
}: {
  club: Club;
  profilId: string;
  pseudo: string;
  monMembre: MembreClub | undefined;
  ouvert: boolean;
  onToggle: () => void;
  onMembreMisAJour: (membre: MembreClub) => void;
  suggestions: { id: string; pseudo: string }[];
}) {
  const supabase = createClient();

  const [membres, setMembres] = useState<MembreClub[]>([]);
  const [messages, setMessages] = useState<MessageClub[]>([]);
  const [charge, setCharge] = useState(false);
  const [brouillon, setBrouillon] = useState("");
  const [pseudoInvite, setPseudoInvite] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const membresRef = useRef(membres);
  useEffect(() => {
    membresRef.current = membres;
  }, [membres]);

  const estMembre = monMembre?.statut === "accepte";
  const estInvitee = monMembre?.statut === "invite";
  const peutRejoindre = !monMembre && !club.prive;
  const estAdmin = estMembre && monMembre?.role === "administrateur";
  const peutPublier = estMembre && monMembre?.role !== "observateur";

  useEffect(() => {
    if (!ouvert || !estMembre || charge) return;
    let annule = false;
    async function charger() {
      const [{ data: membresBruts }, { data: messagesBruts }] = await Promise.all([
        supabase
          .from("club_members")
          .select("club_id, user_id, role, statut, profil:profiles(pseudo)")
          .eq("club_id", club.id)
          .returns<LigneMembreBrute[]>(),
        supabase
          .from("club_messages")
          .select("id, club_id, user_id, texte, created_at, profil:profiles(pseudo)")
          .eq("club_id", club.id)
          .order("created_at", { ascending: true })
          .returns<LigneMessageBrute[]>(),
      ]);
      if (annule) return;
      setMembres((membresBruts || []).map(versMembre));
      setMessages((messagesBruts || []).map(versMessage));
      setCharge(true);
    }
    charger();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, estMembre, club.id]);

  // Messagerie en temps réel, seulement pendant que le salon est ouvert.
  useEffect(() => {
    if (!ouvert || !estMembre) return;
    const channel = supabase
      .channel(`club-messages-${club.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "club_messages", filter: `club_id=eq.${club.id}` },
        (payload) => {
          const row = payload.new as { id: string; user_id: string; texte: string; created_at: string };
          setMessages((m) => {
            if (m.some((x) => x.id === row.id)) return m;
            const p = membresRef.current.find((mb) => mb.userId === row.user_id)?.pseudo ?? "?";
            return [...m, { id: row.id, clubId: club.id, userId: row.user_id, pseudo: p, texte: row.texte, createdAt: row.created_at }];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouvert, estMembre, club.id]);

  async function envoyer() {
    const texte = brouillon.trim();
    if (!texte || !peutPublier) return;
    setBrouillon("");

    const { error } = await supabase
      .from("club_messages")
      .insert({ club_id: club.id, user_id: profilId, texte });

    if (error) {
      setBrouillon(texte);
      setErreur("Message non envoyé, réessaie.");
      return;
    }

    // Un club privé ne publie pas dans le fil global (activity_feed est
    // visible par toutes les utilisatrices connectées, pas seulement les
    // membres du club).
    if (!club.prive) {
      await supabase.from("activity_feed").insert({
        user_id: profilId,
        type: "message",
        contenu: { clubId: club.id, code: club.code, nom: club.nom, texte },
      });
    }
  }

  async function inviter() {
    const p = normaliserPseudo(pseudoInvite);
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

    const { error } = await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: cible.id, statut: "invite", role: "membre" });

    setEnCours(false);

    if (error) {
      setErreur(error.code === "23505" ? "Déjà invitée ou déjà membre." : "Impossible d'inviter cette personne.");
      return;
    }

    setMembres((m) => [...m, { clubId: club.id, userId: cible.id, pseudo: cible.pseudo, role: "membre", statut: "invite" }]);
    setPseudoInvite("");
  }

  async function inviterPseudo(p: string) {
    setPseudoInvite(p);
    // laisse le prochain rendu prendre la valeur avant d'inviter
    setTimeout(() => inviter(), 0);
  }

  async function rejoindre() {
    if (enCours) return;
    setEnCours(true);
    const { error } = await supabase
      .from("club_members")
      .insert({ club_id: club.id, user_id: profilId, statut: "accepte", role: "membre" });
    setEnCours(false);
    if (error) {
      setErreur("Impossible de rejoindre ce club, réessaie.");
      return;
    }
    onMembreMisAJour({ clubId: club.id, userId: profilId, pseudo, role: "membre", statut: "accepte" });
  }

  async function accepterInvitation() {
    if (enCours) return;
    setEnCours(true);
    const { error } = await supabase
      .from("club_members")
      .update({ statut: "accepte" })
      .eq("club_id", club.id)
      .eq("user_id", profilId);
    setEnCours(false);
    if (error) return;
    onMembreMisAJour({ clubId: club.id, userId: profilId, pseudo, role: monMembre?.role ?? "membre", statut: "accepte" });
  }

  async function changerRole(userId: string, role: RoleMembre) {
    setMembres((m) => m.map((mb) => (mb.userId === userId ? { ...mb, role } : mb)));
    const { error } = await supabase
      .from("club_members")
      .update({ role })
      .eq("club_id", club.id)
      .eq("user_id", userId);
    if (error) setErreur("Impossible de modifier ce rôle.");
  }

  async function retirerMembre(userId: string) {
    const avant = membres;
    setMembres((m) => m.filter((mb) => mb.userId !== userId));
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("club_id", club.id)
      .eq("user_id", userId);
    if (error) {
      setMembres(avant);
      setErreur("Impossible de retirer cette personne.");
    }
  }

  const membresAcceptes = membres.filter((m) => m.statut === "accepte");
  const membresInvites = membres.filter((m) => m.statut === "invite");
  const amisAAjouter = suggestions.filter((s) => !membres.some((m) => m.userId === s.id));

  return (
    <div className="plot-salon">
      <button className="plot-salon-head" onClick={onToggle}>
        <span className="plot-code">{club.code}</span>
        <span className="plot-salon-info">
          <span className="plot-salon-genre">
            {club.nom} {club.prive && <span className="plot-salon-prive">· privé</span>}
          </span>
          <span className="plot-lecture-en-cours">
            {club.livreActuel ? `en lecture : ${club.livreActuel}` : "aucune lecture en cours"}
          </span>
        </span>
        {estMembre && (
          <span className="plot-salon-membres">
            {membresAcceptes.slice(0, 5).map((m) => (
              <Avatar key={m.userId} pseudo={m.pseudo} size={26} />
            ))}
          </span>
        )}
        <span className={ouvert ? "plot-chevron open" : "plot-chevron"}>&#8250;</span>
      </button>

      {ouvert && peutRejoindre && (
        <div className="plot-salon-rejoindre">
          <p className="plot-par">Club public — tu peux le rejoindre directement.</p>
          {erreur && <p className="plot-panneau-erreur">{erreur}</p>}
          <button className="plot-btn-mini" onClick={rejoindre} disabled={enCours}>
            {enCours ? "..." : "Rejoindre"}
          </button>
        </div>
      )}

      {ouvert && estInvitee && (
        <div className="plot-salon-rejoindre">
          <p className="plot-par">Tu as été invitée à rejoindre ce club.</p>
          <button className="plot-btn-mini" onClick={accepterInvitation} disabled={enCours}>
            {enCours ? "..." : "Accepter l'invitation"}
          </button>
        </div>
      )}

      {ouvert && estMembre && (
        <div className="plot-salon-body">
          {messages.map((m) => (
            <p key={m.id} className="plot-msg">
              <span className="plot-msg-qui">{m.pseudo}</span> — {m.texte}
            </p>
          ))}
          {charge && messages.length === 0 && <p className="plot-par">Aucun message pour l&apos;instant.</p>}

          {peutPublier ? (
            <div className="plot-msg-form">
              <input
                className="plot-input"
                placeholder="Écrire un mot au salon..."
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && envoyer()}
              />
              <button className="plot-btn" onClick={envoyer}>
                Envoyer
              </button>
            </div>
          ) : (
            <p className="plot-par">Tu es en lecture seule dans ce club.</p>
          )}

          <div className="plot-membres-gestion">
            <p className="plot-membres-titre">Membres</p>
            <div className="plot-membres-liste">
              {membresAcceptes.map((m) => (
                <span key={m.userId} className="plot-chip">
                  <Avatar pseudo={m.pseudo} size={20} /> {m.pseudo}
                  {m.role !== "membre" && <span className="plot-role-tag">{LIBELLE_ROLE[m.role]}</span>}
                </span>
              ))}
              {membresInvites.map((m) => (
                <span key={m.userId} className="plot-chip plot-chip-invite">
                  <Avatar pseudo={m.pseudo} size={20} /> {m.pseudo} (invitée)
                </span>
              ))}
            </div>

            {erreur && <p className="plot-panneau-erreur">{erreur}</p>}

            {estAdmin && (
              <>
                {amisAAjouter.length > 0 && (
                  <div className="plot-membres-suggestions">
                    {amisAAjouter.map((a) => (
                      <button key={a.id} className="plot-chip plot-chip-ajout" onClick={() => inviterPseudo(a.pseudo)}>
                        + {a.pseudo}
                      </button>
                    ))}
                  </div>
                )}

                <div className="plot-msg-form">
                  <input
                    className="plot-input"
                    placeholder="Inviter par pseudo..."
                    value={pseudoInvite}
                    onChange={(e) => setPseudoInvite(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && inviter()}
                  />
                  <button className="plot-btn-mini" onClick={inviter} disabled={enCours}>
                    Inviter
                  </button>
                </div>

                {membresAcceptes.filter((m) => m.userId !== profilId).length > 0 && (
                  <div className="plot-gestion-membres">
                    <p className="plot-membres-titre plot-membres-titre-espace">Gérer les rôles</p>
                    {membresAcceptes
                      .filter((m) => m.userId !== profilId)
                      .map((m) => (
                        <div key={m.userId} className="plot-gestion-ligne">
                          <span className="plot-gestion-nom">
                            <Avatar pseudo={m.pseudo} size={18} /> {m.pseudo}
                          </span>
                          <select
                            className="plot-role-select"
                            value={m.role}
                            onChange={(e) => changerRole(m.userId, e.target.value as RoleMembre)}
                          >
                            <option value="administrateur">Administratrice</option>
                            <option value="membre">Membre</option>
                            <option value="observateur">Observatrice</option>
                          </select>
                          <button
                            className="plot-chip-retirer"
                            onClick={() => retirerMembre(m.userId)}
                            aria-label={`Retirer ${m.pseudo}`}
                          >
                            Retirer
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
