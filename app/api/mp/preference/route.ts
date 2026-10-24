import { NextRequest, NextResponse } from 'next/server'
import { getProductoFresco } from '@/lib/firestore'
import { getCupon, aplicarDescuento, type Cupon } from '@/lib/cupones'

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
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3001'

  if (!apiKey || !mpToken) {
    return NextResponse.json({ error: 'Config incompleta: falta MP_ACCESS_TOKEN' }, { status: 500 })
  }

  let body: {
    items: { productoId: string; cantidad: number }[]
    contacto: { nombre: string; email: string; telefono: string }
    despacho: { tipo: string; tienda: string; direccion: string; comuna: string; region: string }
    cupon?: string | null
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { contacto, despacho } = body
  if (!body.items?.length || !contacto?.nombre || !contacto?.email || !contacto?.telefono) {
    return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
  }

  // Los precios siempre se leen de Firestore; nunca se confía en los que envía el navegador
  const items: { productoId: string; nombre: string; marca: string; cantidad: number; precioUnitario: number }[] = []
  for (const it of body.items) {
    if (!Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > 100) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }
    const prod = await getProductoFresco(String(it.productoId))
    const precio = prod?.precioVentaIVA ?? prod?.precioVenta ?? 0
    if (!prod || !prod.activo || !prod.publicado || precio <= 0) {
      return NextResponse.json({ error: 'Un producto del carrito ya no está disponible' }, { status: 400 })
    }
    items.push({ productoId: prod.id, nombre: prod.nombre, marca: prod.marca, cantidad: it.cantidad, precioUnitario: precio })
  }

  let cupon: Cupon | null = null
  if (body.cupon) {
    cupon = await getCupon(body.cupon)
    if (!cupon) return NextResponse.json({ error: 'Código de descuento no válido' }, { status: 400 })
  }

  const { unitPrices, subtotal, total, descuento } = aplicarDescuento(items, cupon?.porcentaje ?? 0)

  const ordenId = generarId()

  // 1. Guardar orden en Firestore (estado inicial: pendiente)
  const orden = { id: ordenId, items, contacto, despacho, subtotal, descuento, cupon, total, estado: 'pendiente', creadoEn: Date.now() }
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
  const isPublicUrl = baseUrl.startsWith('https://')

  const preference = {
    items: items.map((i, idx) => ({
      id: i.productoId,
      title: `${i.marca} ${i.nombre}`,
      quantity: i.cantidad,
      unit_price: unitPrices[idx],
      currency_id: 'CLP',
    })),
    additional_info: {
      items: items.map(i => ({
        id: i.productoId,
        title: `${i.marca} ${i.nombre}`,
        quantity: i.cantidad,
        unit_price: i.precioUnitario,
      })),
    },
    payer: { name: contacto.nombre, email: contacto.email },
    back_urls: {
      success: `${baseUrl}/pedido-confirmado?id=${ordenId}`,
      pending: `${baseUrl}/pedido-confirmado?id=${ordenId}&mp_status=pending`,
      failure: `${baseUrl}/checkout?mp_error=1`,
    },
    auto_return: 'approved',
    ...(isPublicUrl && { notification_url: `${baseUrl}/api/mp/webhook` }),
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
    console.error('[mp/preference] MP error:', JSON.stringify(err))
    const mpMsg = err?.message ?? err?.error ?? JSON.stringify(err)
    return NextResponse.json({ error: `Error MP: ${mpMsg}`, detail: err }, { status: 500 })
  }

  const mpData = await mpRes.json()
  const isSandbox = mpToken.startsWith('TEST-')

  return NextResponse.json({
    id: ordenId,
    checkout_url: isSandbox ? mpData.sandbox_init_point : mpData.init_point,
  })
}
