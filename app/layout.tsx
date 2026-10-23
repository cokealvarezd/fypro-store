import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { CartProvider } from '@/context/CartContext'
import { getProductos } from '@/lib/firestore'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: { default: 'FYPRO — Nutrición Deportiva', template: '%s · FYPRO' },
  description: 'Nutrición deportiva de alto rendimiento. Geles, proteínas, electrolitos y suplementos para atletas.',
  icons: { icon: '/logo.webp', apple: '/logo.webp' },
  openGraph: {
    siteName: 'FYPRO',
    locale: 'es_CL',
    type: 'website',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const productos = await getProductos()
  const marcas = [...new Set(productos.map(p => p.marca).filter(Boolean))].sort() as string[]

  return (
    <html lang="es">
      <body className={`${geist.variable} font-sans bg-gray-50 min-h-screen flex flex-col`}>
        <CartProvider>
          <Navbar marcas={marcas} />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  )
}
