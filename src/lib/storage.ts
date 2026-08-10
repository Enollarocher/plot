import type { SupabaseClient } from "@supabase/supabase-js";

// Alignés sur les limites configurées côté bucket (0003_storage_couvertures.sql).
export const TAILLE_MAX_COUVERTURE = 5 * 1024 * 1024; // 5 Mo
export const TYPES_COUVERTURE_ACCEPTES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export function erreurFichierCouverture(fichier: File): string | null {
  if (!TYPES_COUVERTURE_ACCEPTES.includes(fichier.type)) {
    return "Format non supporté : choisis une image JPEG, PNG, WEBP ou GIF.";
  }
  if (fichier.size > TAILLE_MAX_COUVERTURE) {
    return "Image trop lourde (5 Mo maximum).";
  }
  return null;
}

/**
 * Téléverse une photo de couverture dans le bucket `couvertures`, sous
 * `<user_id>/...` (seul préfixe autorisé par les policies RLS de ce
 * bucket), et renvoie son URL publique.
 */
export async function televerserCouverture(
  supabase: SupabaseClient,
  userId: string,
  fichier: File
): Promise<string> {
  const extension = fichier.name.split(".").pop()?.toLowerCase() || "jpg";
  const chemin = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("couvertures")
    .upload(chemin, fichier, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from("couvertures").getPublicUrl(chemin);

  return publicUrl;
}
