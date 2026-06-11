import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

function getInicioDia() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 5, 0, 0).toISOString()
}

// ✅ Definido FUERA del componente principal para evitar el bug del input
function ModalVenta({ titulo, data, setData, onGuardar, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">{titulo}</h2>
        <div className="space-y-3">
          <input
            placeholder="¿Qué se vendió? Ej: Pilsener x2, Doritos"
            value={data.descripcion}
            onChange={e => setData({...data, descripcion: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
          <input
            placeholder="Monto total $"
            type="number"
            step="0.01"
            value={data.monto_total}
            onChange={e => setData({...data, monto_total: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
          <div className="grid grid-cols-3 gap-2">
            {['efectivo', 'transferencia', 'mixto'].map(m => (
              <button key={m} onClick={() => setData({...data, metodo_pago: m})}
                className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                  data.metodo_pago === m
                    ? 'bg-yellow-500 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}>
                {m === 'efectivo' ? '💵 Efectivo' : m === 'transferencia' ? '📲 Transfer.' : '⚡ Mixto'}
              </button>
            ))}
          </div>
          {data.metodo_pago === 'mixto' && (
            <div className="grid grid-cols-2 gap-3">
              <input
                placeholder="Parte efectivo $"
                type="number"
                step="0.01"
                value={data.monto_efectivo}
                onChange={e => setData({...data, monto_efectivo: e.target.value})}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
              />
              <input
                placeholder="Parte transfer. $"
                type="number"
                step="0.01"
                value={data.monto_transferencia}
                onChange={e => setData({...data, monto_transferencia: e.target.value})}
                className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}
          <input
            placeholder="Notas (opcional)"
            value={data.notas || ''}
            onChange={e => setData({...data, notas: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onCerrar}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
            Cancelar
          </button>
          <button onClick={onGuardar}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

const formVacio = {
  descripcion: '', monto_total: '', metodo_pago: 'efectivo',
  monto_efectivo: '', monto_transferencia: '', notas: ''
}

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('hoy')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [formEditar, setFormEditar] = useState(formVacio)

  useEffect(() => { cargarVentas() }, [vista])

  async function cargarVentas() {
    setLoading(true)
    let query = supabase
      .from('ventas')
      .select('*')
      .eq('es_fiado', false)
      .order('fecha', { ascending: false })
    if (vista === 'hoy') query = query.gte('fecha', getInicioDia())
    const { data, error } = await query.limit(100)
    if (error) toast.error('Error al cargar ventas')
    setVentas(data || [])
    setLoading(false)
  }

  async function guardarVenta() {
    if (!form.descripcion || !form.monto_total) {
      toast.error('Descripción y monto son obligatorios'); return
    }
    if (form.metodo_pago === 'mixto') {
      const ef = Number.parseFloat(form.monto_efectivo) || 0
      const tr = Number.parseFloat(form.monto_transferencia) || 0
      if (Math.abs(ef + tr - Number.parseFloat(form.monto_total)) > 0.01) {
        toast.error('Efectivo + transferencia debe ser igual al total'); return
      }
    }
    const montoTotal = Number.parseFloat(form.monto_total)
    const montoEfectivo =
      form.metodo_pago === 'efectivo' ? montoTotal :
      form.metodo_pago === 'mixto' ? Number.parseFloat(form.monto_efectivo) || 0 : 0
    const montoTransferencia =
      form.metodo_pago === 'transferencia' ? montoTotal :
      form.metodo_pago === 'mixto' ? Number.parseFloat(form.monto_transferencia) || 0 : 0

    const { error } = await supabase.from('ventas').insert([{
      descripcion: form.descripcion,
      monto_total: montoTotal,
      metodo_pago: form.metodo_pago,
      monto_efectivo: montoEfectivo,
      monto_transferencia: montoTransferencia,
    }])
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Venta registrada ✓')
    setModalAbierto(false)
    setForm(formVacio)
    cargarVentas()
  }

  async function guardarEdicion() {
    if (!formEditar.descripcion || !formEditar.monto_total) {
      toast.error('Descripción y monto son obligatorios'); return
    }
    if (formEditar.metodo_pago === 'mixto') {
      const ef = Number.parseFloat(formEditar.monto_efectivo) || 0
      const tr = Number.parseFloat(formEditar.monto_transferencia) || 0
      if (Math.abs(ef + tr - Number.parseFloat(formEditar.monto_total)) > 0.01) {
        toast.error('Efectivo + transferencia debe ser igual al total'); return
      }
    }
    const montoTotal = Number.parseFloat(formEditar.monto_total)
    const montoEfectivo =
      formEditar.metodo_pago === 'efectivo' ? montoTotal :
      formEditar.metodo_pago === 'mixto' ? Number.parseFloat(formEditar.monto_efectivo) || 0 : 0
    const montoTransferencia =
      formEditar.metodo_pago === 'transferencia' ? montoTotal :
      formEditar.metodo_pago === 'mixto' ? Number.parseFloat(formEditar.monto_transferencia) || 0 : 0

    const { error } = await supabase.from('ventas').update({
      descripcion: formEditar.descripcion,
      monto_total: montoTotal,
      metodo_pago: formEditar.metodo_pago,
      monto_efectivo: montoEfectivo,
      monto_transferencia: montoTransferencia,
    }).eq('id', modalEditar.id)
    if (error) { toast.error('Error al editar'); return }
    toast.success('Venta actualizada ✓')
    setModalEditar(null)
    cargarVentas()
  }

  async function eliminarVenta() {
    const { error } = await supabase.from('ventas').delete().eq('id', modalEliminar.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Venta eliminada')
    setModalEliminar(null)
    cargarVentas()
  }

  function abrirEditar(v) {
    setFormEditar({
      descripcion: v.descripcion,
      monto_total: v.monto_total,
      metodo_pago: v.metodo_pago,
      monto_efectivo: v.monto_efectivo || '',
      monto_transferencia: v.monto_transferencia || '',
      notas: v.notas || ''
    })
    setModalEditar(v)
  }

  const ventasFiltradas = ventas.filter(v =>
    v.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalHoy         = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_total), 0)
  const efectivoHoy      = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_efectivo || 0), 0)
  const transferenciaHoy = ventas.reduce((s, v) => s + Number.parseFloat(v.monto_transferencia || 0), 0)

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ventas</h1>
          <p className="text-gray-400 text-sm mt-1">{ventasFiltradas.length} registros</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Registrar venta
        </button>
      </div>

      {/* Tarjetas solo en vista hoy */}
      {vista === 'hoy' && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-yellow-500">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total hoy</div>
            <div className="text-2xl font-bold text-yellow-400">${totalHoy.toFixed(2)}</div>
            <div className="text-xs text-gray-500 mt-1">{ventas.length} transacciones</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-green-500">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Efectivo</div>
            <div className="text-2xl font-bold text-green-400">${efectivoHoy.toFixed(2)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-blue-500">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Transferencia</div>
            <div className="text-2xl font-bold text-blue-400">${transferenciaHoy.toFixed(2)}</div>
          </div>
        </div>
      )}

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
          placeholder="Buscar venta..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando ventas...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha / Hora</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Método</th>
                <th className="text-right px-4 py-3">Efectivo</th>
                <th className="text-right px-4 py-3">Transferencia</th>
                <th className="text-right px-4 py-3">Total</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(v => (
                <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {vista === 'historial' && (
                      <div className="text-xs text-gray-500">
                        {new Date(v.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                      </div>
                    )}
                    {new Date(v.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-white">{v.descripcion}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      v.metodo_pago === 'efectivo'
                        ? 'bg-green-500/10 text-green-400'
                        : v.metodo_pago === 'transferencia'
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {v.metodo_pago === 'mixto' ? '⚡ Mixto'
                        : v.metodo_pago === 'efectivo' ? '💵 Efectivo'
                        : '📲 Transferencia'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-400">
                    {Number.parseFloat(v.monto_efectivo) > 0
                      ? `$${Number.parseFloat(v.monto_efectivo).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400">
                    {Number.parseFloat(v.monto_transferencia) > 0
                      ? `$${Number.parseFloat(v.monto_transferencia).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-white font-bold">
                    ${Number.parseFloat(v.monto_total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => abrirEditar(v)}
                        className="text-xs text-yellow-400 hover:bg-yellow-500/10 px-2 py-1 rounded transition-colors">
                        ✏️
                      </button>
                      <button onClick={() => setModalEliminar(v)}
                        className="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {ventasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-10">
                    {busqueda ? `No se encontró "${busqueda}"` : 'No hay ventas registradas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nueva venta */}
      {modalAbierto && (
        <ModalVenta
          titulo="Registrar venta"
          data={form}
          setData={setForm}
          onGuardar={guardarVenta}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {/* Modal editar venta */}
      {modalEditar && (
        <ModalVenta
          titulo="Editar venta"
          data={formEditar}
          setData={setFormEditar}
          onGuardar={guardarEdicion}
          onCerrar={() => setModalEditar(null)}
        />
      )}

      {/* Modal confirmar eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar venta?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminar.descripcion}</p>
            <p className="text-red-400 font-bold mb-5">
              ${Number.parseFloat(modalEliminar.monto_total).toFixed(2)}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminar(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button onClick={eliminarVenta}
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