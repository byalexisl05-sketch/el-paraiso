import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import PropTypes from 'prop-types'

function getInicioDia() {
  const hoy = new Date()
  return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 5, 0, 0).toISOString()
}

const categoriaInfo = {
  compra_productos: { label: 'Compra productos', emoji: '🛒', color: 'text-yellow-400 bg-yellow-500/10' },
  servicios:        { label: 'Servicios',         emoji: '💡', color: 'text-blue-400 bg-blue-500/10' },
  transporte:       { label: 'Transporte',        emoji: '🚗', color: 'text-green-400 bg-green-500/10' },
  mantenimiento:    { label: 'Mantenimiento',     emoji: '🔧', color: 'text-orange-400 bg-orange-500/10' },
  otro:             { label: 'Otro',              emoji: '📦', color: 'text-gray-400 bg-gray-500/10' },
}

const formVacio = { descripcion: '', categoria: 'compra_productos', monto: '', notas: '' }

function ModalGasto({ titulo, data, setData, onGuardar, onCerrar }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-white mb-4">{titulo}</h2>
        <div className="space-y-3">
          <input
            placeholder="¿En qué se gastó?"
            value={data.descripcion}
            onChange={e => setData({...data, descripcion: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
          <input
            placeholder="Monto $"
            type="number"
            step="0.01"
            value={data.monto}
            onChange={e => setData({...data, monto: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
          <select
            value={data.categoria}
            onChange={e => setData({...data, categoria: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          >
            <option value="compra_productos">🛒 Compra de productos</option>
            <option value="servicios">💡 Servicios</option>
            <option value="transporte">🚗 Transporte</option>
            <option value="mantenimiento">🔧 Mantenimiento</option>
            <option value="otro">📦 Otro</option>
          </select>
          <input
            placeholder="Notas (opcional)"
            value={data.notas}
            onChange={e => setData({...data, notas: e.target.value})}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-500"
          />
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCerrar}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
            Cancelar
          </button>
          <button
            onClick={onGuardar}
            className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-2 rounded-lg text-sm">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

ModalGasto.propTypes = {
  titulo: PropTypes.string.isRequired,
  data: PropTypes.shape({
    descripcion: PropTypes.string,
    categoria: PropTypes.string,
    monto: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    notas: PropTypes.string,
  }).isRequired,
  setData: PropTypes.func.isRequired,
  onGuardar: PropTypes.func.isRequired,
  onCerrar: PropTypes.func.isRequired,
}

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState('hoy')
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(null)
  const [modalEditar, setModalEditar] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [formEditar, setFormEditar] = useState(formVacio)

  useEffect(() => { cargarGastos() }, [vista])

  async function cargarGastos() {
    setLoading(true)
    let query = supabase.from('gastos').select('*').order('fecha', { ascending: false })
    if (vista === 'hoy') query = query.gte('fecha', getInicioDia())
    const { data, error } = await query.limit(100)
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
    setForm(formVacio)
    cargarGastos()
  }

  async function guardarEdicion() {
    if (!formEditar.descripcion || !formEditar.monto) {
      toast.error('Descripción y monto son obligatorios'); return
    }
    const { error } = await supabase.from('gastos').update({
      descripcion: formEditar.descripcion,
      categoria: formEditar.categoria,
      monto: Number.parseFloat(formEditar.monto),
      notas: formEditar.notas || null
    }).eq('id', modalEditar.id)
    if (error) { toast.error('Error al editar'); return }
    toast.success('Gasto actualizado ✓')
    setModalEditar(null)
    cargarGastos()
  }

  async function eliminarGasto() {
    const { error } = await supabase.from('gastos').delete().eq('id', modalEliminar.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Gasto eliminado')
    setModalEliminar(null)
    cargarGastos()
  }

  function abrirEditar(g) {
    setFormEditar({
      descripcion: g.descripcion,
      categoria: g.categoria,
      monto: g.monto,
      notas: g.notas || ''
    })
    setModalEditar(g)
  }

  const gastosFiltrados = gastos.filter(g =>
    g.descripcion.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalMostrado = gastosFiltrados.reduce((s, g) => s + Number.parseFloat(g.monto), 0)

  return (
    <div className="p-6 min-h-screen bg-gray-950">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gastos</h1>
          <p className="text-gray-400 text-sm mt-1">{gastosFiltrados.length} registros</p>
        </div>
        <button
          onClick={() => setModalAbierto(true)}
          className="bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold px-4 py-2 rounded-lg text-sm transition-colors">
          + Registrar gasto
        </button>
      </div>

      {/* Tarjeta total */}
      <div className="bg-gray-900 border border-gray-800 border-t-2 border-t-red-500 rounded-xl p-4 mb-6 w-64">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
          {vista === 'hoy' ? 'Total hoy' : 'Total mostrado'}
        </div>
        <div className="text-2xl font-bold text-red-400">${totalMostrado.toFixed(2)}</div>
        <div className="text-xs text-gray-500 mt-1">{gastosFiltrados.length} registros</div>
      </div>

      {/* Tabs + Buscador */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
          <button
            onClick={() => setVista('hoy')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vista === 'hoy' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}>
            Hoy
          </button>
          <button
            onClick={() => setVista('historial')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              vista === 'historial' ? 'bg-yellow-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}>
            Historial
          </button>
        </div>
        <input
          type="text"
          placeholder="Buscar gasto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-gray-400 text-center py-20">Cargando gastos...</div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3">Fecha / Hora</th>
                <th className="text-left px-4 py-3">Descripción</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Monto</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gastosFiltrados.map(g => {
                const cat = categoriaInfo[g.categoria] || categoriaInfo.otro
                return (
                  <tr key={g.id} className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {vista === 'historial' && (
                        <div className="text-xs text-gray-500">
                          {new Date(g.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' })}
                        </div>
                      )}
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
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirEditar(g)}
                          className="text-xs text-yellow-400 hover:bg-yellow-500/10 px-2 py-1 rounded transition-colors">
                          ✏️
                        </button>
                        <button
                          onClick={() => setModalEliminar(g)}
                          className="text-xs text-red-400 hover:bg-red-500/10 px-2 py-1 rounded transition-colors">
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {gastosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-gray-500 py-10">
                    {busqueda ? `No se encontró "${busqueda}"` : 'No hay gastos registrados'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nuevo gasto */}
      {modalAbierto && (
        <ModalGasto
          titulo="Registrar gasto"
          data={form}
          setData={setForm}
          onGuardar={guardarGasto}
          onCerrar={() => setModalAbierto(false)}
        />
      )}

      {/* Modal editar gasto */}
      {modalEditar && (
        <ModalGasto
          titulo="Editar gasto"
          data={formEditar}
          setData={setFormEditar}
          onGuardar={guardarEdicion}
          onCerrar={() => setModalEditar(null)}
        />
      )}

      {/* Modal eliminar */}
      {modalEliminar && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h2 className="text-lg font-bold text-white mb-1">¿Eliminar gasto?</h2>
            <p className="text-gray-400 text-sm mb-1">{modalEliminar.descripcion}</p>
            <p className="text-red-400 font-bold mb-5">
              ${Number.parseFloat(modalEliminar.monto).toFixed(2)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setModalEliminar(null)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg text-sm">
                Cancelar
              </button>
              <button
                onClick={eliminarGasto}
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