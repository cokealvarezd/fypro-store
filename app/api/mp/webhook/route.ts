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

const METODO_PAGO: Record<string, string> = {
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  digital_wallet: 'Billetera digital',
  bank_transfer: 'Transferencia bancaria',
  account_money: 'Dinero en cuenta MP',
  ticket: 'Cupón / efectivo',
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

function parseFSDoc(fields: Record<string, FSValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, parseFS(v)]))
}

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

function fechaLegible(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

type EmailItem = { title: string; quantity: number; unit_price: number }

type EmailOpts = {
  ordenId: string
  paymentId: string | number
  fecha: string
  items: EmailItem[]
  total: number
  metodoPago: string
  clienteNombre: string
  clienteEmail: string
  clienteTelefono: string
  despachoTexto: string
}

function filasProductos(items: EmailItem[]) {
  return items.map(i => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${i.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:center">${i.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${clp(i.unit_price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${clp(i.unit_price * i.quantity)}</td>
    </tr>`).join('')
}

function emailAdmin(opts: EmailOpts): string {
  return `<!DOCTYPE html>
<html lang="es"><body style="font-family:sans-serif;color:#111;max-width:620px;margin:0 auto;padding:24px">
  <div style="background:#c00;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">Nueva venta FYPRO 🛒</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:13px">Orden ${opts.ordenId} · Pago #${opts.paymentId}</p>
  </div>

  <div style="border:1px solid #e8e8e8;border-top:none;border-radius:0 0 8px 8px;padding:24px">

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:#f8f8f8">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888">P. Unit.</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filasProductos(opts.items)}</tbody>
    </table>
    <p style="text-align:right;font-size:20px;font-weight:700;margin:0 0 20px">Total: ${clp(opts.total)}</p>

    <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px">

    <table style="width:100%;font-size:14px">
      <tr>
        <td style="padding:4px 0;color:#888;width:140px">Fecha</td>
        <td style="padding:4px 0"><strong>${fechaLegible(opts.fecha)}</strong></td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888">Método de pago</td>
        <td style="padding:4px 0"><strong>${opts.metodoPago}</strong></td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888">Envío</td>
        <td style="padding:4px 0"><strong>${opts.despachoTexto}</strong></td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">

    <p style="font-size:13px;font-weight:600;margin:0 0 8px;color:#444">Datos del cliente</p>
    <table style="width:100%;font-size:14px">
      <tr>
        <td style="padding:4px 0;color:#888;width:140px">Nombre</td>
        <td style="padding:4px 0">${opts.clienteNombre}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888">Email</td>
        <td style="padding:4px 0"><a href="mailto:${opts.clienteEmail}" style="color:#c00">${opts.clienteEmail}</a></td>
      </tr>
      ${opts.clienteTelefono ? `<tr>
        <td style="padding:4px 0;color:#888">Teléfono</td>
        <td style="padding:4px 0"><a href="tel:${opts.clienteTelefono}" style="color:#c00">${opts.clienteTelefono}</a></td>
      </tr>` : ''}
    </table>

  </div>
  <p style="margin-top:16px;color:#aaa;font-size:11px;text-align:center">FYPRO Inventario · Notificación automática</p>
</body></html>`
}

function emailCliente(opts: EmailOpts): string {
  return `<!DOCTYPE html>
<html lang="es"><body style="font-family:sans-serif;color:#111;max-width:620px;margin:0 auto;padding:24px">
  <div style="background:#c00;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
    <h2 style="margin:0;font-size:18px">¡Gracias por tu compra, ${opts.clienteNombre}!</h2>
    <p style="margin:4px 0 0;opacity:.85;font-size:13px">Orden ${opts.ordenId} confirmada</p>
  </div>

  <div style="border:1px solid #e8e8e8;border-top:none;border-radius:0 0 8px 8px;padding:24px">

    <p style="color:#444;margin-top:0">Tu pago fue procesado exitosamente. A continuación el detalle de tu pedido:</p>

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:#f8f8f8">
          <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888">P. Unit.</th>
          <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888">Subtotal</th>
        </tr>
      </thead>
      <tbody>${filasProductos(opts.items)}</tbody>
    </table>
    <p style="text-align:right;font-size:20px;font-weight:700;margin:0 0 20px">Total pagado: ${clp(opts.total)}</p>

    <hr style="border:none;border-top:1px solid #eee;margin:0 0 16px">

    <table style="width:100%;font-size:14px">
      <tr>
        <td style="padding:4px 0;color:#888;width:140px">Fecha</td>
        <td style="padding:4px 0">${fechaLegible(opts.fecha)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888">Método de pago</td>
        <td style="padding:4px 0">${opts.metodoPago}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;color:#888">Envío</td>
        <td style="padding:4px 0"><strong>${opts.despachoTexto}</strong></td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">

    <p style="color:#555;margin:0 0 8px">Nos pondremos en contacto contigo a la brevedad para coordinar la entrega.</p>
    <p style="color:#555;margin:0">¿Tienes dudas? Escríbenos a <a href="mailto:contacto@fypro.cl" style="color:#c00">contacto@fypro.cl</a>.</p>

  </div>
  <p style="margin-top:16px;color:#aaa;font-size:11px;text-align:center">FYPRO — Nutrición y Equipamiento Deportivo</p>
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

  const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  })
  if (!mpRes.ok) return NextResponse.json({ ok: true })

  const payment = await mpRes.json()
  const ordenId: string = payment.external_reference
  const mpStatus: string = payment.status

  if (!ordenId) return NextResponse.json({ ok: true })

  const estado = ESTADO_MAP[mpStatus] ?? 'pendiente'

  // Actualizar orden en Firestore — la respuesta del PATCH devuelve el documento completo
  const updateUrl = `${BASE}/ordenes/${ordenId}?${[
    'updateMask.fieldPaths=estado',
    'updateMask.fieldPaths=mpPagoId',
    'updateMask.fieldPaths=mpStatus',
  ].join('&')}&key=${apiKey}`

  const patchRes = await fetch(updateUrl, {
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

  // Extraer datos de la orden desde la respuesta del PATCH
  type OrdenData = {
    contacto?: { nombre?: string; email?: string; telefono?: string }
    despacho?: { tipo?: string; tienda?: string; direccion?: string; comuna?: string; region?: string }
  }
  let orden: OrdenData = {}
  if (patchRes.ok) {
    try {
      const patchData = await patchRes.json()
      if (patchData.fields) orden = parseFSDoc(patchData.fields) as OrdenData
    } catch {
      // fallback: usar solo datos de MP
    }
  }

  if (estado === 'pagada') {
    const mpItems: Array<{ id: string; title: string; quantity: number; unit_price: number }> =
      payment.additional_info?.items ?? []

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
        items: mpItems.map(item => ({ productoId: item.id, cantidad: item.quantity })),
      }

      await fetch(`${BASE}/movimientos?documentId=${movId}&key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: Object.fromEntries(Object.entries(movimiento).map(([k, v]) => [k, toFS(v)])),
        }),
      })

      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const resend = new Resend(resendKey)

        // Datos de contacto: orden tiene lo completo; MP payer es fallback
        const clienteNombre: string = orden.contacto?.nombre ?? payment.payer?.first_name ?? 'Cliente'
        const clienteEmail: string = orden.contacto?.email ?? payment.payer?.email ?? ''
        const clienteTelefono: string = orden.contacto?.telefono ?? ''
        const total: number = payment.transaction_amount ?? 0
        const tipoPago: string = payment.payment_type_id ?? ''
        const metodoPago = METODO_PAGO[tipoPago] ?? tipoPago

        // Texto de despacho
        const dep = orden.despacho
        let despachoTexto = 'Por coordinar'
        if (dep?.tipo === 'retiro') {
          despachoTexto = `Retiro en tienda ${dep.tienda || 'TINYSHOP'}`
        } else if (dep?.tipo === 'despacho' && dep.direccion) {
          despachoTexto = `Envío a domicilio — ${dep.direccion}, ${dep.comuna}, ${dep.region}`
        }

        const emailOpts: EmailOpts = {
          ordenId,
          paymentId,
          fecha,
          items: mpItems,
          total,
          metodoPago,
          clienteNombre,
          clienteEmail,
          clienteTelefono,
          despachoTexto,
        }

        await Promise.all([
          resend.emails.send({
            from: 'FYPRO <onboarding@resend.dev>',
            to: ['alvarezd.jorge@gmail.com'],
            subject: `Nueva venta #${ordenId} — ${clp(total)}`,
            html: emailAdmin(emailOpts),
          }),
          clienteEmail
            ? resend.emails.send({
                from: 'FYPRO <onboarding@resend.dev>',
                to: [clienteEmail],
                subject: `Confirmación de tu pedido FYPRO #${ordenId}`,
                html: emailCliente(emailOpts),
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
