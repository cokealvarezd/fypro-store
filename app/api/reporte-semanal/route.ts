import { NextRequest, NextResponse } from 'next/server'

const PROJECT = 'fypro-inventory'
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

type FSValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FSValue> } }
  | { arrayValue: { values?: FSValue[] } }

function parseValue(v: FSValue): unknown {
  if ('stringValue' in v) return v.stringValue
  if ('integerValue' in v) return parseInt(v.integerValue)
  if ('doubleValue' in v) return v.doubleValue
  if ('booleanValue' in v) return v.booleanValue
  if ('nullValue' in v) return null
  if ('mapValue' in v) return Object.fromEntries(
    Object.entries(v.mapValue.fields).map(([k, val]) => [k, parseValue(val)])
  )
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(parseValue)
  return null
}

type Movimiento = {
  tipo: string
  ubicacion: string
  fecha: string
  montoTotal?: number
  items: Array<{ productoId: string; cantidad: number; costo?: number }>
}

type Producto = {
  id: string
  marca: string
  nombre: string
  precioCosto?: number
  activo?: boolean
}

async function fetchAll<T>(coleccion: string, apiKey: string): Promise<T[]> {
  const docs: T[] = []
  let pageToken: string | undefined

  while (true) {
    const url = `${BASE}/${coleccion}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}&key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) break
    const data = await res.json()
    for (const doc of data.documents ?? []) {
      docs.push(Object.fromEntries(
        Object.entries(doc.fields as Record<string, FSValue>).map(([k, v]) => [k, parseValue(v)])
      ) as T)
    }
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }
  return docs
}

function clp(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`
}

export async function GET(req: NextRequest) {
  // Verificar cron secret (Vercel lo envía automáticamente)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const apiKey = process.env.FIREBASE_API_KEY
  const phone = process.env.CALLMEBOT_PHONE
  const callmebotKey = process.env.CALLMEBOT_APIKEY

  if (!apiKey || !phone || !callmebotKey) {
    return NextResponse.json({ error: 'Faltan variables de entorno' }, { status: 500 })
  }

  const [productos, movimientos] = await Promise.all([
    fetchAll<Producto>('productos', apiKey),
    fetchAll<Movimiento>('movimientos', apiKey),
  ])

  const prodMap = Object.fromEntries(
    productos.filter(p => p.activo !== false).map(p => [p.id, p])
  )

  const hoy = new Date()
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 7)
  const hace30 = new Date(hoy); hace30.setDate(hace30.getDate() - 30)
  const toISO = (d: Date) => d.toISOString().split('T')[0]

  const ventasSemana = movimientos.filter(m =>
    m.tipo === 'VENTA' && m.fecha >= toISO(hace7)
  )
  const comprasSemana = movimientos.filter(m =>
    m.tipo === 'COMPRA' && m.fecha >= toISO(hace7)
  )

  const ingresos = ventasSemana.reduce((s, m) => s + (m.montoTotal ?? 0), 0)
  const inversionCompras = comprasSemana.reduce((s, m) => s + (m.montoTotal ?? 0), 0)

  // Costo estimado de ventas usando precioCosto del producto
  const costoVentas = ventasSemana.reduce((s, m) =>
    s + m.items.reduce((si, it) => {
      const costo = it.costo ?? prodMap[it.productoId]?.precioCosto ?? 0
      return si + costo * it.cantidad
    }, 0)
  , 0)
  const ganancia = ingresos - costoVentas

  // Stock actual en PRINCIPAL
  const stock: Record<string, number> = {}
  for (const m of movimientos) {
    if (m.ubicacion !== 'PRINCIPAL') continue
    for (const it of m.items) {
      if (!stock[it.productoId]) stock[it.productoId] = 0
      stock[it.productoId] += m.tipo === 'COMPRA' ? it.cantidad : -it.cantidad
    }
  }

  // Velocidad de ventas últimos 30 días
  const vtasMes: Record<string, number> = {}
  for (const m of movimientos) {
    if (m.tipo !== 'VENTA' || m.fecha < toISO(hace30)) continue
    for (const it of m.items) {
      vtasMes[it.productoId] = (vtasMes[it.productoId] ?? 0) + it.cantidad
    }
  }

  // Alertas: productos con stock bajo vs velocidad de venta
  const alertas: Array<{ nombre: string; stock: number; dias: number }> = []
  for (const [pid, s] of Object.entries(stock)) {
    if (!prodMap[pid]) continue
    const promSem = (vtasMes[pid] ?? 0) / 4
    if (promSem > 0 && s < promSem * 1.5) {
      const dias = Math.round(s / (promSem / 7))
      const nombre = `${prodMap[pid].marca} ${prodMap[pid].nombre}`.trim()
      alertas.push({ nombre, stock: s, dias })
    }
  }
  alertas.sort((a, b) => a.dias - b.dias)

  const semStr = `${toISO(hace7).split('-').reverse().slice(0, 2).join('/')} - ${toISO(hoy).split('-').reverse().slice(0, 2).join('/')}`

  let msg = `📊 *Reporte Semanal FYPRO*\n${semStr}\n\n`
  msg += `💰 Ingresos: ${clp(ingresos)}\n`
  msg += `📈 Ganancia est.: ${clp(ganancia)}\n`
  msg += `🛒 Ventas: ${ventasSemana.length} movimiento(s)\n`
  msg += `📦 Inversión compras: ${clp(inversionCompras)}`

  if (alertas.length > 0) {
    msg += '\n\n⚠️ *Alerta Stock PRINCIPAL*'
    for (const a of alertas.slice(0, 5)) {
      const emoji = a.dias <= 7 ? '🔴' : '🟡'
      msg += `\n${emoji} ${a.nombre}: ${a.stock} un. (~${a.dias}d)`
    }
  } else {
    msg += '\n\n✅ Stock PRINCIPAL sin alertas'
  }

  msg += '\n\n_FYPRO Inventario_'

  // Enviar por WhatsApp via CallMeBot
  const waUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(msg)}&apikey=${callmebotKey}`
  const waRes = await fetch(waUrl)

  return NextResponse.json({
    ok: true,
    whatsapp: waRes.ok ? 'enviado' : `error ${waRes.status}`,
    ventas: ventasSemana.length,
    ingresos,
    ganancia: Math.round(ganancia),
    alertas: alertas.length,
  })
}
