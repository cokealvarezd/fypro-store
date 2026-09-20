'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface Props {
  categorias: string[]
  marcas: string[]
}

export default function FilterBar({ categorias, marcas }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const setParam = useCallback((key: string, value: string | null) => {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('q') // reset search when filter changes
    if (key !== 'q') p.delete('q')
    router.push(`${pathname}?${p.toString()}`)
  }, [params, pathname, router])

  const active = (key: string, val: string) => params.get(key) === val

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Buscar producto…"
          defaultValue={params.get('q') ?? ''}
          onChange={e => {
            const p = new URLSearchParams(params.toString())
            if (e.target.value) p.set('q', e.target.value)
            else p.delete('q')
            router.replace(`${pathname}?${p.toString()}`)
          }}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd"/>
        </svg>
      </div>

      {/* Categorías */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoría</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParam('categoria', null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!params.get('categoria') ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todas
          </button>
          {categorias.map(c => (
            <button
              key={c}
              onClick={() => setParam('categoria', active('categoria', c) ? null : c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active('categoria', c) ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Marcas */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Marca</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setParam('marca', null)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!params.get('marca') ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todas
          </button>
          {marcas.map(m => (
            <button
              key={m}
              onClick={() => setParam('marca', active('marca', m) ? null : m)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${active('marca', m) ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
