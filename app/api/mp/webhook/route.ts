import { NextRequest, NextResponse } from 'next/server'

const PROJECT = 'fypro-inventory'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const ESTADO_MAP: Record<string, string> = {
  approved: 'pagada',
  rejected: 'rechazada',
  cancelled: 'rechazada',
  refunded: 'rechazada',
  pending: 'pendiente',
  in_process: 'pendiente',
}

type FSValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FSValue> } }
  | { arrayValue: { values?: FSValue[] } }

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

function parseFS(v: FSValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return parseInt(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return Object.fromEntries(
    Object.entries(v.mapValue.fields).map(([k, val]) => [k, parseFS(val)])
  )
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(parseFS)
  return null
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.FIREBASE_API_KEY
  const mpToken = process.env.MP_ACCESS_TOKEN
  if (!apiKey || !mpToken) return NextResponse.json({ ok: true })

  let body: { type?: string; data?: { id?: string | number } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  if (body.type !== 'payment' || !body.data?.id) return NextResponse.json({ ok: true })

  const paymentId = body.data.id

  // Obtener detalles del pago desde MP
  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  })
  if (!mpRes.ok) return NextResponse.json({ ok: true })

  const payment = await mpRes.json()
  const ordenId: string = payment.external_reference
  const mpStatus: string = payment.status

  if (!ordenId) return NextResponse.json({ ok: true })

  const estado = ESTADO_MAP[mpStatus] ?? 'pendiente'

  // Actualizar orden en Firestore
  const updateUrl = `${BASE}/ordenes/${ordenId}?${[
    'updateMask.fieldPaths=estado',
    'updateMask.fieldPaths=mpPagoId',
    'updateMask.fieldPaths=mpStatus',
  ].join('&')}&key=${apiKey}`

  await fetch(updateUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        estado: { stringValue: estado },
        mpPagoId: { stringValue: String(paymentId) },
        mpStatus: { stringValue: mpStatus },
      },
    }),
  })

  // Generar movimiento VENTA al confirmarse el pago
  // Los items vienen directamente del pago MP (additional_info.items), evitando leer Firestore
  if (estado === 'pagada') {
    const mpItems: Array<{ id: string; quantity: number }> = payment.additional_info?.items ?? []

    if (mpItems.length > 0) {
      const movId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const fecha = new Date().toISOString().split('T')[0]

      const movimiento = {
        id: movId,
        tipo: 'VENTA',
        ubicacion: 'PRINCIPAL',
        fecha,
        comentario: `Venta online #${ordenId}`,
        items: mpItems.map(item => ({
          productoId: item.id,
          cantidad: item.quantity,
        })),
      }

      await fetch(`${BASE}/movimientos?documentId=${movId}&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: Object.fromEntries(
            Object.entries(movimiento).map(([k, v]) => [k, toFS(v)])
          ),
        }),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

// MP hace GET al webhook para validarlo
export async function GET() {
  return NextResponse.json({ ok: true })
}
