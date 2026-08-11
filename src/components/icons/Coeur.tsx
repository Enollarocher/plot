export function Coeur({ actif }: { actif: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill={actif ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M12 21s-7.5-4.6-10-9.3C0.2 8.1 2 4.5 5.8 4c2-.3 3.7.7 4.7 2.3C11.5 4.7 13.2 3.7 15.2 4c3.8.5 5.6 4.1 3.8 7.7C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}
