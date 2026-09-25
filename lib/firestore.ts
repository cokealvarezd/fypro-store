import type { Producto } from './types'

const PROJECT = 'fypro-inventory'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

type FSPrimitive =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }

type FSValue = FSPrimitive | { mapValue: { fields: Record<string, FSValue> } } | { arrayValue: { values?: FSValue[] } }

function parseValue(v: FSValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return parseInt(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return parseFields(v.mapValue.fields)
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(parseValue)
  return null
}

function parseFields(fields: Record<string, FSValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, parseValue(v)]))
}

export async function getProductos(): Promise<Producto[]> {
  try {
    const res = await fetch(`${BASE}/productos?pageSize=300`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!data.documents) return []
    return (data.documents as { fields: Record<string, FSValue> }[])
      .map(doc => parseFields(doc.fields) as unknown as Producto)
      .filter(p => p.activo && p.publicado)
  } catch {
    return []
  }
}

export async function getProducto(id: string): Promise<Producto | null> {
  try {
    const res = await fetch(`${BASE}/productos/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const doc = await res.json()
    if (!doc.fields) return null
    return parseFields(doc.fields) as unknown as Producto
  } catch {
    return null
  }
}

// Calcula stock de PRINCIPAL leyendo movimientos (igual que inventory.html)
export async function getStockMap(): Promise<Record<string, number>> {
  const apiKey = process.env.FIREBASE_API_KEY
  if (!apiKey) return {}
  try {
    const res = await fetch(`${BASE}/movimientos?pageSize=500&key=${apiKey}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return {}
    const data = await res.json()
    if (!data.documents) return {}

    const stock: Record<string, number> = {}
    for (const doc of data.documents as { fields: Record<string, FSValue> }[]) {
      const tipo = parseValue(doc.fields.tipo) as string
      const ubicacion = parseValue(doc.fields.ubicacion) as string
      if (ubicacion !== 'PRINCIPAL') continue
      if (tipo !== 'COMPRA' && tipo !== 'VENTA') continue
      const items = parseValue(doc.fields.items) as Array<{ productoId: string; cantidad: number }> | null
      if (!items) continue
      for (const item of items) {
        if (!stock[item.productoId]) stock[item.productoId] = 0
        stock[item.productoId] += tipo === 'COMPRA' ? item.cantidad : -item.cantidad
      }
    }
    return stock
  } catch {
    return {}
  }
}
