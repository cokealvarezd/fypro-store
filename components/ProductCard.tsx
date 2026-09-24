import Link from 'next/link'
import Image from 'next/image'
import type { Producto } from '@/lib/types'
import { formatPrecio } from '@/lib/utils'

export default function ProductCard({ p }: { p: Producto }) {
  const precio = p.precioVentaIVA ?? p.precioVenta
  const imagenPrincipal = p.fotos?.[0] ?? p.foto

  return (
    <Link
      href={`/productos/${p.id}`}
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
    >
      <div className="relative bg-gray-50 aspect-square overflow-hidden">
        {imagenPrincipal ? (
          <Image
            src={imagenPrincipal}
            alt={`${p.marca} ${p.nombre}`}
            fill
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (

          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-red-600 uppercase tracking-wide">{p.marca}</p>
        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2 flex-1">{p.nombre}</h3>
        <p className="text-base font-bold text-gray-900 mt-2">
          {precio ? formatPrecio(precio) : 'Consultar precio'}
        </p>
      </div>
    </Link>
  )
}
