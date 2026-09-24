import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="FYPRO" width={56} height={28} className="h-7 w-auto object-contain bg-white rounded px-1" />
          <span>Nutrición deportiva · Pucón, Chile</span>
        </div>
        <div className="flex gap-6">
          <a href="mailto:contacto@fypro.cl" className="hover:text-white transition-colors">contacto@fypro.cl</a>
        </div>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} FYPRO. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
