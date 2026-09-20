import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getProducto, getProductos } from '@/lib/firestore'
import { formatPrecio } from '@/lib/utils'
import AgregarAlCarrito from '@/components/AgregarAlCarrito'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateStaticParams() {
  const productos = await getProductos()
  return productos.map(p => ({ id: p.id }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const p = await getProducto(id)
  if (!p) return { title: 'Producto no encontrado' }
  return {
    title: `${p.marca} ${p.nombre}`,
    description: p.descripcion ?? `${p.nombre} de ${p.marca}. Nutrición deportiva FYPRO.`,
    openGraph: { images: p.foto ? [p.foto] : [] },
  }
}

export default async function ProductoPage({ params }: Props) {
  const { id } = await params
  const p = await getProducto(id)
  if (!p || !p.activo || !p.publicado) notFound()

  const precio = p.precioVentaIVA ?? p.precioVenta

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-8 flex items-center gap-2">
        <Link href="/" className="hover:text-gray-600">Inicio</Link>
        <span>/</span>
        <Link href="/productos" className="hover:text-gray-600">Productos</Link>
        <span>/</span>
        <span className="text-gray-600">{p.nombre}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* Imagen */}
        <div className="relative bg-gray-50 rounded-3xl overflow-hidden aspect-square">
          {p.foto ? (
            <Image
              src={p.foto}
              alt={`${p.marca} ${p.nombre}`}
              fill
              sizes="(max-width:768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-24 h-24 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-bold text-teal-600 uppercase tracking-wider mb-1">{p.marca}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{p.nombre}</h1>
          </div>

          {p.categoria && (
            <span className="inline-flex w-fit bg-teal-50 text-teal-700 text-xs font-semibold px-3 py-1 rounded-full">
              {p.categoria}
            </span>
          )}

          {p.descripcion && (
            <p className="text-gray-600 text-sm leading-relaxed">{p.descripcion}</p>
          )}

          <div className="border-t border-gray-100 pt-4">
            {precio ? (
              <div className="mb-1">
                <p className="text-3xl font-bold text-gray-900">{formatPrecio(precio)}</p>
                <p className="text-xs text-gray-400 mt-0.5">IVA incluido</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Precio no disponible</p>
            )}
          </div>

          {precio ? (
            <AgregarAlCarrito producto={p} />
          ) : (
            <p className="text-sm text-gray-500">Producto no disponible para compra online.</p>
          )}

          <p className="text-xs text-gray-400">
            Envío coordinado por WhatsApp/email luego de confirmar tu compra.
          </p>
        </div>
      </div>
    </div>
  )
}
