const BULAN_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Format tanggal gaya Indonesia: "19 Okt 2026" (opsional + jam). */
export function formatTanggal(value?: string | null, withTime = false): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";

  const base = `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
  return withTime ? `${base} • ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}
