import Link from 'next/link'
import { getProductos } from '@/lib/firestore'
import ProductCard from '@/components/ProductCard'

export default async function Home() {
  const productos = await getProductos()
  const destacados = productos.slice(0, 8)

  const categorias = [
    { nombre: 'Geles y energía', emoji: '⚡' },
    { nombre: 'Proteína', emoji: '💪' },
    { nombre: 'Electrolitos', emoji: '💧' },
    { nombre: 'Suplementos', emoji: '🌿' },
  ]

  return (
    <>
      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-8 h-0.5 bg-red-600 rounded-full" />
            <p className="text-red-600 font-semibold text-xs uppercase tracking-widest">Nutrición deportiva · Pucón, Chile</p>
            <div className="w-8 h-0.5 bg-red-600 rounded-full" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6 text-gray-900">
            Rinde al máximo.<br className="hidden md:block" />
            Nutre como un pro.
          </h1>
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-10">
            Geles, proteínas, electrolitos y suplementos seleccionados para atletas que van en serio.
          </p>
          <Link
            href="/productos"
            className="inline-flex items-center gap-2 bg-gray-900 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Ver todos los productos <span>→</span>
          </Link>
        </div>
      </section>

      {/* Categorías */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Explorar por categoría</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categorias.map(cat => (
            <Link
              key={cat.nombre}
              href={`/productos?categoria=${encodeURIComponent(cat.nombre)}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-300 transition-all p-5 flex flex-col items-center gap-2 text-center group"
            >
              <span className="text-3xl">{cat.emoji}</span>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600 transition-colors">{cat.nombre}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Productos destacados */}
      {destacados.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Productos</h2>
            <Link href="/productos" className="text-sm font-semibold text-red-600 hover:text-red-700">
              Ver todos →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {destacados.map(p => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}
    </>
  )
}
