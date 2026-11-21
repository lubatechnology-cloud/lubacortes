export function formatKz(cents: number): string {
  const kz = (cents || 0) / 100;
  const formatted = new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(kz).replace(/\u00a0/g, ".");
  return `${formatted} Kz`;
}
