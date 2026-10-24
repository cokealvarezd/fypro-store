import { NextRequest, NextResponse } from 'next/server'
import { getCupon } from '@/lib/cupones'

export async function POST(req: NextRequest) {
  let body: { codigo?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const cupon = await getCupon(body.codigo)
  if (!cupon) return NextResponse.json({ error: 'Código de descuento no válido' }, { status: 404 })

  return NextResponse.json(cupon)
}
