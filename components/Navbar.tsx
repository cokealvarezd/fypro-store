'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { count } = useCart()
  const path = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <Image src="/logo.webp" alt="FYPRO" width={80} height={40} className="h-10 w-auto object-contain" priority />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className={path === '/' ? 'text-red-600' : 'hover:text-red-600 transition-colors'}>Inicio</Link>
          <Link href="/productos" className={path.startsWith('/productos') ? 'text-red-600' : 'hover:text-red-600 transition-colors'}>Productos</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/productos" className="md:hidden text-sm font-medium text-gray-600 hover:text-red-600">
            Productos
          </Link>
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
