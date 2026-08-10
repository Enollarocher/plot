export function Etoile({
  pleine,
  taille = 14,
}: {
  pleine: boolean;
  taille?: number;
}) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      style={{ color: pleine ? "var(--plot-accent)" : "var(--plot-line)" }}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9L5.7 21l1.7-7L2 9.2l7.1-.6L12 2z" />
    </svg>
  );
}
