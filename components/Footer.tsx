export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
        <div>
          <span className="text-white font-bold text-base">FYPRO</span>
          <span className="ml-2">Nutrición deportiva · Pucón, Chile</span>
        </div>
        <div className="flex gap-6">
          <a href="mailto:contacto@fypro.cl" className="hover:text-white transition-colors">contacto@fypro.cl</a>
        </div>
        <p className="text-xs text-gray-600">© {new Date().getFullYear()} FYPRO. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}
