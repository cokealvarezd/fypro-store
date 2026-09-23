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
  // Requiere regla Firestore: allow update: if request.auth != null || request.resource.data.diff(resource.data).affectedKeys().hasOnly(['estado','mpPagoId','mpStatus'])
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

  return NextResponse.json({ ok: true })
}

// MP hace GET al webhook para validarlo
export async function GET() {
  return NextResponse.json({ ok: true })
}
