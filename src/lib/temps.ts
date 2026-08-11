export function relatif(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(diff / 3600000);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(diff / 86400000);
  return `il y a ${j} j`;
}
