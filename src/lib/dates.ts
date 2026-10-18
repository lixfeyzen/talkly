// Tanggal kalender LOKAL pengguna (YYYY-MM-DD), digeser `days` hari.
// Jangan pakai toISOString(): itu UTC, dan bagi zona waktu di depan UTC
// (mis. WIB antara 00.00-07.00) hasilnya masih tanggal kemarin.
export function localIsoDate(days = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
