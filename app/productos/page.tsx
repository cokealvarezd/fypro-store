import { Suspense } from 'react'
import { getProductos } from '@/lib/firestore'
import ProductCard from '@/components/ProductCard'
import FilterBar from '@/components/FilterBar'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Productos' }

interface Props {
  searchParams: Promise<{ categoria?: string; marca?: string; q?: string }>
}

export default async function ProductosPage({ searchParams }: Props) {
  const sp = await searchParams
  const todos = await getProductos()

  const categorias = [...new Set(todos.map(p => p.categoria).filter(Boolean))].sort() as string[]
  const marcas = [...new Set(todos.map(p => p.marca).filter(Boolean))].sort() as string[]

  let filtrados = todos
  if (sp.categoria) filtrados = filtrados.filter(p => p.categoria === sp.categoria)
  if (sp.marca) filtrados = filtrados.filter(p => p.marca === sp.marca)
  if (sp.q) {
    const q = sp.q.toLowerCase()
    filtrados = filtrados.filter(p =>
      p.nombre.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q)
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-8">Todos los productos</h1>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filtros */}
        <aside className="lg:w-64 shrink-0">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <Suspense>
              <FilterBar categorias={categorias} marcas={marcas} />
            </Suspense>
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {filtrados.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">🔍</p>
              <p className="font-semibold text-gray-600">Sin resultados</p>
              <p className="text-sm mt-1">Prueba con otros filtros o términos de búsqueda.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">{filtrados.length} producto{filtrados.length !== 1 ? 's' : ''}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtrados.map(p => <ProductCard key={p.id} p={p} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
