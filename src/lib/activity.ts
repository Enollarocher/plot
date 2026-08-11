export type TypeActivite = "moment" | "termine" | "commence";

export type ContenuCommence = { titre: string; bookId?: string };
export type ContenuMoment = { titre: string; texte: string; bookId?: string };
export type ContenuTermine = { titre: string; note: number; bookId?: string };

export type Commentaire = {
  id: string;
  userId: string;
  pseudo: string;
  texte: string;
  createdAt: string;
};

export type EntreeActivite = {
  id: string;
  type: TypeActivite;
  userId: string;
  pseudo: string;
  createdAt: string;
  contenu: ContenuCommence | ContenuMoment | ContenuTermine;
  nbReactions: number;
  jaiReagi: boolean;
  commentaires: Commentaire[];
};

// Formes brutes renvoyées par Supabase (relations embarquées via `profil:profiles(pseudo)`).
export type LigneActiviteBrute = {
  id: string;
  type: TypeActivite;
  contenu: unknown;
  created_at: string;
  user_id: string;
  profil: { pseudo: string } | null;
};

export type LigneReactionBrute = { activity_id: string; user_id: string };

export type LigneCommentaireBrute = {
  id: string;
  activity_id: string;
  user_id: string;
  texte: string;
  created_at: string;
  profil: { pseudo: string } | null;
};

export function construireEntree(
  ligne: LigneActiviteBrute,
  reactions: LigneReactionBrute[],
  commentaires: LigneCommentaireBrute[],
  moiId: string
): EntreeActivite {
  const mesReactions = reactions.filter((r) => r.activity_id === ligne.id);
  const mesCommentaires = commentaires
    .filter((c) => c.activity_id === ligne.id)
    .map(
      (c): Commentaire => ({
        id: c.id,
        userId: c.user_id,
        pseudo: c.profil?.pseudo ?? "?",
        texte: c.texte,
        createdAt: c.created_at,
      })
    );

  return {
    id: ligne.id,
    type: ligne.type,
    userId: ligne.user_id,
    pseudo: ligne.profil?.pseudo ?? "?",
    createdAt: ligne.created_at,
    contenu: (ligne.contenu ?? {}) as ContenuCommence | ContenuMoment | ContenuTermine,
    nbReactions: mesReactions.length,
    jaiReagi: mesReactions.some((r) => r.user_id === moiId),
    commentaires: mesCommentaires,
  };
}
