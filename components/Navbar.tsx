'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { usePathname } from 'next/navigation'

function MarcasMenu({ marcas, activo, alineado }: { marcas: string[]; activo: boolean; alineado: 'left' | 'right' }) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    const cerrarFuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    const cerrarEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('mousedown', cerrarFuera)
    document.addEventListener('keydown', cerrarEsc)
    return () => {
      document.removeEventListener('mousedown', cerrarFuera)
      document.removeEventListener('keydown', cerrarEsc)
    }
  }, [abierto])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => { if (window.matchMedia('(hover: hover)').matches) setAbierto(true) }}
      onMouseLeave={() => { if (window.matchMedia('(hover: hover)').matches) setAbierto(false) }}
    >
      <button
        type="button"
        onClick={() => setAbierto(o => (window.matchMedia('(hover: hover)').matches ? true : !o))}
        aria-expanded={abierto}
        aria-haspopup="true"
        className={`flex items-center gap-1 text-sm font-medium transition-colors ${activo ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
      >
        Marcas
        <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className={`transition-transform ${abierto ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {abierto && (
        <div className={`absolute top-full pt-2 z-50 ${alineado === 'right' ? 'right-0' : 'left-0'}`}>
          <ul className="min-w-48 bg-white rounded-xl border border-gray-100 shadow-lg py-2 text-sm">
            {marcas.map(m => (
              <li key={m}>
                <Link
                  href={`/productos?marca=${encodeURIComponent(m)}`}
                  onClick={() => setAbierto(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50 hover:text-red-600"
                >
                  {m}
                </Link>
              </li>
            ))}
            <li className="border-t border-gray-100 mt-1 pt-1">
              <Link
                href="/productos"
                onClick={() => setAbierto(false)}
                className="block px-4 py-2 font-semibold text-gray-900 hover:bg-gray-50 hover:text-red-600"
              >
                Ver todos los productos
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Navbar({ marcas }: { marcas: string[] }) {
  const { count } = useCart()
  const path = usePathname()
  const enProductos = path.startsWith('/productos')

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <div className="h-[54px] w-[54px] overflow-hidden flex items-center justify-center">
            <Image src="/logo.webp" alt="FYPRO" width={72} height={72} className="h-[72px] w-[72px]" priority />
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className={path === '/' ? 'text-red-600' : 'hover:text-red-600 transition-colors'}>Inicio</Link>
          <MarcasMenu marcas={marcas} activo={enProductos} alineado="left" />
        </nav>

        <div className="flex items-center gap-3">
          <div className="md:hidden">
            <MarcasMenu marcas={marcas} activo={enProductos} alineado="right" />
          </div>
          <Link href="/carrito" className="relative flex items-center gap-1.5 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Carrito
            {count > 0 && (
              <span className="bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
