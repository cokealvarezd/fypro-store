export function formatPrecio(n: number | null | undefined): string {
  if (!n) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}
