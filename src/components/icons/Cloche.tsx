export function Cloche({ taille = 20 }: { taille?: number }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 10.5c0-4.2 2.4-7 6-7s6 2.8 6 7c0 4.6 1.3 6.2 2.2 7.1.3.3.1.9-.4.9H4.2c-.5 0-.7-.6-.4-.9.9-.9 2.2-2.5 2.2-7.1z" />
      <path d="M9.5 20.5c.4 1 1.3 1.6 2.5 1.6s2.1-.6 2.5-1.6" />
    </svg>
  );
}
