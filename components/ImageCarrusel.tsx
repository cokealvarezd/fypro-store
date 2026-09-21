'use client'

import { useState } from 'react'
import Image from 'next/image'

interface Props {
  fotos: string[]
  nombre: string
}

export default function ImageCarrusel({ fotos, nombre }: Props) {
  const [activa, setActiva] = useState(0)

  if (fotos.length === 0) {
    return (
      <div className="relative bg-gray-50 rounded-3xl overflow-hidden aspect-square flex items-center justify-center">
        <svg className="w-24 h-24 text-gray-200" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Imagen principal */}
      <div className="relative bg-gray-50 rounded-3xl overflow-hidden aspect-square">
        <Image
          key={fotos[activa]}
          src={fotos[activa]}
          alt={`${nombre} — imagen ${activa + 1}`}
          fill
          sizes="(max-width:768px) 100vw, 50vw"
          className="object-cover"
          priority={activa === 0}
        />
        {/* Navegación flechas */}
        {fotos.length > 1 && (
          <>
            <button
              onClick={() => setActiva(i => (i - 1 + fotos.length) % fotos.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow text-gray-700 hover:bg-white transition-colors"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
            <button
              onClick={() => setActiva(i => (i + 1) % fotos.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow text-gray-700 hover:bg-white transition-colors"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {fotos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {fotos.map((src, i) => (
            <button
              key={src}
              onClick={() => setActiva(i)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-colors ${
                i === activa ? 'border-teal-600' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <Image src={src} alt={`miniatura ${i + 1}`} fill className="object-cover" sizes="64px" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
