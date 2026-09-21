import { NextResponse } from 'next/server'
import { getProductos } from '@/lib/firestore'

export const revalidate = 60

export async function GET() {
  const productos = await getProductos()
  const stock: Record<string, number> = {}
  for (const p of productos) {
    stock[p.id] = p.stock ?? 0
  }
  return NextResponse.json(stock)
}
