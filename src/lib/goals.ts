export type ObjectifLecture = {
  id: string;
  cible: number;
  periodeDebut: string; // date ISO (YYYY-MM-DD)
  periodeFin: string;
  createdAt: string;
};

export type LigneObjectifBrute = {
  id: string;
  cible: number;
  periode_debut: string;
  periode_fin: string;
  created_at: string;
};

export function versObjectif(l: LigneObjectifBrute): ObjectifLecture {
  return {
    id: l.id,
    cible: l.cible,
    periodeDebut: l.periode_debut,
    periodeFin: l.periode_fin,
    createdAt: l.created_at,
  };
}

/** Nombre de dates (ISO) tombant entre periodeDebut et periodeFin (inclus). */
export function compterDansPeriode(
  dates: (string | null)[],
  objectif: ObjectifLecture
): number {
  const debut = new Date(objectif.periodeDebut + "T00:00:00").getTime();
  const fin = new Date(objectif.periodeFin + "T23:59:59").getTime();
  return dates.filter((d) => {
    if (!d) return false;
    const t = new Date(d).getTime();
    return t >= debut && t <= fin;
  }).length;
}
