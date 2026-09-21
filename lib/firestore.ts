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
