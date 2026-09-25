import { NextResponse } from 'next/server'
import { getStockMap } from '@/lib/firestore'

export const revalidate = 60

export async function GET() {
  const stock = await getStockMap()
  return NextResponse.json(stock)
}
