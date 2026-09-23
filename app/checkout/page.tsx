'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'
import { formatPrecio } from '@/lib/utils'

const REGIONES = [
  'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo',
  'Valparaíso', 'Metropolitana de Santiago', "O'Higgins", 'Maule', 'Ñuble',
  'Biobío', 'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes',
]

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder:text-gray-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, total, vaciar, listo } = useCart()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [tipoEnvio, setTipoEnvio] = useState<'despacho' | 'retiro'>('despacho')
  const [direccion, setDireccion] = useState('')
  const [comuna, setComuna] = useState('')
  const [region, setRegion] = useState('')
  const [tienda, setTienda] = useState<'PRINCIPAL' | 'TINYSHOP'>('PRINCIPAL')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const pedidoEnviado = useRef(false)

  useEffect(() => {
    if (listo && items.length === 0 && !pedidoEnviado.current) router.replace('/productos')
  }, [items, router, listo])

  if (!listo) return null
  if (items.length === 0) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (tipoEnvio === 'despacho' && (!direccion.trim() || !comuna.trim() || !region)) {
      setError('Completa todos los campos de despacho.')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/mp/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({
            productoId: i.productoId,
            nombre: i.nombre,
            marca: i.marca,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
          contacto: { nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim() },
          despacho: tipoEnvio === 'retiro'
            ? { tipo: 'retiro', tienda, direccion: '', comuna: '', region: '' }
            : { tipo: 'despacho', direccion: direccion.trim(), comuna: comuna.trim(), region, tienda: '' },
          subtotal: total,
          total,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al crear preferencia de pago')

      pedidoEnviado.current = true
      vaciar()
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado')
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <nav className="text-sm text-gray-400 mb-8 flex items-center gap-2">
        <Link href="/carrito" className="hover:text-gray-600">Carrito</Link>
        <span>/</span>
        <span className="text-gray-600">Datos de contacto</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-800 mb-8">Finalizar pedido</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Formulario */}
          <div className="lg:col-span-2 space-y-8">

            {/* Contacto */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-800">Datos de contacto</h2>
              <div>
                <label className={labelCls}>Nombre completo</label>
                <input required value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre" className={inputCls} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Email</label>
                  <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="tu@email.com" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Teléfono</label>
                  <input required type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                    placeholder="+56 9 1234 5678" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Envío */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
              <h2 className="font-bold text-gray-800">Método de entrega</h2>

              {/* Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                {(['despacho', 'retiro'] as const).map(op => (
                  <button key={op} type="button" onClick={() => setTipoEnvio(op)}
                    className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                      tipoEnvio === op ? 'bg-teal-700 text-white' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    {op === 'despacho' ? 'Despacho a domicilio' : 'Retiro en tienda'}
                  </button>
                ))}
              </div>

              {tipoEnvio === 'despacho' ? (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Dirección</label>
                    <input required value={direccion} onChange={e => setDireccion(e.target.value)}
                      placeholder="Calle 123, Depto 4B" className={inputCls} />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Comuna</label>
                      <input required value={comuna} onChange={e => setComuna(e.target.value)}
                        placeholder="Las Condes" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Región</label>
                      <select required value={region} onChange={e => setRegion(e.target.value)} className={inputCls}>
                        <option value="">Selecciona región</option>
                        {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">El costo y tiempo de despacho se coordina por email o WhatsApp.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className={labelCls}>Tienda de retiro</label>
                  {[
                    { id: 'PRINCIPAL', label: 'Tienda Principal' },
                    { id: 'TINYSHOP', label: 'TinyShop' },
                  ].map(op => (
                    <label key={op.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      tienda === op.id ? 'border-teal-600 bg-teal-50' : 'border-gray-100 hover:border-gray-200'
                    }`}>
                      <input type="radio" name="tienda" value={op.id} checked={tienda === op.id as 'PRINCIPAL' | 'TINYSHOP'}
                        onChange={() => setTienda(op.id as 'PRINCIPAL' | 'TINYSHOP')} className="accent-teal-700" />
                      <span className="text-sm font-medium text-gray-800">{op.label}</span>
                    </label>
                  ))}
                  <p className="text-xs text-gray-400">Coordinaremos el horario de retiro por email o WhatsApp.</p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
            )}
          </div>

          {/* Resumen pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24 space-y-4">
              <h2 className="font-bold text-gray-800">Tu pedido</h2>

              <div className="space-y-3">
                {items.map(item => (
                  <div key={item.productoId} className="flex gap-3 items-center">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-50 shrink-0">
                      {item.foto
                        ? <Image src={item.foto} alt={item.nombre} fill className="object-cover" sizes="48px" />
                        : <div className="w-full h-full bg-gray-100" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 truncate">{item.marca} {item.nombre}</p>
                      <p className="text-xs text-gray-400">x{item.cantidad}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 shrink-0">
                      {formatPrecio(item.precioUnitario * item.cantidad)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatPrecio(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Despacho</span>
                  <span className="text-gray-400">A coordinar</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between font-bold text-gray-900">
                <span>Total</span>
                <span>{formatPrecio(total)}</span>
              </div>

              <button type="submit" disabled={enviando}
                className="w-full py-3.5 rounded-xl font-semibold text-base bg-teal-700 text-white hover:bg-teal-800 transition-colors active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed">
                {enviando ? 'Redirigiendo a Mercado Pago…' : 'Pagar con Mercado Pago'}
              </button>

              <Link href="/carrito" className="block text-center text-sm text-gray-400 hover:text-gray-600 transition-colors">
                ← Volver al carrito
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
