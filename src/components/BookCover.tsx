import { couleurCouverture } from "@/lib/shelf";

export function BookCover({
  couverture,
  graine,
  taille = "normale",
}: {
  couverture: string | null;
  graine: string;
  taille?: "normale" | "grande";
}) {
  const classe = taille === "grande" ? "plot-cover plot-cover-grande" : "plot-cover";
  if (couverture) {
    // eslint-disable-next-line @next/next/no-img-element -- couvertures externes (Google Books), domaines variables
    return <img className={classe} src={couverture} alt="" />;
  }
  return (
    <span
      className={
        taille === "grande" ? "plot-cover-swatch plot-cover-swatch-grande" : "plot-cover-swatch"
      }
      style={{ background: couleurCouverture(graine) }}
    />
  );
}
