import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnTeteSimple } from "@/components/EnTeteSimple";
import { MonProfilVue } from "@/components/MonProfilVue";
import { ProfilLectureSeule } from "@/components/ProfilLectureSeule";

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ pseudo: string }>;
}) {
  const { pseudo } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, pseudo, bio")
    .eq("pseudo", pseudo)
    .single();

  if (!profil) notFound();

  const estMoi = profil.id === user.id;

  const [{ data: suiviLigne }, { data: userBooks }, nbAbonnementsRes, nbAbonnesRes] =
    await Promise.all([
      estMoi
        ? Promise.resolve({ data: null })
        : supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", user.id)
            .eq("suivi_id", profil.id)
            .maybeSingle(),
      supabase.from("user_books").select("statut").eq("user_id", profil.id),
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("follower_id", profil.id),
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("suivi_id", profil.id),
    ]);

  const estSuivi = estMoi || !!suiviLigne;

  const stats = { envie: 0, en_cours: 0, lu: 0, abandonne: 0 };
  for (const b of userBooks || []) {
    if (b.statut in stats) stats[b.statut as keyof typeof stats]++;
  }

  return (
    <div>
      <EnTeteSimple />
      <div className="plot-shell">
        {estMoi ? (
          <MonProfilVue
            profilInitial={profil}
            stats={stats}
            nbAbonnementsInitial={nbAbonnementsRes.count ?? 0}
            nbAbonnesInitial={nbAbonnesRes.count ?? 0}
          />
        ) : (
          <ProfilLectureSeule
            moiId={user.id}
            profil={profil}
            estSuiviInitial={estSuivi}
            stats={estSuivi ? stats : null}
            nbAbonnements={nbAbonnementsRes.count ?? 0}
            nbAbonnes={nbAbonnesRes.count ?? 0}
          />
        )}
      </div>
    </div>
  );
}
