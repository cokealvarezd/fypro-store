export interface Producto {
  id: string
  marca: string
  nombre: string
  categoria: string
  descripcion?: string | null
  foto?: string | null
  fotos?: string[] | null
  precioCosto?: number | null
  precioVenta?: number | null
  precioVentaIVA?: number | null
  activo: boolean
  publicado: boolean
}

export interface ItemCarrito {
  productoId: string
  nombre: string
  marca: string
  precioUnitario: number
  foto?: string | null
  cantidad: number
}

export interface Orden {
  id: string
  items: { productoId: string; cantidad: number; precioUnitario: number }[]
  contacto: { nombre: string; email: string; telefono: string }
  despacho: { direccion: string; comuna: string; region: string; tipo: 'despacho' | 'retiro' }
  subtotal: number
  total: number
  estado: 'pendiente' | 'pagada' | 'rechazada'
  mpPaymentId?: string
  creadoEn: number
}
