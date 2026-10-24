const BASE = 'https://firestore.googleapis.com/v1/projects/fypro-inventory/databases/(default)/documents'

const CODIGO_RE = /^[A-Z0-9_-]{4,30}$/

export interface Cupon {
  codigo: string
  porcentaje: number
}

export function normalizarCodigo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const codigo = raw.trim().toUpperCase()
  return CODIGO_RE.test(codigo) ? codigo : null
}

export async function getCupon(raw: unknown): Promise<Cupon | null> {
  const codigo = normalizarCodigo(raw)
  if (!codigo) return null
  try {
    const res = await fetch(`${BASE}/cupones/${codigo}`, { cache: 'no-store' })
    if (!res.ok) return null
    const doc = await res.json()
    const f = doc.fields
    if (!f?.activo?.booleanValue) return null
    const porcentaje = Number(f.porcentaje?.integerValue ?? f.porcentaje?.doubleValue)
    if (!Number.isFinite(porcentaje) || porcentaje < 1 || porcentaje > 99) return null
    return { codigo, porcentaje }
  } catch {
    return null
  }
}

export function aplicarDescuento(
  items: { precioUnitario: number; cantidad: number }[],
  porcentaje: number,
) {
  const unitPrices = items.map(i => Math.round((i.precioUnitario * (100 - porcentaje)) / 100))
  const subtotal = items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const total = items.reduce((s, i, idx) => s + unitPrices[idx] * i.cantidad, 0)
  return { unitPrices, subtotal, total, descuento: subtotal - total }
}
