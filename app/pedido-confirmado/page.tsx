import Link from 'next/link'

interface Props {
  searchParams: Promise<{ id?: string }>
}

export default async function PedidoConfirmadoPage({ searchParams }: Props) {
  const { id } = await searchParams

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Pedido recibido!</h1>
      <p className="text-gray-500 text-sm mb-6">
        Gracias por tu compra. Te contactaremos a la brevedad por email o WhatsApp para coordinar el pago y entrega.
      </p>

      {id && (
        <div className="bg-gray-50 rounded-xl px-4 py-3 mb-8 inline-block">
          <p className="text-xs text-gray-400 mb-0.5">N° de pedido</p>
          <p className="text-sm font-mono font-semibold text-gray-700">{id}</p>
        </div>
      )}

      <Link href="/productos"
        className="inline-block bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl hover:bg-teal-800 transition-colors">
        Seguir comprando
      </Link>
    </div>
  )
}
