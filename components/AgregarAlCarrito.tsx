'use client'

import { useState } from 'react'
import { useCart } from '@/context/CartContext'
import type { Producto } from '@/lib/types'
import { formatPrecio } from '@/lib/utils'

interface Props {
  producto: Producto
  stockDisponible?: number
}

export default function AgregarAlCarrito({ producto, stockDisponible }: Props) {
  const [inputStr, setInputStr] = useState('1')
  const [agregado, setAgregado] = useState(false)
  const { agregar, items } = useCart()
  const precio = producto.precioVentaIVA ?? producto.precioVenta ?? 0

  const enCarrito = items.find(i => i.productoId === producto.id)?.cantidad ?? 0
  const maxPedible = stockDisponible !== undefined ? Math.max(0, stockDisponible - enCarrito) : Infinity
  const sinStock = maxPedible === 0

  const cantidad = Math.max(1, Math.min(parseInt(inputStr) || 1, maxPedible === Infinity ? Infinity : maxPedible))

  const setDesdeBoton = (next: number) => setInputStr(String(next))

  const handleBlur = () => {
    const v = parseInt(inputStr)
    if (isNaN(v) || v < 1) { setInputStr('1'); return }
    if (maxPedible !== Infinity && v > maxPedible) { setInputStr(String(maxPedible)); return }
    setInputStr(String(v))
  }

  const handleAgregar = () => {
    if (sinStock || cantidad < 1) return
    agregar({
      productoId: producto.id,
      nombre: producto.nombre,
      marca: producto.marca,
      precioUnitario: precio,
      foto: producto.foto,
      cantidad,
    })
    setInputStr('1')
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Cantidad:</label>
        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setDesdeBoton(Math.max(1, cantidad - 1))}
            disabled={sinStock}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors font-bold disabled:opacity-30"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={maxPedible === Infinity ? undefined : maxPedible}
            value={sinStock ? '0' : inputStr}
            disabled={sinStock}
            onChange={e => setInputStr(e.target.value)}
            onBlur={handleBlur}
            className="w-14 text-center font-semibold text-gray-800 border-x border-gray-200 h-10 focus:outline-none focus:bg-gray-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-30"
          />
          <button
            onClick={() => setDesdeBoton(Math.min(maxPedible, cantidad + 1))}
            disabled={sinStock || cantidad >= maxPedible}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors font-bold disabled:opacity-30"
          >
            +
          </button>
        </div>
        {stockDisponible !== undefined && !sinStock && (
          <span className="text-xs text-gray-400">{stockDisponible} disponibles</span>
        )}
      </div>

      {!sinStock && (
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-gray-900">{formatPrecio(precio * cantidad)}</span>
          {cantidad > 1 && <span className="text-sm text-gray-500">{formatPrecio(precio)} c/u</span>}
        </div>
      )}

      {sinStock ? (
        <div className="w-full py-3.5 rounded-xl font-semibold text-base text-center bg-gray-100 text-gray-400 cursor-not-allowed">
          Sin stock disponible
        </div>
      ) : (
        <button
          onClick={handleAgregar}
          className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all ${
            agregado
              ? 'bg-green-600 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-95'
          }`}
        >
          {agregado ? '✓ Agregado al carrito' : 'Agregar al carrito'}
        </button>
      )}

      {enCarrito > 0 && !sinStock && (
        <p className="text-xs text-gray-400">Ya tienes {enCarrito} en el carrito.</p>
      )}
    </div>
  )
}
