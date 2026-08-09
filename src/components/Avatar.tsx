const TEINTES = ["#E8823F", "#DF7E55", "#6FA8B0", "#C9AEDB", "#D9C48A"];

function couleurAvatar(graine: string) {
  const n = graine
    .split("")
    .reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TEINTES[n % TEINTES.length];
}

export function Avatar({
  pseudo,
  size = 34,
}: {
  pseudo: string;
  size?: number;
}) {
  const lettre = pseudo ? pseudo.charAt(0).toUpperCase() : "?";
  return (
    <span
      className="plot-avatar"
      style={{
        background: couleurAvatar(pseudo || "?"),
        width: size,
        height: size,
        fontSize: size * 0.42,
      }}
      title={pseudo}
    >
      {lettre}
    </span>
  );
}
