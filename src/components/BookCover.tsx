import { couleurCouverture } from "@/lib/shelf";

export function BookCover({
  couverture,
  graine,
}: {
  couverture: string | null;
  graine: string;
}) {
  if (couverture) {
    // eslint-disable-next-line @next/next/no-img-element -- couvertures externes (Google Books), domaines variables
    return <img className="plot-cover" src={couverture} alt="" />;
  }
  return (
    <span
      className="plot-cover-swatch"
      style={{ background: couleurCouverture(graine) }}
    />
  );
}
