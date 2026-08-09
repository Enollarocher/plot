import Image from "next/image";

export function PlotMark({
  withTagline = true,
  taille = 200,
}: {
  withTagline?: boolean;
  taille?: number;
}) {
  return (
    <div className="plot-marque">
      <Image
        src="/logo-plot.png"
        alt="Plot"
        width={480}
        height={245}
        priority
        className="plot-mark-img"
        style={{ width: taille, maxWidth: "70%", height: "auto" }}
      />
      {withTagline && <p className="plot-tagline">The plot gets better.</p>}
    </div>
  );
}
