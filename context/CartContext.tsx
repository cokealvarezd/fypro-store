'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ItemCarrito } from '@/lib/types'

interface CartCtx {
  items: ItemCarrito[]
  total: number
  count: number
  listo: boolean
  agregar: (item: ItemCarrito) => void
  actualizar: (productoId: string, cantidad: number) => void
  quitar: (productoId: string) => void
  vaciar: () => void
}

const CartContext = createContext<CartCtx | null>(null)

const KEY = 'fypro_cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [listo, setListo] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setListo(true)
  }, [])

  const persist = (next: ItemCarrito[]) => {
    setItems(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  const agregar = useCallback((item: ItemCarrito) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.productoId === item.productoId)
      const next = idx >= 0
        ? prev.map((i, j) => j === idx ? { ...i, cantidad: i.cantidad + item.cantidad } : i)
        : [...prev, item]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  const actualizar = useCallback((productoId: string, cantidad: number) => {
    persist(
      cantidad <= 0
        ? items.filter(i => i.productoId !== productoId)
        : items.map(i => i.productoId === productoId ? { ...i, cantidad } : i)
    )
  }, [items])

  const quitar = useCallback((productoId: string) => {
    persist(items.filter(i => i.productoId !== productoId))
  }, [items])

  const vaciar = useCallback(() => persist([]), [])

  const total = items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0)
  const count = items.reduce((s, i) => s + i.cantidad, 0)

  return (
    <CartContext.Provider value={{ items, total, count, listo, agregar, actualizar, quitar, vaciar }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart fuera de CartProvider')
  return ctx
}
