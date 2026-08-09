import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil, error } = await supabase
    .from("profiles")
    .select("id, pseudo, bio")
    .eq("id", user.id)
    .single();

  if (error || !profil) {
    // Le trigger `on_auth_user_created` crée le profil à l'inscription ; s'il
    // manque encore (course très rare juste après l'inscription), on
    // renvoie vers la connexion plutôt que d'afficher une page cassée.
    redirect("/login?erreur=profil-manquant");
  }

  return <AppShell profil={profil} />;
}
