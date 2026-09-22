import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function getInicioDia() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 5, 0, 0).toISOString()
}

const productoVacio = { descripcion: '', cantidad: 1, precio: '' }
const formVacio = {
  empresa: '', ruc: '', numero_factura: '',
  total: '', notas: '', productos: [{ ...productoVacio }]
}

export default function Compras() {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('hoy')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [modalDetalle, setModalDetalle] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [calcularAutoTotal, setCalcularAutoTotal] = useState(true)

  useEffect(() => { cargarCompras() }, [vista])

  async function cargarCompras() {
    setLoading(true)
    let query = supabase
      .from('compras')
      .select('*, detalle_compras(*)')
      .order('fecha', { ascending: false })
    if (vista === 'hoy') query = query.gte('fecha', getInicioDia())
    const { data, error } = await query.limit(100)
    if (error) toast.error('Error al cargar compras')
    setCompras(data || [])
    setLoading(false)
  }

  function actualizarProducto(index, campo, valor) {
    const nuevos = [...form.productos]
    nuevos[index] = { ...nuevos[index], [campo]: valor }

    // Calcular total automático si está activado
    if (calcularAutoTotal) {
      const total = nuevos.reduce((s, p) => {
        const cant = Number.parseFloat(p.cantidad) || 0
        const precio = Number.parseFloat(p.precio) || 0
        return s + (cant * precio)
      }, 0)
      setForm({ ...form, productos: nuevos, total: total.toFixed(2) })
    } else {
      setForm({ ...form, productos: nuevos })
    }
  }

  function agregarProducto() {
    setForm({ ...form, productos: [...form.productos, { ...productoVacio }] })
  }

  function eliminarProducto(index) {
    if (form.productos.length === 1) return
    const nuevos = form.productos.filter((_, i) => i !== index)
    setForm({ ...form, productos: nuevos })
  }

  async function guardarCompra() {
    if (!form.empresa || !form.total) {
      toast.error('Empresa y total son obligatorios'); return
    }

    const { data: compraData, error: errorCompra } = await supabase
      .from('compras')
      .insert([{
        empresa: form.empresa,
        ruc: form.ruc || null,
        numero_factura: form.numero_factura || null,
        total: Number.parseFloat(form.total),
        notas: form.notas || null
      }])
      .select()
      .single()

    if (errorCompra) { toast.error('Error al guardar compra'); return }

    // Guardar productos si tienen datos
    const productosValidos = form.productos.filter(p => p.descripcion && p.precio)
    if (productosValidos.length > 0) {
      const detalles = productosValidos.map(p => ({
        compra_id: compraData.id,
        descripcion: p.descripcion,
        cantidad: Number.parseInt(p.cantidad) || 1,
        precio: Number.parseFloat(p.precio),
        subtotal: (Number.parseInt(p.cantidad) || 1) * Number.parseFloat(p.precio)
      }))
      const { error: errorDetalle } = await supabase.from('detalle_compras').insert(detalles)
      if (errorDetalle) toast.error('Error al guardar productos')
    }

    toast.success('Compra registrada ✓')
    setModalAbierto(false)
    setForm(formVacio)
    setCalcularAutoTotal(true)
    cargarCompras()
  }

  async function eliminarCompra() {
    const { error } = await supabase.from('compras').delete().eq('id', modalEliminar.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Compra eliminada')
    setModalEliminar(null)
    cargarCompras()
  }

  const comprasFiltradas = compras.filter(c =>
    c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.numero_factura && c.numero_factura.includes(busqueda))
  )

  const totalMostrado = comprasFiltradas.reduce((s, c) => s + Number.parseFloat(c.total), 0)

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Compras</h1>
          <p className="text-gray-400 text-sm mt-1">{comprasFiltradas.length} facturas</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Nueva compra
        </button>
      </div>

      {/* Tarjeta total */}
      <div className="bg-gray-900 border border-gray-800 border-t-2 border-t-orange-500 rounded-xl p-4 mb-6 w-64">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
          {vista === 'hoy' ? 'Total compras hoy' : 'Total mostrado'}
        </div>
        <div className="text-2xl font-bold text-orange-400">${totalMostrado.toFixed(2)}</div>
        <div className="text-xs text-gray-500 mt-1">{comprasFiltradas.length} facturas</div>
      </div>

      {/* Tabs + Buscador */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          <button onClick={() => setVista('hoy')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vista === 'hoy' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}>Hoy</button>
          <button onClick={() => setVista('historial')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vista === 'historial' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}>Historial</button>
        </div>
        <input
          type="text"
          placeholder="Buscar empresa o factura..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando compras...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">N° Factura</th>
                <th className="text-left px-4 py-3">RUC</th>
                <th className="text-right px-4 py-3">Productos</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map(c => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {vista === 'historial' && (
                      <div className="text-xs text-gray-500">
                        {new Date(c.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                    {new Date(c.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{c.empresa}</div>
                    {c.notas && <div className="text-xs text-gray-500 mt-0.5">{c.notas}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.numero_factura || '—'}</td>
                  <td className="px-4 py-3 text-gray-400">{c.ruc || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {c.detalle_compras && c.detalle_compras.length > 0 ? (
                      <button
                        onClick={() => setModalDetalle(c)}
                        className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-3 py-1 rounded-full transition-colors">
                        Ver {c.detalle_compras.length} items
                      </button>
                    ) : (
                      <span className="text-gray-600 text-xs">Sin detalle</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-400 font-bold">
                    ${Number.parseFloat(c.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModalEliminar(c)}
                      className="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
              {comprasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    {busqueda ? `No se encontró "${busqueda}"` : 'No hay compras registradas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva compra */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-2xl p-6 max-h-screen overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">Registrar compra</h2>

            {/* Datos de la factura */}
            <div className="mb-4">
              <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3">Datos de la factura</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Empresa / Proveedor *"
                  value={form.empresa}
                  onChange={e => setForm({...form, empresa: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
                <input
                  placeholder="RUC (opcional)"
                  value={form.ruc}
                  onChange={e => setForm({...form, ruc: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
                <input
                  placeholder="N° de factura (opcional)"
                  value={form.numero_factura}
                  onChange={e => setForm({...form, numero_factura: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
                <input
                  placeholder="Notas (opcional)"
                  value={form.notas}
                  onChange={e => setForm({...form, notas: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                />
              </div>
            </div>

            {/* Productos */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs text-gray-400 uppercase tracking-wider">Productos (opcional)</h3>
                <button onClick={agregarProducto}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors">
                  + Agregar producto
                </button>
              </div>

              <div className="space-y-2">
                {form.productos.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      placeholder="Descripción del producto"
                      value={p.descripcion}
                      onChange={e => actualizarProducto(i, 'descripcion', e.target.value)}
                      className="col-span-5 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <input
                      placeholder="Cant."
                      type="number"
                      min="1"
                      value={p.cantidad}
                      onChange={e => actualizarProducto(i, 'cantidad', e.target.value)}
                      className="col-span-2 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <input
                      placeholder="Precio $"
                      type="number"
                      step="0.01"
                      value={p.precio}
                      onChange={e => actualizarProducto(i, 'precio', e.target.value)}
                      className="col-span-3 bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
                    />
                    <div className="col-span-1 text-right text-xs text-gray-400">
                      ${((Number.parseFloat(p.cantidad) || 0) * (Number.parseFloat(p.precio) || 0)).toFixed(2)}
                    </div>
                    <button
                      onClick={() => eliminarProducto(i)}
                      disabled={form.productos.length === 1}
                      className="col-span-1 text-red-400 hover:text-red-300 disabled:opacity-30 text-center">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t border-gray-700 pt-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Total de la factura *</label>
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={calcularAutoTotal}
                    onChange={e => setCalcularAutoTotal(e.target.checked)}
                    className="accent-yellow-500"
                  />
                  Calcular automáticamente
                </label>
              </div>
              <input
                placeholder="Total $"
                type="number"
                step="0.01"
                value={form.total}
                readOnly={calcularAutoTotal}
                onChange={e => setForm({...form, total: e.target.value})}
                className={`w-full border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500 ${
                  calcularAutoTotal
                    ? 'bg-gray-700 border-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 border-gray-700'
                }`}
              />
              {calcularAutoTotal && (
                <p className="text-xs text-gray-500 mt-1">
                  Se calcula automáticamente desde los productos. Desmarca para ingresar manualmente.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setModalAbierto(false); setForm(formVacio); setCalcularAutoTotal(true) }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={guardarCompra}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">
                Guardar compra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle de productos */}
      {modalDetalle && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">{modalDetalle.empresa}</h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {modalDetalle.numero_factura && `Factura ${modalDetalle.numero_factura} · `}
                  {new Date(modalDetalle.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setModalDetalle(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-12 text-xs text-gray-500 uppercase tracking-wider px-2 mb-1">
                <span className="col-span-6">Producto</span>
                <span className="col-span-2 text-center">Cant.</span>
                <span className="col-span-2 text-right">Precio</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>
              {modalDetalle.detalle_compras.map(d => (
                <div key={d.id} className="grid grid-cols-12 text-sm bg-gray-800 rounded-lg px-3 py-2">
                  <span className="col-span-6 text-white">{d.descripcion}</span>
                  <span className="col-span-2 text-center text-gray-400">{d.cantidad}</span>
                  <span className="col-span-2 text-right text-gray-400">${Number.parseFloat(d.precio).toFixed(2)}</span>
                  <span className="col-span-2 text-right text-yellow-400 font-medium">${Number.parseFloat(d.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-700 pt-3 flex justify-between items-center">
              <span className="text-gray-400 text-sm">Total factura</span>
              <span className="text-orange-400 font-bold text-lg">${Number.parseFloat(modalDetalle.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar compra?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminar.empresa}</p>
            <p className="text-orange-400 font-bold mb-5">${Number.parseFloat(modalEliminar.total).toFixed(2)}</p>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminar(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={eliminarCompra}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded-lg text-sm">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}