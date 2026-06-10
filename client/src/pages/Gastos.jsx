import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [form, setForm] = useState({
    descripcion: '', categoria: 'compra_productos', monto: '', notas: ''
  })

  useEffect(() => { cargarGastos() }, [])

  async function cargarGastos() {
    setLoading(true)
    const hoy = new Date()
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .gte('fecha', inicioDia)
      .order('fecha', { ascending: false })
    if (error) toast.error('Error al cargar gastos')
    setGastos(data || [])
    setLoading(false)
  }

  async function guardarGasto() {
    if (!form.descripcion || !form.monto) {
      toast.error('Descripción y monto son obligatorios'); return
    }
    const { error } = await supabase.from('gastos').insert([{
      descripcion: form.descripcion,
      categoria: form.categoria,
      monto: Number.parseFloat(form.monto),
      notas: form.notas || null
    }])
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Gasto registrado ✓')
    setModalAbierto(false)
    setForm({ descripcion: '', categoria: 'compra_productos', monto: '', notas: '' })
    cargarGastos()
  }

  async function eliminarGasto() {
    const { error } = await supabase.from('gastos').delete().eq('id', modalEliminar.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Gasto eliminado')
    setModalEliminar(null)
    cargarGastos()
  }

  const totalHoy = gastos.reduce((s, g) => s + Number.parseFloat(g.monto), 0)

  const categoriaInfo = {
    compra_productos: { label: 'Compra productos', emoji: '🛒', color: 'text-yellow-400 bg-yellow-500/10' },
    servicios:        { label: 'Servicios',         emoji: '💡', color: 'text-blue-400 bg-blue-500/10' },
    transporte:       { label: 'Transporte',        emoji: '🚗', color: 'text-green-400 bg-green-500/10' },
    mantenimiento:    { label: 'Mantenimiento',     emoji: '🔧', color: 'text-orange-400 bg-orange-500/10' },
    otro:             { label: 'Otro',              emoji: '📦', color: 'text-gray-400 bg-gray-500/10' },
  }

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-gray-400 text-sm mt-1">{gastos.length} gastos hoy</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Registrar gasto
        </button>
      </div>

      {/* Tarjeta */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 border-t-2 border-t-red-500">
          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total gastos hoy</div>
          <div className="text-2xl font-bold text-red-400">${totalHoy.toFixed(2)}</div>
          <div className="text-xs text-gray-500 mt-1">{gastos.length} registros</div>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando gastos...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Hora</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gastos.map(g => {
                const cat = categoriaInfo[g.categoria] || categoriaInfo.otro
                return (
                  <tr key={g.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(g.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-white">
                      {g.descripcion}
                      {g.notas && <div className="text-xs text-gray-500 mt-0.5">{g.notas}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${cat.color}`}>
                        {cat.emoji} {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-red-400 font-bold">
                      -${Number.parseFloat(g.monto).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setModalEliminar(g)}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                        🗑
                      </button>
                    </td>
                  </tr>
                )
              })}
              {gastos.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-500 py-10">No hay gastos registrados hoy</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo gasto */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-4">Registrar gasto</h2>
            <div className="space-y-3">
              <input placeholder="¿En qué se gastó?" value={form.descripcion}
                onChange={e => setForm({...form, descripcion: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <input placeholder="Monto $" type="number" step="0.01" value={form.monto}
                onChange={e => setForm({...form, monto: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
              <select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500">
                <option value="compra_productos">🛒 Compra de productos</option>
                <option value="servicios">💡 Servicios</option>
                <option value="transporte">🚗 Transporte</option>
                <option value="mantenimiento">🔧 Mantenimiento</option>
                <option value="otro">📦 Otro</option>
              </select>
              <input placeholder="Notas (opcional)" value={form.notas}
                onChange={e => setForm({...form, notas: e.target.value})}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModalAbierto(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={guardarGasto}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar gasto?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminar.descripcion}</p>
            <p className="text-red-400 font-bold mb-5">${Number.parseFloat(modalEliminar.monto).toFixed(2)}</p>
            <div className="flex gap-3">
              <button onClick={() => setModalEliminar(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={eliminarGasto}
                className="flex-1 bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded-lg text-sm">Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}