export const PSEUDO_REGEX = /^[a-z0-9_.-]{3,24}$/;

export function normaliserPseudo(valeur: string) {
  return valeur.trim().toLowerCase();
}

export function pseudoValide(valeur: string) {
  return PSEUDO_REGEX.test(normaliserPseudo(valeur));
}

export const PSEUDO_AIDE =
  "3 à 24 caractères : lettres minuscules, chiffres, points, tirets.";
