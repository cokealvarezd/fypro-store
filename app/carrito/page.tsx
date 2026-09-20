'use client'

import { useCart } from '@/context/CartContext'
import { formatPrecio } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export default function CarritoPage() {
  const { items, total, actualizar, quitar } = useCart()

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-500 text-sm mb-8">Agrega productos para empezar tu pedido.</p>
        <Link href="/productos" className="inline-block bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition-colors">
          Ver productos
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Tu carrito</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {items.map(item => (
            <div key={item.productoId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-4 items-center">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-50 shrink-0">
                {item.foto ? (
                  <Image src={item.foto} alt={item.nombre} fill className="object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full bg-gray-100" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-teal-600">{item.marca}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{item.nombre}</p>
                <p className="text-sm text-gray-500">{formatPrecio(item.precioUnitario)} c/u</p>
              </div>

              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
                <button onClick={() => actualizar(item.productoId, item.cantidad - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 font-bold text-sm">−</button>
                <span className="w-8 text-center text-sm font-semibold">{item.cantidad}</span>
                <button onClick={() => actualizar(item.productoId, item.cantidad + 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-50 font-bold text-sm">+</button>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-gray-900 text-sm">{formatPrecio(item.precioUnitario * item.cantidad)}</p>
                <button onClick={() => quitar(item.productoId)}
                  className="text-xs text-red-400 hover:text-red-600 mt-1 transition-colors">Quitar</button>
              </div>
            </div>
          ))}
        </div>

        {/* Resumen */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-gray-800 mb-4">Resumen</h2>
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatPrecio(total)}</span>
              </div>
              <div className="flex justify-between">
                <span>Envío</span>
                <span className="text-gray-400">A coordinar</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-gray-900 mb-6">
              <span>Total</span>
              <span>{formatPrecio(total)}</span>
            </div>
            <Link
              href="/checkout"
              className="block text-center bg-teal-700 text-white font-semibold py-3.5 rounded-xl hover:bg-teal-800 transition-colors"
            >
              Continuar al pago
            </Link>
            <Link href="/productos" className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3 transition-colors">
              ← Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
