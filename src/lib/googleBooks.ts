export type ResultatRecherche = {
  cle: string;
  titre: string;
  auteur: string;
  pages: number | null;
  couverture: string | null;
  isbn: string | null;
};

type VolumeGoogleBooks = {
  id: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
};

export async function rechercherGoogleBooks(
  requete: string
): Promise<ResultatRecherche[]> {
  const r = await fetch(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(requete)}&maxResults=8`
  );
  if (!r.ok) throw new Error("recherche-echouee");

  const data: { items?: VolumeGoogleBooks[] } = await r.json();
  const items = data.items || [];

  return items.map((item) => {
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
    };
  });
}
