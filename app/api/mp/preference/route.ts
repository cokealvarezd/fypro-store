import { NextRequest, NextResponse } from 'next/server'

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
  const mpToken = process.env.MP_ACCESS_TOKEN
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3001'

  if (!apiKey || !mpToken) {
    return NextResponse.json({ error: 'Config incompleta: falta MP_ACCESS_TOKEN' }, { status: 500 })
  }

  let body: {
    items: { productoId: string; nombre: string; marca: string; cantidad: number; precioUnitario: number }[]
    contacto: { nombre: string; email: string; telefono: string }
    despacho: { tipo: string; tienda: string; direccion: string; comuna: string; region: string }
    subtotal: number
    total: number
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { items, contacto, despacho, subtotal, total } = body
  if (!items?.length || !contacto?.nombre || !contacto?.email || !contacto?.telefono) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  const ordenId = generarId()

  // 1. Guardar orden en Firestore (estado inicial: pendiente)
  const orden = { id: ordenId, items, contacto, despacho, subtotal, total, estado: 'pendiente', creadoEn: Date.now() }
  const fields: Record<string, FSValue> = {}
  for (const [k, v] of Object.entries(orden)) fields[k] = toFS(v)

  const fsRes = await fetch(`${BASE}/ordenes?documentId=${ordenId}&key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  })
  if (!fsRes.ok) {
    const err = await fsRes.json()
    return NextResponse.json({ error: 'Error al guardar orden', detail: err }, { status: 500 })
  }

  // 2. Crear preferencia en Mercado Pago
  const preference = {
    items: items.map(i => ({
      id: i.productoId,
      title: `${i.marca} ${i.nombre}`,
      quantity: i.cantidad,
      unit_price: i.precioUnitario,
      currency_id: 'CLP',
    })),
    payer: { name: contacto.nombre, email: contacto.email },
    back_urls: {
      success: `${baseUrl}/pedido-confirmado?id=${ordenId}`,
      pending: `${baseUrl}/pedido-confirmado?id=${ordenId}&mp_status=pending`,
      failure: `${baseUrl}/checkout?mp_error=1`,
    },
    auto_return: 'approved',
    notification_url: `${baseUrl}/api/mp/webhook`,
    external_reference: ordenId,
    statement_descriptor: 'FYPRO',
  }

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mpToken}` },
    body: JSON.stringify(preference),
  })

  if (!mpRes.ok) {
    const err = await mpRes.json()
    return NextResponse.json({ error: 'Error al crear preferencia MP', detail: err }, { status: 500 })
  }

  const mpData = await mpRes.json()
  const isSandbox = mpToken.startsWith('TEST-')

  return NextResponse.json({
    id: ordenId,
    checkout_url: isSandbox ? mpData.sandbox_init_point : mpData.init_point,
  })
}
