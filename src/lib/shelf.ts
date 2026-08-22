export type Statut = "envie" | "en_cours" | "lu" | "abandonne";

export const LIBELLE_STATUT: Record<Statut, string> = {
  envie: "Envie de lire",
  en_cours: "En cours",
  lu: "Lu",
  abandonne: "Abandonné",
};

export type Livre = {
  id: string;
  titre: string;
  auteur: string;
  couverture: string | null;
  pages: number | null;
};

export type DonneesAjoutManuel = {
  titre: string;
  auteur: string;
  pages: number | null;
  resume: string;
  isbn: string | null;
  couverture: File | null;
};

export type LivreEtagere = {
  id: string; // id de la ligne user_books
  statut: Statut;
  note: number | null;
  dernierMoment: string | null;
  commenceLe: string | null;
  termineLe: string | null;
  livre: Livre;
};

const TEINTES_COUVERTURE = ["#E8823F", "#DF7E55", "#6FA8B0", "#C9AEDB", "#D9C48A"];

export function couleurCouverture(graine: string) {
  const n = graine.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TEINTES_COUVERTURE[n % TEINTES_COUVERTURE.length];
}

// Forme brute renvoyée par une requête Supabase sur user_books avec le
// livre associé embarqué (`livre:books(...)`).
export type LigneUserBookBrute = {
  id: string;
  statut: Statut;
  note: number | null;
  dernier_moment: string | null;
  commence_le: string | null;
  termine_le: string | null;
  livre: {
    id: string;
    titre: string;
    auteur: string;
    couverture_url: string | null;
    pages: number | null;
  } | null;
};

export function versLivreEtagere(ligne: LigneUserBookBrute): LivreEtagere | null {
  if (!ligne.livre) return null;
  return {
    id: ligne.id,
    statut: ligne.statut,
    note: ligne.note,
    dernierMoment: ligne.dernier_moment,
    commenceLe: ligne.commence_le,
    termineLe: ligne.termine_le,
    livre: {
      id: ligne.livre.id,
      titre: ligne.livre.titre,
      auteur: ligne.livre.auteur,
      couverture: ligne.livre.couverture_url,
      pages: ligne.livre.pages,
    },
  };
}
