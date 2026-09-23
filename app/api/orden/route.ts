import { NextRequest, NextResponse } from 'next/server'
import type { Orden } from '@/lib/types'

const PROJECT = 'fypro-inventory'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

type FSValue =
  | { stringValue: string }
  | { integerValue: string }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FSValue> } }
  | { arrayValue: { values: FSValue[] } }

function toFS(v: unknown): FSValue {
  if (v === null || v === undefined) return { nullValue: null }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') return { integerValue: String(Math.round(v)) }
  if (typeof v === 'string') return { stringValue: v }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFS) } }
  if (typeof v === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, toFS(val)])
        ),
      },
    }
  }
  return { nullValue: null }
}

function generarId() {
  const ts = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  return `ord_${ts}_${rand}`
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FIREBASE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Config error' }, { status: 500 })

  let body: Omit<Orden, 'id' | 'estado' | 'creadoEn'>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { items, contacto, despacho, subtotal, total } = body
  if (!items?.length || !contacto?.nombre || !contacto?.email || !contacto?.telefono) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const orden: Orden = {
    id: generarId(),
    items,
    contacto,
    despacho,
    subtotal,
    total,
    estado: 'pendiente',
    creadoEn: Date.now(),
  }

  const fields: Record<string, FSValue> = {}
  for (const [k, v] of Object.entries(orden)) {
    fields[k] = toFS(v)
  }

  const url = `${BASE}/ordenes?documentId=${orden.id}&key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })

  if (!res.ok) {
    const err = await res.json()
    return NextResponse.json({ error: 'Error al guardar orden', detail: err }, { status: 500 })
  }

  return NextResponse.json({ id: orden.id })
}
