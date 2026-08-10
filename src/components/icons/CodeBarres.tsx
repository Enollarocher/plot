export function CodeBarres() {
  const largeurs = [2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 1, 3, 1];
  let x = 0;
  return (
    <svg width="60" height="28" viewBox="0 0 60 28" aria-hidden="true">
      {largeurs.map((l, i) => {
        const rect = <rect key={i} x={x} y="2" width={l} height="20" fill="currentColor" />;
        x += l + 1.2;
        return rect;
      })}
    </svg>
  );
}
