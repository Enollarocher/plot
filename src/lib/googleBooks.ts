export type ResultatRecherche = {
  cle: string;
  titre: string;
  auteur: string;
  pages: number | null;
  couverture: string | null;
  isbn: string | null;
  resume: string | null;
};

export type PageResultats = {
  resultats: ResultatRecherche[];
  total: number;
};

type VolumeGoogleBooks = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

function versResultat(item: VolumeGoogleBooks): ResultatRecherche {
  const info = item.volumeInfo || {};
  const couvertureBrute =
    info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null;
  const identifiants = info.industryIdentifiers || [];
  const isbn =
    identifiants.find((i) => i.type === "ISBN_13")?.identifier ||
    identifiants.find((i) => i.type === "ISBN_10")?.identifier ||
    null;

  return {
    cle: item.id,
    titre: info.title || "Sans titre",
    auteur: info.authors?.[0] || "Auteur inconnu",
    pages: info.pageCount || null,
    couverture: couvertureBrute
      ? couvertureBrute.replace("http://", "https://")
      : null,
    isbn,
    resume: info.description || null,
  };
}

async function appelerGoogleBooks(
  q: string,
  startIndex: number,
  maxResults: number
): Promise<PageResultats> {
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&startIndex=${startIndex}&maxResults=${maxResults}`
  );
  if (!r.ok) throw new Error("recherche-echouee");

  const data: { items?: VolumeGoogleBooks[]; totalItems?: number } = await r.json();
  return {
    resultats: (data.items || []).map(versResultat),
    total: data.totalItems ?? 0,
  };
}

/** Recherche libre par titre, auteur ou ISBN — quelques résultats mélangés. */
export async function rechercherGoogleBooks(
  requete: string
): Promise<ResultatRecherche[]> {
  const { resultats } = await appelerGoogleBooks(requete, 0, 8);
  return resultats;
}

/**
 * Bibliographie d'une autrice/d'un auteur (filtre `inauthor:`), paginable
 * pour parcourir une liste longue plutôt qu'un mélange de quelques titres.
 */
export async function rechercherParAuteur(
  auteur: string,
  startIndex = 0,
  maxResults = 20
): Promise<PageResultats> {
  return appelerGoogleBooks(`inauthor:"${auteur.trim()}"`, startIndex, maxResults);
}
