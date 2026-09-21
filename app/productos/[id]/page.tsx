import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProducto, getProductos } from '@/lib/firestore'
import { formatPrecio } from '@/lib/utils'
import AgregarAlCarrito from '@/components/AgregarAlCarrito'
import ImageCarrusel from '@/components/ImageCarrusel'
import type { Metadata } from 'next'

export const revalidate = 60

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
  const fotos = p.fotos?.length ? p.fotos : p.foto ? [p.foto] : []

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
        {/* Carrusel de imágenes */}
        <ImageCarrusel fotos={fotos} nombre={`${p.marca} ${p.nombre}`} />

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
