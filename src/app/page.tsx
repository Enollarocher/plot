import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { versLivreEtagere, type LigneUserBookBrute } from "@/lib/shelf";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profil, error: erreurProfil }, { data: userBooks }] =
    await Promise.all([
      supabase.from("profiles").select("id, pseudo, bio").eq("id", user.id).single(),
      supabase
        .from("user_books")
        .select(
          "id, statut, note, dernier_moment, commence_le, termine_le, livre:books(id, titre, auteur, couverture_url, pages)"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .returns<LigneUserBookBrute[]>(),
    ]);

  if (erreurProfil || !profil) {
    // Le trigger `on_auth_user_created` crée le profil à l'inscription ; s'il
    // manque encore (course très rare juste après l'inscription), on
    // renvoie vers la connexion plutôt que d'afficher une page cassée.
    redirect("/login?erreur=profil-manquant");
  }

  const etagere = (userBooks || [])
    .map(versLivreEtagere)
    .filter((l) => l !== null);

  return <AppShell profil={profil} etagereInitiale={etagere} />;
}
