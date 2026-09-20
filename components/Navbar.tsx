'use client'

import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { count } = useCart()
  const path = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-teal-700 shrink-0">
          FYPRO
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className={path === '/' ? 'text-teal-700' : 'hover:text-teal-700 transition-colors'}>Inicio</Link>
          <Link href="/productos" className={path.startsWith('/productos') ? 'text-teal-700' : 'hover:text-teal-700 transition-colors'}>Productos</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/productos" className="md:hidden text-sm font-medium text-gray-600 hover:text-teal-700">
            Productos
          </Link>
          <Link href="/carrito" className="relative flex items-center gap-1.5 bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-teal-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            Carrito
            {count > 0 && (
              <span className="bg-white text-teal-700 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  )
}
