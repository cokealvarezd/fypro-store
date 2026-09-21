import { NextResponse } from 'next/server'
import { getStockTodos } from '@/lib/firestore'

export const revalidate = 60

export async function GET() {
  const stock = await getStockTodos()
  return NextResponse.json(stock)
}
