import { BookCover } from "@/components/BookCover";
import type { LivreEtagere } from "@/lib/shelf";

function Points({ note, max = 5 }: { note: number; max?: number }) {
  return (
    <span className="plot-dots" aria-label={`${note} sur ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={i < note ? "plot-dot on" : "plot-dot"} />
      ))}
    </span>
  );
}

export function BookCard({
  item,
  onCommencer,
}: {
  item: LivreEtagere;
  onCommencer?: (id: string) => void;
}) {
  const { livre } = item;

  return (
    <div className="plot-card">
      {item.statut === "lu" && item.note && (
        <div className="plot-stamp">
          <Points note={item.note} />
        </div>
      )}
      <div className="plot-card-corps">
        <BookCover couverture={livre.couverture} graine={livre.id} />
        <div className="plot-card-texte">
          <p className="plot-titre">{livre.titre}</p>
          <p className="plot-auteur">
            {livre.auteur}
            {livre.pages ? ` · ${livre.pages} p.` : ""}
          </p>
          {item.statut === "lu" ? (
            item.dernierMoment && (
              <p className="plot-note">&laquo; {item.dernierMoment} &raquo;</p>
            )
          ) : (
            <div className="plot-envie-footer">
              <span className="plot-par">Ajouté par toi</span>
              {onCommencer && (
                <button className="plot-btn-mini" onClick={() => onCommencer(item.id)}>
                  Commencer la lecture
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
