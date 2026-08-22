import Link from "next/link";
import { PlotMark } from "@/components/PlotMark";

export function EnTeteSimple({ retourHref = "/" }: { retourHref?: string }) {
  return (
    <header className="plot-entete-simple">
      <div className="plot-entete-simple-inner">
        <Link href={retourHref} className="plot-retour">
          &larr; Retour
        </Link>
        <PlotMark taille={140} withTagline={false} />
      </div>
    </header>
  );
}
