import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

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

const METODO_PAGO: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  digital_wallet: 'Billetera digital',
  bank_transfer: 'Transferencia bancaria',
  account_money: 'Dinero en cuenta MP',
  ticket: 'Cupón / efectivo',
}

function emailAdmin(opts: {
  ordenId: string
  paymentId: string | number
  items: Array<{ title: string; quantity: number; unit_price: number }>
  total: number
  metodoPago: string
  clienteNombre: string
  clienteEmail: string
}): string {
  const filas = opts.items.map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">$${(i.unit_price * i.quantity).toLocaleString('es-CL')}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#c00;margin-bottom:4px">Nueva venta FYPRO</h2>
    <p style="color:#666;margin-top:0">Orden <strong>${opts.ordenId}</strong> — Pago <strong>#${opts.paymentId}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <thead>
        <tr style="background:#f8f8f8">
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#888">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#888">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="text-align:right;font-size:18px;font-weight:700">Total: $${opts.total.toLocaleString('es-CL')}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p><strong>Cliente:</strong> ${opts.clienteNombre} — ${opts.clienteEmail}</p>
    <p><strong>Método de pago:</strong> ${opts.metodoPago}</p>
  </body></html>`
}

function emailCliente(opts: {
  ordenId: string
  items: Array<{ title: string; quantity: number; unit_price: number }>
  total: number
  clienteNombre: string
}): string {
  const filas = opts.items.map(i =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">$${(i.unit_price * i.quantity).toLocaleString('es-CL')}</td>
    </tr>`
  ).join('')

  return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#111;max-width:600px;margin:0 auto;padding:24px">
    <h2 style="color:#c00;margin-bottom:4px">¡Gracias por tu compra, ${opts.clienteNombre}!</h2>
    <p style="color:#666;margin-top:0">Tu orden <strong>${opts.ordenId}</strong> ha sido confirmada.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <thead>
        <tr style="background:#f8f8f8">
          <th style="padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#888">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-size:12px;text-transform:uppercase;color:#888">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-size:12px;text-transform:uppercase;color:#888">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
    </table>
    <p style="text-align:right;font-size:18px;font-weight:700">Total pagado: $${opts.total.toLocaleString('es-CL')}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="color:#555">Nos pondremos en contacto contigo a la brevedad para coordinar el despacho.</p>
    <p style="color:#555">Si tienes consultas, escríbenos a <a href="mailto:contacto@fypro.cl">contacto@fypro.cl</a>.</p>
    <p style="margin-top:32px;color:#aaa;font-size:12px">FYPRO — Nutrición y Equipamiento Deportivo</p>
  </body></html>`
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
    const mpItems: Array<{ id: string; title: string; quantity: number; unit_price: number }> = payment.additional_info?.items ?? []

    if (mpItems.length > 0) {
      const movId = `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const fecha = new Date().toISOString().split('T')[0]

      const movimiento = {
        id: movId,
        tipo: 'VENTA',
        ubicacion: 'PRINCIPAL',
        fecha,
        comentario: `Venta online #${ordenId}`,
        montoTotal: payment.transaction_amount ?? 0,
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

      // Enviar emails de notificación
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const resend = new Resend(resendKey)
        const clienteEmail: string = payment.payer?.email ?? ''
        const clienteNombre: string = payment.payer?.first_name ?? 'Cliente'
        const total: number = payment.transaction_amount ?? 0
        const tipoPago: string = payment.payment_type_id ?? ''
        const metodoPago = METODO_PAGO[tipoPago] ?? tipoPago

        const emailOpts = {
          ordenId,
          paymentId,
          items: mpItems,
          total,
          metodoPago,
          clienteNombre,
          clienteEmail,
        }

        await Promise.all([
          resend.emails.send({
            from: 'FYPRO <onboarding@resend.dev>',
            to: ['alvarezd.jorge@gmail.com'],
            subject: `Nueva venta #${ordenId} — $${total.toLocaleString('es-CL')}`,
            html: emailAdmin(emailOpts),
          }),
          clienteEmail
            ? resend.emails.send({
                from: 'FYPRO <onboarding@resend.dev>',
                to: [clienteEmail],
                subject: `Confirmación de tu pedido FYPRO #${ordenId}`,
                html: emailCliente({ ordenId, items: mpItems, total, clienteNombre }),
              })
            : Promise.resolve(),
        ])
      }
    }
  }

  return NextResponse.json({ ok: true })
}

// MP hace GET al webhook para validarlo
export async function GET() {
  return NextResponse.json({ ok: true })
}
