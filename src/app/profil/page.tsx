import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function MonProfilRedirect() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("pseudo")
    .eq("id", user.id)
    .single();

  redirect(profil ? `/profil/${profil.pseudo}` : "/");
}
