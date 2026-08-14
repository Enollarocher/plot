export type StatutMembre = "invite" | "accepte";
export type RoleMembre = "administrateur" | "membre" | "observateur";

export const LIBELLE_ROLE: Record<RoleMembre, string> = {
  administrateur: "Administratrice",
  membre: "Membre",
  observateur: "Observatrice",
};

export type Club = {
  id: string;
  nom: string;
  livreActuel: string | null;
  code: string;
  creePar: string;
  prive: boolean;
  createdAt: string;
};

export type MembreClub = {
  clubId: string;
  userId: string;
  pseudo: string;
  role: RoleMembre;
  statut: StatutMembre;
};

export type MessageClub = {
  id: string;
  clubId: string;
  userId: string;
  pseudo: string;
  texte: string;
  createdAt: string;
};

// Formes brutes renvoyées par Supabase.
export type LigneClubBrute = {
  id: string;
  nom: string;
  livre_actuel: string | null;
  code: string;
  cree_par: string;
  prive: boolean;
  created_at: string;
};

export type LigneMembreBrute = {
  club_id: string;
  user_id: string;
  role: RoleMembre;
  statut: StatutMembre;
  profil: { pseudo: string } | null;
};

export type LigneMessageBrute = {
  id: string;
  club_id: string;
  user_id: string;
  texte: string;
  created_at: string;
  profil: { pseudo: string } | null;
};

export function versClub(l: LigneClubBrute): Club {
  return {
    id: l.id,
    nom: l.nom,
    livreActuel: l.livre_actuel,
    code: l.code,
    creePar: l.cree_par,
    prive: l.prive,
    createdAt: l.created_at,
  };
}

export function versMembre(l: LigneMembreBrute): MembreClub {
  return {
    clubId: l.club_id,
    userId: l.user_id,
    pseudo: l.profil?.pseudo ?? "?",
    role: l.role,
    statut: l.statut,
  };
}

export function versMessage(l: LigneMessageBrute): MessageClub {
  return {
    id: l.id,
    clubId: l.club_id,
    userId: l.user_id,
    pseudo: l.profil?.pseudo ?? "?",
    texte: l.texte,
    createdAt: l.created_at,
  };
}

/**
 * Code de classification façon bibliothèque (ex. "813.C"), dérivé du nom du
 * club — reprise exacte de `genererCode` du prototype.
 */
export function genererCode(nom: string): string {
  const n = String(nom)
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const num = 100 + (n % 900);
  const lettre = nom.trim().charAt(0).toUpperCase() || "X";
  return `${num}.${lettre}`;
}
