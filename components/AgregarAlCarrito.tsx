'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import type { Producto } from '@/lib/types'
import { formatPrecio } from '@/lib/utils'

export default function AgregarAlCarrito({ producto }: { producto: Producto }) {
  const [cantidad, setCantidad] = useState(1)
  const [agregado, setAgregado] = useState(false)
  const { agregar } = useCart()
  const precio = producto.precioVentaIVA ?? producto.precioVenta ?? 0

  const handleAgregar = () => {
    agregar({
      productoId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      precioUnitario: precio,
      foto: producto.foto,
      cantidad,
    })
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Cantidad:</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setCantidad(c => Math.max(1, c - 1))}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors font-bold"
          >
            −
          </button>
          <span className="w-10 text-center font-semibold text-gray-800">{cantidad}</span>
          <button
            onClick={() => setCantidad(c => c + 1)}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors font-bold"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-gray-900">{formatPrecio(precio * cantidad)}</span>
        {cantidad > 1 && <span className="text-sm text-gray-500">{formatPrecio(precio)} c/u</span>}
      </div>

      <button
        onClick={handleAgregar}
        className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
          agregado
            ? 'bg-green-600 text-white'
            : 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
        }`}
      >
        {agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
      </button>
    </div>
  )
}
